import { createRoute, type OpenAPIHono } from "@hono/zod-openapi"
import {
  ErrorResponseSchema,
  ExportManifestResponseSchema,
  ExposureSummaryResponseSchema,
  FREE_MONTHLY_DOWNLOAD_CAP_BYTES,
  MeResponseSchema,
  UpdateMeRequestSchema,
  UserProfileSchema,
  type ExposureRisk,
} from "@workspace/schema"
import { requireAuth, userCollection, type AuthVariables } from "../core/auth.js"
import { writeAuditEvent } from "../core/audit.js"
import { getAdminDb } from "../core/firebase.js"
import {
  toFileRecord,
  toFolder,
  toShareRecord,
  toUserProfile,
} from "../core/serializers.js"

export type ApiApp = OpenAPIHono<{ Variables: AuthVariables }>

const getMeRoute = createRoute({
  method: "get",
  path: "/v1/me",
  tags: ["Account"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Current user profile and monthly usage summary",
      content: { "application/json": { schema: MeResponseSchema } },
    },
    401: {
      description: "Missing or invalid Firebase JWT",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const updateMeRoute = createRoute({
  method: "patch",
  path: "/v1/me",
  tags: ["Account"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateMeRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Updated user profile",
      content: { "application/json": { schema: UserProfileSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const getExposureRoute = createRoute({
  method: "get",
  path: "/v1/exposure",
  tags: ["Exposure"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Live exposure score and actionable exposure risks",
      content: { "application/json": { schema: ExposureSummaryResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const exportAllRoute = createRoute({
  method: "get",
  path: "/v1/export",
  tags: ["Account"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "JSON export manifest of all user Drive metadata",
      content: { "application/json": { schema: ExportManifestResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

export function registerMeRoutes(app: ApiApp): void {
  app.openapi(getMeRoute, async (c) => {
    const uid = c.get("uid")
    const email = c.get("email") ?? ""
    const name = c.get("name") ?? ""
    const db = getAdminDb()

    const now = new Date()
    const month = now.toISOString().slice(0, 7)
    const userRef = db.collection("users").doc(uid)
    const usageRef = db.collection("usage").doc(uid).collection("months").doc(month)

    const [userSnap, usageSnap] = await Promise.all([userRef.get(), usageRef.get()])
    let userData = userSnap.data()

    if (!userSnap.exists || !userData) {
      userData = {
        name,
        email,
        alertEmail: email,
        plan: "free",
        bytesUsed: 0,
        aiMode: "ask",
        massAlerts: true,
        canaryAlerts: true,
        weeklySummary: false,
        requirePinOnPublic: true,
        defaultExpiryDays: 7,
        vaultHint: "",
        createdAt: now.toISOString(),
      }
      await userRef.set(userData, { merge: true })
    }

    const usageData = usageSnap.data()

    return c.json(
      {
        user: toUserProfile(uid, userData, email, name),
        usage: {
          month,
          downloadBytes:
            typeof usageData?.downloadBytes === "number"
              ? usageData.downloadBytes
              : 0,
          downloadCapBytes: FREE_MONTHLY_DOWNLOAD_CAP_BYTES,
          aiReads:
            typeof usageData?.aiReads === "number" ? usageData.aiReads : 0,
        },
      },
      200
    )
  })

  app.openapi(updateMeRoute, async (c) => {
    const uid = c.get("uid")
    const email = c.get("email") ?? ""
    const fallbackName = c.get("name") ?? ""
    const body = c.req.valid("json")
    const db = getAdminDb()
    const userRef = db.collection("users").doc(uid)

    const updates: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) updates[key] = val
    }

    if (Object.keys(updates).length > 0) {
      await userRef.set(updates, { merge: true })
      await writeAuditEvent(db, uid, {
        action: "settings.update",
        category: "security",
        title: "Account settings updated",
        detail: Object.keys(updates).join(", "),
        target: uid,
      })
    }

    const updatedSnap = await userRef.get()
    return c.json(
      toUserProfile(uid, updatedSnap.data(), email, fallbackName),
      200
    )
  })

  app.openapi(getExposureRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()

    const [filesSnap, sharesSnap, canariesSnap] = await Promise.all([
      userCollection(db, uid, "files").get(),
      db.collection("shares").where("ownerUid", "==", uid).get(),
      db.collection("canaries").where("ownerUid", "==", uid).get(),
    ])

    const files = filesSnap.docs
      .map((doc) => toFileRecord(doc.id, doc.data()))
      .filter((f) => f.trashedAt === null)
    const fileMap = new Map(files.map((f) => [f.id, f]))

    const nowMs = Date.now()
    const activeShares = sharesSnap.docs
      .map((doc) => toShareRecord(doc.id, doc.data()))
      .filter((s) => {
        if (s.revokedAt !== null) return false
        if (s.expiresAt && new Date(s.expiresAt).getTime() <= nowMs) return false
        if (s.maxDownloads !== null && s.downloads >= s.maxDownloads) return false
        return fileMap.has(s.fileId)
      })

    const publicShares = activeShares.filter((s) => s.audience === "anyone")
    const neverExpireShares = activeShares.filter((s) => s.expiresAt === null)
    const sensitiveFindings = files.reduce((acc, f) => acc + f.findingCount, 0)
    const armedCanaries = canariesSnap.docs.filter(
      (doc) => doc.data().status === "armed"
    ).length

    const risks: ExposureRisk[] = []
    let penalty = 0

    for (const share of publicShares) {
      const file = fileMap.get(share.fileId)
      if (!file) continue
      if (file.findingCount > 0 && !share.redacted) {
        penalty += 18
        risks.push({
          id: `risk-pub-${share.id}`,
          kind: "public_link",
          fileId: file.id,
          shareId: share.id,
          title: `${file.name} is publicly shared unredacted`,
          detail: `${file.findingCount} sensitive finding(s) visible to anyone with the link.`,
          actionLabel: "Revoke link",
        })
      } else if (!share.hasPin) {
        penalty += 8
        risks.push({
          id: `risk-pub-nopin-${share.id}`,
          kind: "public_link",
          fileId: file.id,
          shareId: share.id,
          title: `${file.name} has a public link without a PIN`,
          detail: "Anyone with the link can open it directly.",
          actionLabel: "Revoke link",
        })
      }
    }

    for (const share of activeShares) {
      if (share.audience !== "specific_people") continue
      const file = fileMap.get(share.fileId)
      if (!file || file.findingCount === 0 || share.redacted) continue
      penalty += 12
      risks.push({
        id: `risk-shared-${share.id}`,
        kind: "sensitive_shared",
        fileId: file.id,
        shareId: share.id,
        title: `${file.name} shares ${file.findingCount} sensitive finding(s)`,
        detail: share.recipientEmail
          ? `Shared with ${share.recipientEmail}. Revoke or share a redacted copy.`
          : "Shared with specific people without redaction.",
        actionLabel: "Revoke access",
      })
    }

    if (neverExpireShares.length > 0) {
      penalty += Math.min(16, neverExpireShares.length * 4)
      const first = neverExpireShares[0]
      if (first) {
        risks.push({
          id: `risk-never-${first.id}`,
          kind: "never_expires",
          fileId: first.fileId,
          shareId: first.id,
          title: `${neverExpireShares.length} ${neverExpireShares.length === 1 ? "link never expires" : "links never expire"}`,
          detail: `${first.fileName} has no expiration date set.`,
          actionLabel: "Revoke link",
        })
      }
    }

    const score = Math.max(0, Math.min(100, 100 - penalty))

    return c.json(
      {
        score,
        publicLinks: publicShares.length,
        sensitiveFindings,
        armedCanaries,
        risks,
      },
      200
    )
  })

  app.openapi(exportAllRoute, async (c) => {
    const uid = c.get("uid")
    const email = c.get("email") ?? ""
    const name = c.get("name") ?? ""
    const db = getAdminDb()

    const [userSnap, foldersSnap, filesSnap, sharesSnap, auditSnap, aiSnap] =
      await Promise.all([
        db.collection("users").doc(uid).get(),
        userCollection(db, uid, "folders").get(),
        userCollection(db, uid, "files").get(),
        db.collection("shares").where("ownerUid", "==", uid).get(),
        db.collection("audit").doc(uid).collection("events").get(),
        db.collection("aiLog").doc(uid).collection("reads").get(),
      ])

    await writeAuditEvent(db, uid, {
      action: "account.export",
      category: "security",
      title: "Exported account metadata snapshot",
      detail: `${filesSnap.size} files, ${foldersSnap.size} folders`,
      target: uid,
    })

    return c.json(
      {
        exportedAt: new Date().toISOString(),
        user: toUserProfile(uid, userSnap.data(), email, name),
        folders: foldersSnap.docs.map((d) => toFolder(d.id, d.data())),
        files: filesSnap.docs.map((d) => toFileRecord(d.id, d.data())),
        shares: sharesSnap.docs.map((d) => toShareRecord(d.id, d.data())),
        auditCount: auditSnap.size,
        aiReadCount: aiSnap.size,
      },
      200
    )
  })
}
