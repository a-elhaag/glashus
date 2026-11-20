import createClient, { type Middleware } from "openapi-fetch"
import type { components, paths } from "./generated/schema.js"

export type { components, paths }

export type GlashusClientOptions = {
  baseUrl: string
  getToken?: () => Promise<string | null> | string | null
}

/**
 * Creates a typed Glashus API client generated from services/api OpenAPI 3.1 spec.
 */
export function createGlashusClient({ baseUrl, getToken }: GlashusClientOptions) {
  const client = createClient<paths>({ baseUrl })

  if (getToken) {
    const authMiddleware: Middleware = {
      async onRequest({ request }) {
        const token = await getToken()
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`)
        }
        return request
      },
    }
    client.use(authMiddleware)
  }

  return client
}

export type GlashusClient = ReturnType<typeof createGlashusClient>
