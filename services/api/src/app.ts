import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import {
  CreateFolderRequestSchema,
  ErrorResponseSchema,
  FileListResponseSchema,
  FolderListResponseSchema,
  FolderSchema,
  FREE_MONTHLY_DOWNLOAD_CAP_BYTES,
  FREE_STORAGE_QUOTA_BYTES,
  HealthResponseSchema,
  MeResponseSchema,
  z,
} from "@workspace/schema"
import { requireAuth, userCollection, type AuthVariables } from "./core/auth.js"
import { getAdminDb } from "./core/firebase.js"

export const OPENAPI_CONFIG = {
  openapi: "3.1.0",
  info: {
    version: "0.1.0",
    title: "Glashus API",
    description:
      "Exposure-aware personal cloud drive API. Clients never name bucket paths directly.",
  },
} as const

export const app = new OpenAPIHono<{ Variables: AuthVariables }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.issues.map((issue) => issue.message).join("; "),
          },
        },
        400
      )
    }
  },
})

app.use("*", async (c, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000"
  const middleware = cors({
    origin: allowedOrigin.split(",").map((origin) => origin.trim()),
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 3600,
  })
  return middleware(c, next)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const code =
      err.status === 401
        ? "UNAUTHORIZED"
        : err.status === 403
          ? "FORBIDDEN"
          : err.status === 404
            ? "NOT_FOUND"
            : "HTTP_ERROR"
    return c.json(
      {
        error: {
          code,
          message: err.message,
        },
      },
      err.status
    )
  }

  console.error("Unhandled API error:", err)
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected internal error occurred.",
      },
    },
    500
  )
})

app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Firebase Authentication ID Token (JWT).",
})

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  responses: {
    200: {
      description: "Service health status",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
})

app.openapi(healthRoute, (c) => {
  return c.json(
    {
      status: "ok" as const,
      service: "glashus-api",
      timestamp: new Date().toISOString(),
    },
    200
  )
})

const getMeRoute = createRoute({
  method: "get",
  path: "/v1/me",
  tags: ["Account"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Current user profile and monthly usage summary",
      content: {
        "application/json": {
          schema: MeResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid Firebase JWT",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

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

  const createdAt = now.toISOString()
  let userData = userSnap.data()
  if (!userSnap.exists || !userData) {
    userData = {
      name,
      email,
      plan: "free",
      bytesUsed: 0,
      aiMode: "off",
      createdAt,
    }
    await userRef.set(userData, { merge: true })
  }

  const usageData = usageSnap.data()

  return c.json(
    {
      user: {
        uid,
        name: typeof userData.name === "string" ? userData.name : name,
        email: typeof userData.email === "string" ? userData.email : email,
        plan:
          userData.plan === "plus_10gb" || userData.plan === "plus_100gb"
            ? userData.plan
            : ("free" as const),
        bytesUsed: typeof userData.bytesUsed === "number" ? userData.bytesUsed : 0,
        storageQuotaBytes: FREE_STORAGE_QUOTA_BYTES,
        aiMode:
          userData.aiMode === "ask" || userData.aiMode === "allow"
            ? userData.aiMode
            : ("off" as const),
        createdAt:
          typeof userData.createdAt === "string" ? userData.createdAt : createdAt,
      },
      usage: {
        month,
        downloadBytes:
          typeof usageData?.downloadBytes === "number" ? usageData.downloadBytes : 0,
        downloadCapBytes: FREE_MONTHLY_DOWNLOAD_CAP_BYTES,
        aiReads: typeof usageData?.aiReads === "number" ? usageData.aiReads : 0,
      },
    },
    200
  )
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
      content: {
        "application/json": {
          schema: FolderListResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid Firebase JWT",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

app.openapi(listFoldersRoute, async (c) => {
  const uid = c.get("uid")
  const db = getAdminDb()
  const snap = await userCollection(db, uid, "folders").orderBy("name").get()

  const folders = snap.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: String(data.name ?? "Untitled"),
      parentId: typeof data.parentId === "string" ? data.parentId : null,
      aiConsent:
        data.aiConsent === "ask" || data.aiConsent === "allow"
          ? (data.aiConsent as "ask" | "allow")
          : ("off" as const),
      vault: Boolean(data.vault),
      createdAt: String(data.createdAt ?? new Date().toISOString()),
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    }
  })

  return c.json({ folders }, 200)
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
      content: {
        "application/json": {
          schema: CreateFolderRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Folder created",
      content: {
        "application/json": {
          schema: FolderSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid Firebase JWT",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
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

  return c.json({ id: ref.id, ...record }, 201)
})

const listFilesQuerySchema = z.object({
  folderId: z
    .string()
    .optional()
    .openapi({
      param: {
        name: "folderId",
        in: "query",
      },
      example: "fld_root",
    }),
})

const listFilesRoute = createRoute({
  method: "get",
  path: "/v1/files",
  tags: ["Drive"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    query: listFilesQuerySchema,
  },
  responses: {
    200: {
      description: "Non-trashed files owned by the authenticated user",
      content: {
        "application/json": {
          schema: FileListResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid Firebase JWT",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

app.openapi(listFilesRoute, async (c) => {
  const uid = c.get("uid")
  const { folderId } = c.req.valid("query")
  const db = getAdminDb()

  let query = userCollection(db, uid, "files").where("trashedAt", "==", null)
  if (folderId) {
    query = query.where("folderId", "==", folderId)
  }

  const snap = await query.get()
  const files = snap.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: String(data.name ?? "untitled"),
      folderId: typeof data.folderId === "string" ? data.folderId : null,
      mime: String(data.mime ?? "application/octet-stream"),
      size: typeof data.size === "number" ? data.size : 0,
      currentVersion:
        typeof data.currentVersion === "number" ? data.currentVersion : 1,
      scanStatus:
        data.scanStatus === "clean" || data.scanStatus === "blocked"
          ? (data.scanStatus as "clean" | "blocked")
          : ("quarantined" as const),
      exposure:
        data.exposure === "shared" ||
        data.exposure === "link" ||
        data.exposure === "public"
          ? (data.exposure as "shared" | "link" | "public")
          : ("private" as const),
      findingCount:
        typeof data.findingCount === "number" ? data.findingCount : 0,
      trashedAt: typeof data.trashedAt === "string" ? data.trashedAt : null,
      createdAt: String(data.createdAt ?? new Date().toISOString()),
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    }
  })

  return c.json({ files }, 200)
})

app.doc31("/doc", OPENAPI_CONFIG)
