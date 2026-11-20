import { z } from "@workspace/schema"

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  GCP_PROJECT_ID: z.string().min(1),
  GCS_QUARANTINE_BUCKET: z.string().min(1),
  GCS_CLEAN_BUCKET: z.string().min(1),
  KMS_KEY_NAME: z.string().min(1),
  GCS_SIGNER_EMAIL: z.string().email().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
})

export type ApiEnv = z.infer<typeof EnvSchema>

let cachedEnv: ApiEnv | null = null

export function getEnv(): ApiEnv {
  if (!cachedEnv) {
    cachedEnv = EnvSchema.parse(process.env)
  }
  return cachedEnv
}
