import { randomInt } from "node:crypto"
import { createRoute } from "@hono/zod-openapi"
import { FieldValue } from "firebase-admin/firestore"
import { HTTPException } from "hono/http-exception"
import {
  CreateShareRequestSchema,
  CreateShareResponseSchema,
  ErrorResponseSchema,
  OkResponseSchema,
  PublicShareInfoResponseSchema,
  RevokePublicResponseSchema,
  ShareListResponseSchema,
  SIGNED_URL_TTL_SECONDS,
  UnlockShareRequestSchema,
  UnlockShareResponseSchema,
  z,
} from "@workspace/schema"
import { assertOwnership, requireAuth, userCollection } from "../core/auth.js"
import {
  hashPin,
  incrementMonthlyDownloadBytes,
  verifyPin,
  writeAuditEvent,
} from "../core/audit.js"
import { getAdminDb } from "../core/firebase.js"
import { isTextInspectable, maskAndRedactText } from "../core/scanner.js"
import { toFileRecord, toShareRecord } from "../core/serializers.js"
import {
  createDownloadSignedUrl,
  getCleanPath,
  getRedactedPath,
  readCleanSample,
  writeRedactedToClean,
} from "../core/storage.js"
import type { ApiApp } from "./me.js"

const IdParamSchema = z.object({
  id: z.string().min(1).openapi({ param: { name: "id", in: "path" } }),
})

const ShareIdParamSchema = z.object({
  shareId: z
    .string()
    .min(1)
    .openapi({ param: { name: "shareId", in: "path" } }),
})

const listSharesRoute = createRoute({
  method: "get",
  path: "/v1/shares",
  tags: ["Sharing"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Active and recent share links created by the user",
      content: { "application/json": { schema: ShareListResponseSchema } },
    },
  },
})

const createShareRoute = createRoute({
  method: "post",
  path: "/v1/shares",
  tags: ["Sharing"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateShareRequestSchema } },
    },
  },
  responses: {
    201: {
      description: "Share link created",
      content: { "application/json": { schema: CreateShareResponseSchema } },
    },
    403: {
      description: "Original sharing blocked or ownership failure",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const revokeShareRoute = createRoute({
  method: "delete",
  path: "/v1/shares/{id}",
  tags: ["Sharing"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Share link revoked",
      content: { "application/json": { schema: OkResponseSchema } },
    },
  },
})

const revokePublicSharesRoute = createRoute({
  method: "post",
  path: "/v1/shares/revoke-public",
  tags: ["Sharing"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Revoked all active public links",
      content: { "application/json": { schema: RevokePublicResponseSchema } },
    },
  },
})

const getPublicShareRoute = createRoute({
  method: "get",
  path: "/v1/public/shares/{shareId}",
  tags: ["Public Sharing"],
  request: { params: ShareIdParamSchema },
  responses: {
    200: {
      description: "Public metadata for a share link",
      content: { "application/json": { schema: PublicShareInfoResponseSchema } },
    },
    404: {
      description: "Share link not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const unlockPublicShareRoute = createRoute({
  method: "post",
  path: "/v1/public/shares/{shareId}/unlock",
  tags: ["Public Sharing"],
  request: {
    params: ShareIdParamSchema,
    body: {
      required: false,
      content: { "application/json": { schema: UnlockShareRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Share unlocked and 60s signed download URL issued",
      content: { "application/json": { schema: UnlockShareResponseSchema } },
    },
    403: {
      description: "Invalid PIN or link revoked/expired/limit reached",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Share not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Owner monthly download cap reached",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

async function recomputeFileExposure(uid: string, fileId: string): Promise<void> {
  const db = getAdminDb()
  const sharesSnap = await db
    .collection("shares")
    .where("fileId", "==", fileId)
    .get()
  const nowMs = Date.now()
  const active = sharesSnap.docs
    .map((d) => toShareRecord(d.id, d.data()))
    .filter((s) => {
      if (s.ownerUid !== uid || s.revokedAt !== null) return false
      if (s.expiresAt && new Date(s.expiresAt).getTime() <= nowMs) return false
      if (s.maxDownloads !== null && s.downloads >= s.maxDownloads) return false
      return true
    })

  let exposure: "private" | "shared" | "link" | "public" = "private"
  if (
    active.some(
      (s) => s.audience === "anyone" && (s.expiresAt === null || !s.redacted)
    )
  ) {
    exposure = "public"
  } else if (active.some((s) => s.audience === "anyone")) {
    exposure = "link"
  } else if (active.length > 0) {
    exposure = "shared"
  }

  await userCollection(db, uid, "files")
    .doc(fileId)
    .set({ exposure, updatedAt: new Date().toISOString() }, { merge: true })
}

export function registerSharingRoutes(app: ApiApp): void {
  app.openapi(listSharesRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const snap = await db
      .collection("shares")
      .where("ownerUid", "==", uid)
      .get()

    const shares = snap.docs
      .map((doc) => toShareRecord(doc.id, doc.data()))
      .filter((s) => s.revokedAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return c.json({ shares }, 200)
  })

  app.openapi(createShareRoute, async (c) => {
    const uid = c.get("uid")
    const body = c.req.valid("json")
    const db = getAdminDb()

    const fileRef = userCollection(db, uid, "files").doc(body.fileId)
    const fileSnap = await fileRef.get()
    if (!fileSnap.exists || !fileSnap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }
    const file = toFileRecord(body.fileId, fileSnap.data()!)
    if (file.scanStatus !== "clean" || file.trashedAt !== null) {
      throw new HTTPException(400, {
        message: "Only active clean files can be shared.",
      })
    }
    if (!body.redacted && file.originalBlocked) {
      throw new HTTPException(403, {
        message:
          "Sharing the original file is blocked. Share a redacted copy instead.",
      })
    }

    if (body.redacted && !file.hasRedactedCopy) {
      const { sample, contentType } = await readCleanSample(uid, file.id)
      const payload = isTextInspectable(file.name, file.mime)
        ? maskAndRedactText(sample.toString("utf8")).redactedText
        : sample
      await writeRedactedToClean(uid, file.id, payload, contentType)
      await fileRef.set({ hasRedactedCopy: true }, { merge: true })
    }

    const pin = body.requirePin
      ? String(randomInt(1000, 10000))
      : null
    const now = new Date()
    const expiresAt =
      body.expiryDays !== null
        ? new Date(
            now.getTime() + body.expiryDays * 24 * 60 * 60 * 1000
          ).toISOString()
        : null

    const shareRef = db.collection("shares").doc()
    const shareDoc = {
      fileId: file.id,
      fileName: body.redacted ? `${file.name} (redacted)` : file.name,
      fileMime: file.mime,
      fileSize: file.size,
      ownerUid: uid,
      audience: body.audience,
      recipientEmail:
        body.audience === "specific_people"
          ? (body.recipientEmail ?? null)
          : null,
      expiresAt,
      maxDownloads: body.maxDownloads,
      downloads: 0,
      hasPin: Boolean(pin),
      pinHash: pin ? hashPin(pin) : null,
      redacted: body.redacted,
      revokedAt: null,
      createdAt: now.toISOString(),
    }

    await shareRef.set(shareDoc)
    await recomputeFileExposure(uid, file.id)
    await writeAuditEvent(db, uid, {
      action: "share.create",
      category: "sharing",
      title: `Created share link for ${file.name}`,
      detail: `${body.redacted ? "Redacted copy" : "Original"} · ${pin ? "PIN on" : "No PIN"}`,
      target: shareRef.id,
    })

    return c.json(
      {
        share: toShareRecord(shareRef.id, shareDoc),
        pin,
        sharePath: `/sharing/recipient?shareId=${shareRef.id}`,
      },
      201
    )
  })

  app.openapi(revokeShareRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const ref = db.collection("shares").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Share link not found." })
    }
    const shareData = snap.data()!
    assertOwnership(String(shareData.ownerUid ?? ""), uid)

    await ref.set({ revokedAt: new Date().toISOString() }, { merge: true })
    await recomputeFileExposure(uid, String(shareData.fileId ?? ""))
    await writeAuditEvent(db, uid, {
      action: "share.revoke",
      category: "sharing",
      title: `Revoked link for ${String(shareData.fileName ?? "file")}`,
      detail: "Access disabled immediately",
      target: id,
    })

    return c.json({ ok: true as const }, 200)
  })

  app.openapi(revokePublicSharesRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const snap = await db
      .collection("shares")
      .where("ownerUid", "==", uid)
      .get()
    const now = new Date().toISOString()

    const toRevoke = snap.docs.filter(
      (doc) =>
        doc.data().audience === "anyone" && doc.data().revokedAt === null
    )
    if (toRevoke.length > 0) {
      const batch = db.batch()
      const fileIds = new Set<string>()
      for (const doc of toRevoke) {
        batch.set(doc.ref, { revokedAt: now }, { merge: true })
        if (typeof doc.data().fileId === "string") {
          fileIds.add(doc.data().fileId)
        }
      }
      await batch.commit()
      for (const fileId of fileIds) {
        await recomputeFileExposure(uid, fileId)
      }
      await writeAuditEvent(db, uid, {
        action: "share.revoke_all_public",
        category: "sharing",
        title: `Revoked ${toRevoke.length} public link(s)`,
        detail: "All public URLs closed",
        target: uid,
      })
    }

    return c.json({ revokedCount: toRevoke.length }, 200)
  })

  app.openapi(getPublicShareRoute, async (c) => {
    const { shareId } = c.req.valid("param")
    const db = getAdminDb()
    const snap = await db.collection("shares").doc(shareId).get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Share link not found." })
    }
    const share = toShareRecord(snap.id, snap.data()!)
    const ownerSnap = await db.collection("users").doc(share.ownerUid).get()
    const ownerName =
      typeof ownerSnap.data()?.name === "string" && ownerSnap.data()!.name
        ? ownerSnap.data()!.name
        : "Glashus user"

    const revoked = share.revokedAt !== null
    const expired = Boolean(
      share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()
    )
    const limitReached = Boolean(
      share.maxDownloads !== null && share.downloads >= share.maxDownloads
    )
    const downloadsRemaining =
      share.maxDownloads !== null
        ? Math.max(0, share.maxDownloads - share.downloads)
        : null

    return c.json(
      {
        id: share.id,
        fileName: share.fileName,
        fileMime: share.fileMime,
        fileSize: share.fileSize,
        ownerName,
        redacted: share.redacted,
        hasPin: share.hasPin,
        expiresAt: share.expiresAt,
        downloadsRemaining,
        expired,
        revoked,
        limitReached,
      },
      200
    )
  })

  app.openapi(unlockPublicShareRoute, async (c) => {
    const { shareId } = c.req.valid("param")
    let pin = ""
    try {
      const body = c.req.valid("json")
      pin = body?.pin?.trim() ?? ""
    } catch {
      pin = ""
    }

    const db = getAdminDb()
    const shareRef = db.collection("shares").doc(shareId)
    const snap = await shareRef.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Share link not found." })
    }

    const raw = snap.data()!
    const share = toShareRecord(snap.id, raw)

    if (share.revokedAt !== null) {
      throw new HTTPException(403, { message: "This share link was revoked." })
    }
    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      throw new HTTPException(403, { message: "This share link has expired." })
    }
    if (share.maxDownloads !== null && share.downloads >= share.maxDownloads) {
      throw new HTTPException(403, {
        message: "Download limit reached for this share link.",
      })
    }
    if (share.hasPin) {
      const storedHash =
        typeof raw.pinHash === "string" ? raw.pinHash : ""
      if (!pin || !verifyPin(pin, storedHash)) {
        throw new HTTPException(403, { message: "Incorrect PIN." })
      }
    }

    await incrementMonthlyDownloadBytes(db, share.ownerUid, share.fileSize)
    await shareRef.set(
      { downloads: FieldValue.increment(1) },
      { merge: true }
    )

    const objectPath = share.redacted
      ? getRedactedPath(share.ownerUid, share.fileId)
      : getCleanPath(share.ownerUid, share.fileId)
    const downloadUrl = await createDownloadSignedUrl(
      objectPath,
      share.fileName,
      false
    )

    await writeAuditEvent(db, share.ownerUid, {
      action: "share.download",
      category: "sharing",
      title: `Shared file downloaded: ${share.fileName}`,
      detail: share.redacted ? "Redacted copy served" : "Original served",
      target: share.id,
      actor: "recipient",
    })

    const downloadsRemaining =
      share.maxDownloads !== null
        ? Math.max(0, share.maxDownloads - (share.downloads + 1))
        : null

    return c.json(
      {
        downloadUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        downloadsRemaining,
      },
      200
    )
  })
}
