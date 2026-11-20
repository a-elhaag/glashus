import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { HealthResponseSchema } from "@workspace/schema"
import type { AuthVariables } from "./core/auth.js"
import { registerAiRoutes } from "./routes/ai.js"
import { registerDriveRoutes } from "./routes/drive.js"
import { registerMeRoutes } from "./routes/me.js"
import { registerSharingRoutes } from "./routes/sharing.js"

export const OPENAPI_CONFIG = {
  openapi: "3.1.0",
  info: {
    version: "0.2.0",
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
  const allowedOrigin =
    process.env.CORS_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3000"
  const origins = allowedOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  const middleware = cors({
    origin: origins.includes("*") ? "*" : origins,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 3600,
  })
  return middleware(c, next)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const code =
      err.status === 400
        ? "BAD_REQUEST"
        : err.status === 401
          ? "UNAUTHORIZED"
          : err.status === 403
            ? "FORBIDDEN"
            : err.status === 404
              ? "NOT_FOUND"
              : err.status === 429
                ? "RATE_LIMITED"
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

registerMeRoutes(app)
registerDriveRoutes(app)
registerSharingRoutes(app)
registerAiRoutes(app)

app.doc31("/doc", OPENAPI_CONFIG)
