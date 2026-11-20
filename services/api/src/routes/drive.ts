import { createRoute } from "@hono/zod-openapi"
import { FieldValue } from "firebase-admin/firestore"
import { HTTPException } from "hono/http-exception"
import {
  CompleteUploadResponseSchema,
  CreateFolderRequestSchema,
  DownloadUrlResponseSchema,
  EmptyTrashResponseSchema,
  ErrorResponseSchema,
  FileFindingsResponseSchema,
  FileListResponseSchema,
  FileRecordSchema,
  FindingSchema,
  FolderListResponseSchema,
  FolderSchema,
  FREE_STORAGE_QUOTA_BYTES,
  OkResponseSchema,
  RequestUploadUrlRequestSchema,
  RequestUploadUrlResponseSchema,
  SIGNED_URL_TTL_SECONDS,
  UpdateFileRequestSchema,
  UpdateFindingRequestSchema,
  UpdateFolderRequestSchema,
  z,
} from "@workspace/schema"
import { requireAuth, userCollection } from "../core/auth.js"
import {
  incrementMonthlyDownloadBytes,
  writeAuditEvent,
} from "../core/audit.js"
import { getAdminDb } from "../core/firebase.js"
import {
  isTextInspectable,
  maskAndRedactText,
  scanBuffer,
} from "../core/scanner.js"
import {
  toFileRecord,
  toFinding,
  toFolder,
} from "../core/serializers.js"
import {
  createDownloadSignedUrl,
  createUploadSignedUrl,
  deleteFileObjects,
  deleteQuarantineObject,
  getCleanPath,
  inspectQuarantineObject,
  promoteToClean,
  readCleanSample,
  writeRedactedToClean,
} from "../core/storage.js"
import type { ApiApp } from "./me.js"

const IdParamSchema = z.object({
  id: z.string().min(1).openapi({ param: { name: "id", in: "path" } }),
})

const FindingParamSchema = z.object({
  id: z.string().min(1).openapi({ param: { name: "id", in: "path" } }),
  findingId: z
    .string()
    .min(1)
    .openapi({ param: { name: "findingId", in: "path" } }),
})

const listFoldersRoute = createRoute({
  method: "get",
  path: "/v1/folders",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Folders owned by the authenticated user",
      content: { "application/json": { schema: FolderListResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const createFolderRoute = createRoute({
  method: "post",
  path: "/v1/folders",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateFolderRequestSchema } },
    },
  },
  responses: {
    201: {
      description: "Folder created",
      content: { "application/json": { schema: FolderSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const updateFolderRoute = createRoute({
  method: "patch",
  path: "/v1/folders/{id}",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateFolderRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Folder updated",
      content: { "application/json": { schema: FolderSchema } },
    },
    404: {
      description: "Folder not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const deleteFolderRoute = createRoute({
  method: "delete",
  path: "/v1/folders/{id}",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Folder deleted",
      content: { "application/json": { schema: OkResponseSchema } },
    },
    404: {
      description: "Folder not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const listFilesQuerySchema = z.object({
  folderId: z
    .string()
    .optional()
    .openapi({ param: { name: "folderId", in: "query" } }),
  trashed: z
    .enum(["true", "false"])
    .optional()
    .openapi({ param: { name: "trashed", in: "query" } }),
})

const listFilesRoute = createRoute({
  method: "get",
  path: "/v1/files",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { query: listFilesQuerySchema },
  responses: {
    200: {
      description: "Files owned by the authenticated user",
      content: { "application/json": { schema: FileListResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const requestUploadUrlRoute = createRoute({
  method: "post",
  path: "/v1/files/upload-url",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: RequestUploadUrlRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "60-second signed upload URL targeting quarantine bucket",
      content: {
        "application/json": { schema: RequestUploadUrlResponseSchema },
      },
    },
    400: {
      description: "Storage quota exceeded or invalid input",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const completeUploadRoute = createRoute({
  method: "post",
  path: "/v1/files/{id}/complete-upload",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Quarantine scan finished and file promoted or blocked",
      content: {
        "application/json": { schema: CompleteUploadResponseSchema },
      },
    },
    404: {
      description: "File record or uploaded object not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const updateFileRoute = createRoute({
  method: "patch",
  path: "/v1/files/{id}",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateFileRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "File updated",
      content: { "application/json": { schema: FileRecordSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const restoreFileRoute = createRoute({
  method: "post",
  path: "/v1/files/{id}/restore",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "File restored from trash",
      content: { "application/json": { schema: FileRecordSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const deleteFileRoute = createRoute({
  method: "delete",
  path: "/v1/files/{id}",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "File permanently deleted",
      content: { "application/json": { schema: OkResponseSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const emptyTrashRoute = createRoute({
  method: "post",
  path: "/v1/trash/empty",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "All trashed files permanently removed",
      content: { "application/json": { schema: EmptyTrashResponseSchema } },
    },
  },
})

const downloadQuerySchema = z.object({
  inline: z
    .enum(["true", "false"])
    .optional()
    .openapi({ param: { name: "inline", in: "query" } }),
})

const requestDownloadUrlRoute = createRoute({
  method: "post",
  path: "/v1/files/{id}/download-url",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema, query: downloadQuerySchema },
  responses: {
    200: {
      description: "60-second signed download URL for clean file",
      content: { "application/json": { schema: DownloadUrlResponseSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Monthly download cap reached",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const getFindingsRoute = createRoute({
  method: "get",
  path: "/v1/files/{id}/findings",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Masked sensitive findings for a file",
      content: { "application/json": { schema: FileFindingsResponseSchema } },
    },
    404: {
      description: "File not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const updateFindingRoute = createRoute({
  method: "patch",
  path: "/v1/files/{id}/findings/{findingId}",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: FindingParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateFindingRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Finding updated",
      content: { "application/json": { schema: FindingSchema } },
    },
    404: {
      description: "File or finding not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const rescanFileRoute = createRoute({
  method: "post",
  path: "/v1/files/{id}/rescan",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Re-ran deterministic scanner on file",
      content: { "application/json": { schema: FileFindingsResponseSchema } },
    },
  },
})

const createRedactedCopyRoute = createRoute({
  method: "post",
  path: "/v1/files/{id}/redacted-copy",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Generated redacted copy in clean bucket",
      content: { "application/json": { schema: FileRecordSchema } },
    },
  },
})

async function permanentlyDeleteFile(uid: string, fileId: string): Promise<number> {
  const db = getAdminDb()
  const fileRef = userCollection(db, uid, "files").doc(fileId)
  const fileSnap = await fileRef.get()
  if (!fileSnap.exists || !fileSnap.data()) {
    throw new HTTPException(404, { message: "File not found." })
  }
  const fileData = fileSnap.data()!
  const fileSize = typeof fileData.size === "number" ? fileData.size : 0
  const countedBytes = fileData.scanStatus === "clean" ? fileSize : 0

  await deleteFileObjects(uid, fileId)

  const [findingsSnap, sharesSnap] = await Promise.all([
    db.collection("files").doc(fileId).collection("findings").get(),
    db.collection("shares").where("fileId", "==", fileId).get(),
  ])

  const batch = db.batch()
  for (const doc of findingsSnap.docs) {
    batch.delete(doc.ref)
  }
  const now = new Date().toISOString()
  for (const doc of sharesSnap.docs) {
    if (doc.data().ownerUid === uid && !doc.data().revokedAt) {
      batch.set(doc.ref, { revokedAt: now }, { merge: true })
    }
  }
  batch.delete(fileRef)
  await batch.commit()

  if (countedBytes > 0) {
    const userRef = db.collection("users").doc(uid)
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef)
      const current =
        typeof userSnap.data()?.bytesUsed === "number"
          ? userSnap.data()!.bytesUsed
          : 0
      tx.set(
        userRef,
        { bytesUsed: Math.max(0, current - countedBytes) },
        { merge: true }
      )
    })
  }

  return countedBytes
}

export function registerDriveRoutes(app: ApiApp): void {
  app.openapi(listFoldersRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const snap = await userCollection(db, uid, "folders").get()
    const folders = snap.docs
      .map((doc) => toFolder(doc.id, doc.data()))
      .sort((a, b) => a.name.localeCompare(b.name))
    return c.json({ folders }, 200)
  })

  app.openapi(createFolderRoute, async (c) => {
    const uid = c.get("uid")
    const body = c.req.valid("json")
    const db = getAdminDb()
    const now = new Date().toISOString()
    const ref = userCollection(db, uid, "folders").doc()
    const record = {
      name: body.name,
      parentId: body.parentId,
      aiConsent: body.aiConsent,
      vault: body.vault,
      createdAt: now,
      updatedAt: now,
    }
    await ref.set(record)
    await writeAuditEvent(db, uid, {
      action: "folder.create",
      category: "files",
      title: `Created folder ${body.name}`,
      detail: `AI consent: ${body.aiConsent}`,
      target: ref.id,
    })
    return c.json({ id: ref.id, ...record }, 201)
  })

  app.openapi(updateFolderRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const body = c.req.valid("json")
    const db = getAdminDb()
    const ref = userCollection(db, uid, "folders").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Folder not found." })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.parentId !== undefined) updates.parentId = body.parentId
    if (body.aiConsent !== undefined) updates.aiConsent = body.aiConsent
    if (body.vault !== undefined) updates.vault = body.vault

    await ref.set(updates, { merge: true })
    const updated = await ref.get()
    const folder = toFolder(id, updated.data()!)

    await writeAuditEvent(db, uid, {
      action: "folder.update",
      category: body.aiConsent !== undefined ? "ai" : "files",
      title: `Updated folder ${folder.name}`,
      detail:
        body.aiConsent !== undefined
          ? `AI consent set to ${folder.aiConsent}`
          : "Folder details changed",
      target: id,
    })

    return c.json(folder, 200)
  })

  app.openapi(deleteFolderRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const ref = userCollection(db, uid, "folders").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Folder not found." })
    }
    const folderName = String(snap.data()!.name ?? "folder")

    const filesSnap = await userCollection(db, uid, "files")
      .where("folderId", "==", id)
      .get()
    const batch = db.batch()
    for (const fileDoc of filesSnap.docs) {
      batch.set(fileDoc.ref, { folderId: null }, { merge: true })
    }
    batch.delete(ref)
    await batch.commit()

    await writeAuditEvent(db, uid, {
      action: "folder.delete",
      category: "files",
      title: `Deleted folder ${folderName}`,
      detail: `${filesSnap.size} item(s) moved to Drive root`,
      target: id,
    })

    return c.json({ ok: true as const }, 200)
  })

  app.openapi(listFilesRoute, async (c) => {
    const uid = c.get("uid")
    const { folderId, trashed } = c.req.valid("query")
    const db = getAdminDb()
    const snap = await userCollection(db, uid, "files").get()

    const wantTrashed = trashed === "true"
    const files = snap.docs
      .map((doc) => toFileRecord(doc.id, doc.data()))
      .filter((f) => {
        const isTrashed = f.trashedAt !== null
        if (trashed !== undefined && isTrashed !== wantTrashed) return false
        if (trashed === undefined && isTrashed) return false
        if (folderId !== undefined) {
          if (folderId === "root") return f.folderId === null
          if (f.folderId !== folderId) return false
        }
        return true
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return c.json({ files }, 200)
  })

  app.openapi(requestUploadUrlRoute, async (c) => {
    const uid = c.get("uid")
    const body = c.req.valid("json")
    const db = getAdminDb()

    const userSnap = await db.collection("users").doc(uid).get()
    const bytesUsed =
      typeof userSnap.data()?.bytesUsed === "number"
        ? userSnap.data()!.bytesUsed
        : 0

    if (bytesUsed + body.size > FREE_STORAGE_QUOTA_BYTES) {
      throw new HTTPException(400, {
        message: "Storage quota exceeded (10 GB free plan limit).",
      })
    }

    const now = new Date().toISOString()
    const fileRef = userCollection(db, uid, "files").doc()
    await fileRef.set({
      name: body.name,
      folderId: body.folderId,
      mime: body.mime || "application/octet-stream",
      size: body.size,
      currentVersion: 1,
      scanStatus: "quarantined",
      exposure: "private",
      findingCount: 0,
      originalBlocked: false,
      hasRedactedCopy: false,
      trashedAt: null,
      purgeAt: null,
      sha256: null,
      createdAt: now,
      updatedAt: now,
    })

    const uploadUrl = await createUploadSignedUrl(
      uid,
      fileRef.id,
      body.mime || "application/octet-stream"
    )

    return c.json(
      {
        fileId: fileRef.id,
        uploadUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      },
      200
    )
  })

  app.openapi(completeUploadRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const fileRef = userCollection(db, uid, "files").doc(id)
    const fileSnap = await fileRef.get()
    if (!fileSnap.exists || !fileSnap.data()) {
      throw new HTTPException(404, { message: "File record not found." })
    }

    const fileData = fileSnap.data()!
    const filename = String(fileData.name ?? "untitled")
    const mime = String(fileData.mime ?? "application/octet-stream")

    let inspected
    try {
      inspected = await inspectQuarantineObject(uid, id)
    } catch {
      throw new HTTPException(404, {
        message: "Uploaded object not found in quarantine.",
      })
    }

    // Signed URLs don't bind size: enforce declared size and quota here.
    const declaredSize = Number(fileData.size ?? 0)
    const userSnap = await db.collection("users").doc(uid).get()
    const bytesUsed = Number(userSnap.data()?.bytesUsed ?? 0)
    if (
      inspected.size > declaredSize ||
      bytesUsed + inspected.size > FREE_STORAGE_QUOTA_BYTES
    ) {
      await deleteQuarantineObject(uid, id)
      await fileRef.delete()
      throw new HTTPException(400, {
        message: "Uploaded size exceeds the declared size or storage quota.",
      })
    }

    const scanResult = scanBuffer(filename, mime, inspected.sample)
    const now = new Date().toISOString()

    if (scanResult.malware) {
      await deleteQuarantineObject(uid, id)
      await fileRef.set(
        {
          scanStatus: "blocked",
          size: inspected.size,
          sha256: inspected.sha256,
          updatedAt: now,
        },
        { merge: true }
      )
      await writeAuditEvent(db, uid, {
        action: "scan.blocked",
        category: "security",
        title: `Blocked ${filename}`,
        detail: scanResult.blockedReason ?? "Malware detected in quarantine.",
        target: id,
      })

      const updatedSnap = await fileRef.get()
      return c.json(
        {
          file: toFileRecord(id, updatedSnap.data()!),
          findings: [],
          blockedReason: scanResult.blockedReason,
        },
        200
      )
    }

    await promoteToClean(uid, id)

    const findingsCol = db.collection("files").doc(id).collection("findings")
    const existingFindings = await findingsCol.get()
    const batch = db.batch()
    for (const oldDoc of existingFindings.docs) {
      batch.delete(oldDoc.ref)
    }
    for (const finding of scanResult.findings) {
      batch.set(findingsCol.doc(finding.id), {
        type: finding.type,
        location: finding.location,
        maskedValue: finding.maskedValue,
        detector: finding.detector,
        safe: false,
      })
    }
    batch.set(
      fileRef,
      {
        scanStatus: "clean",
        size: inspected.size,
        sha256: inspected.sha256,
        findingCount: scanResult.findings.length,
        updatedAt: now,
      },
      { merge: true }
    )
    await batch.commit()

    await db
      .collection("users")
      .doc(uid)
      .set(
        { bytesUsed: FieldValue.increment(inspected.size) },
        { merge: true }
      )

    await writeAuditEvent(db, uid, {
      action: "file.upload",
      category: "files",
      title: `Uploaded ${filename}`,
      detail:
        scanResult.findings.length > 0
          ? `Clean · ${scanResult.findings.length} sensitive finding(s) masked`
          : "Clean after quarantine scan",
      target: id,
    })

    const updatedSnap = await fileRef.get()
    return c.json(
      {
        file: toFileRecord(id, updatedSnap.data()!),
        findings: scanResult.findings,
        blockedReason: null,
      },
      200
    )
  })

  app.openapi(updateFileRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const body = c.req.valid("json")
    const db = getAdminDb()
    const ref = userCollection(db, uid, "files").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now }
    if (body.name !== undefined) updates.name = body.name
    if (body.folderId !== undefined) updates.folderId = body.folderId
    if (body.originalBlocked !== undefined) {
      updates.originalBlocked = body.originalBlocked
    }
    if (body.trashed !== undefined) {
      if (body.trashed) {
        updates.trashedAt = now
        updates.purgeAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      } else {
        updates.trashedAt = null
        updates.purgeAt = null
      }
    }

    await ref.set(updates, { merge: true })
    const updatedSnap = await ref.get()
    const file = toFileRecord(id, updatedSnap.data()!)

    await writeAuditEvent(db, uid, {
      action: body.trashed ? "file.trash" : "file.update",
      category: body.originalBlocked !== undefined ? "security" : "files",
      title: body.trashed
        ? `Moved ${file.name} to trash`
        : `Updated ${file.name}`,
      detail:
        body.originalBlocked !== undefined
          ? file.originalBlocked
            ? "Blocked sharing original"
            : "Allowed sharing original"
          : body.trashed
            ? "30-day self-destruct timer started"
            : "File metadata updated",
      target: id,
    })

    return c.json(file, 200)
  })

  app.openapi(restoreFileRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const ref = userCollection(db, uid, "files").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }
    await ref.set(
      { trashedAt: null, purgeAt: null, updatedAt: new Date().toISOString() },
      { merge: true }
    )
    const updated = await ref.get()
    const file = toFileRecord(id, updated.data()!)

    await writeAuditEvent(db, uid, {
      action: "file.restore",
      category: "files",
      title: `Restored ${file.name}`,
      detail: "Moved out of Trash",
      target: id,
    })

    return c.json(file, 200)
  })

  app.openapi(deleteFileRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const snap = await userCollection(db, uid, "files").doc(id).get()
    const name = String(snap.data()?.name ?? id)
    await permanentlyDeleteFile(uid, id)

    await writeAuditEvent(db, uid, {
      action: "file.delete",
      category: "files",
      title: `Permanently deleted ${name}`,
      detail: "Removed encrypted storage object and metadata",
      target: id,
    })

    return c.json({ ok: true as const }, 200)
  })

  app.openapi(emptyTrashRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const snap = await userCollection(db, uid, "files").get()
    const trashedIds = snap.docs
      .filter((doc) => typeof doc.data().trashedAt === "string")
      .map((doc) => doc.id)

    for (const id of trashedIds) {
      await permanentlyDeleteFile(uid, id)
    }

    if (trashedIds.length > 0) {
      await writeAuditEvent(db, uid, {
        action: "trash.empty",
        category: "files",
        title: `Emptied ${trashedIds.length} trashed item(s)`,
        detail: "Permanent deletion completed",
        target: uid,
      })
    }

    return c.json({ deletedCount: trashedIds.length }, 200)
  })

  app.openapi(requestDownloadUrlRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const { inline } = c.req.valid("query")
    const db = getAdminDb()
    const snap = await userCollection(db, uid, "files").doc(id).get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }
    const file = toFileRecord(id, snap.data()!)
    if (file.scanStatus !== "clean") {
      throw new HTTPException(403, {
        message: "Only clean files can be downloaded.",
      })
    }

    const isInline = inline === "true"
    await incrementMonthlyDownloadBytes(db, uid, file.size)

    const downloadUrl = await createDownloadSignedUrl(
      getCleanPath(uid, id),
      file.name,
      isInline
    )

    return c.json(
      {
        fileId: id,
        name: file.name,
        mime: file.mime,
        downloadUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      },
      200
    )
  })

  app.openapi(getFindingsRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const fileSnap = await userCollection(db, uid, "files").doc(id).get()
    if (!fileSnap.exists || !fileSnap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }
    const findingsSnap = await db
      .collection("files")
      .doc(id)
      .collection("findings")
      .get()
    return c.json(
      {
        file: toFileRecord(id, fileSnap.data()!),
        findings: findingsSnap.docs.map((doc) => toFinding(doc.id, doc.data())),
      },
      200
    )
  })

  app.openapi(updateFindingRoute, async (c) => {
    const uid = c.get("uid")
    const { id, findingId } = c.req.valid("param")
    const { safe } = c.req.valid("json")
    const db = getAdminDb()

    const fileRef = userCollection(db, uid, "files").doc(id)
    const fileSnap = await fileRef.get()
    if (!fileSnap.exists || !fileSnap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }

    const findingRef = db
      .collection("files")
      .doc(id)
      .collection("findings")
      .doc(findingId)
    const findingSnap = await findingRef.get()
    if (!findingSnap.exists || !findingSnap.data()) {
      throw new HTTPException(404, { message: "Finding not found." })
    }

    await findingRef.set({ safe }, { merge: true })
    const allFindings = await db
      .collection("files")
      .doc(id)
      .collection("findings")
      .get()
    const activeCount = allFindings.docs.filter((d) => !d.data().safe).length
    await fileRef.set(
      { findingCount: activeCount, updatedAt: new Date().toISOString() },
      { merge: true }
    )

    const updated = await findingRef.get()
    return c.json(toFinding(findingId, updated.data()!), 200)
  })

  app.openapi(rescanFileRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const fileRef = userCollection(db, uid, "files").doc(id)
    const fileSnap = await fileRef.get()
    if (!fileSnap.exists || !fileSnap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }

    const file = toFileRecord(id, fileSnap.data()!)
    if (file.scanStatus !== "clean") {
      return c.json({ file, findings: [] }, 200)
    }

    const { sample } = await readCleanSample(uid, id)
    const outcome = scanBuffer(file.name, file.mime, sample)
    const findingsCol = db.collection("files").doc(id).collection("findings")
    const oldDocs = await findingsCol.get()
    const batch = db.batch()
    for (const d of oldDocs.docs) batch.delete(d.ref)
    for (const fnd of outcome.findings) {
      batch.set(findingsCol.doc(fnd.id), {
        type: fnd.type,
        location: fnd.location,
        maskedValue: fnd.maskedValue,
        detector: fnd.detector,
        safe: false,
      })
    }
    const now = new Date().toISOString()
    batch.set(
      fileRef,
      { findingCount: outcome.findings.length, updatedAt: now },
      { merge: true }
    )
    await batch.commit()

    await writeAuditEvent(db, uid, {
      action: "scan.rescan",
      category: "security",
      title: `Rescanned ${file.name}`,
      detail: `${outcome.findings.length} finding(s) detected`,
      target: id,
    })

    const updatedSnap = await fileRef.get()
    return c.json(
      {
        file: toFileRecord(id, updatedSnap.data()!),
        findings: outcome.findings,
      },
      200
    )
  })

  app.openapi(createRedactedCopyRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()
    const fileRef = userCollection(db, uid, "files").doc(id)
    const fileSnap = await fileRef.get()
    if (!fileSnap.exists || !fileSnap.data()) {
      throw new HTTPException(404, { message: "File not found." })
    }
    const file = toFileRecord(id, fileSnap.data()!)
    if (file.scanStatus !== "clean") {
      throw new HTTPException(400, {
        message: "Cannot create a redacted copy for an unclean file.",
      })
    }

    const { sample, contentType } = await readCleanSample(uid, id)
    if (isTextInspectable(file.name, file.mime)) {
      const { redactedText, maskedCount } = maskAndRedactText(
        sample.toString("utf8")
      )
      await writeRedactedToClean(uid, id, redactedText, contentType)
      await fileRef.set(
        { hasRedactedCopy: true, updatedAt: new Date().toISOString() },
        { merge: true }
      )
      await writeAuditEvent(db, uid, {
        action: "file.redact",
        category: "sharing",
        title: `Created redacted copy for ${file.name}`,
        detail: `${maskedCount} sensitive value(s) permanently masked`,
        target: id,
      })
    } else {
      await writeRedactedToClean(uid, id, sample, contentType)
      await fileRef.set(
        { hasRedactedCopy: true, updatedAt: new Date().toISOString() },
        { merge: true }
      )
      await writeAuditEvent(db, uid, {
        action: "file.redact",
        category: "sharing",
        title: `Prepared redacted share copy for ${file.name}`,
        detail: "Clean snapshot staged for sharing",
        target: id,
      })
    }

    const updatedSnap = await fileRef.get()
    return c.json(toFileRecord(id, updatedSnap.data()!), 200)
  })
}
