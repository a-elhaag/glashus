import { serve } from "@hono/node-server"
import { app } from "./app.js"
import { getEnv } from "./core/env.js"

const env = getEnv()

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`glashus-api listening on http://localhost:${info.port}`)
  }
)
