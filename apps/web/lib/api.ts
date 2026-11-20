import { createGlashusClient } from "@workspace/sdk"
import { getIdToken } from "@/lib/firebase"

export const glashusApi = createGlashusClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  getToken: getIdToken,
})
