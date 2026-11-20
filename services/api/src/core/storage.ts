import { createHash } from "node:crypto"
import { Storage } from "@google-cloud/storage"
import { GoogleAuth, Impersonated } from "google-auth-library"
import { SIGNED_URL_TTL_SECONDS } from "@workspace/schema"
import { getEnv } from "./env.js"

let cachedStoragePromise: Promise<Storage> | null = null

async function createStorageClient(): Promise<Storage> {
  const env = getEnv()
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  })
  const sourceClient = await auth.getClient()
  const credentials = await auth.getCredentials().catch(() => null)
  const hasSigningEmail = Boolean(credentials?.client_email)

  if (!hasSigningEmail && env.GCS_SIGNER_EMAIL) {
    const impersonatedClient = new Impersonated({
      sourceClient,
      targetPrincipal: env.GCS_SIGNER_EMAIL,
      lifetime: 300,
      delegates: [],
      targetScopes: ["https://www.googleapis.com/auth/devstorage.read_write"],
    })
    return new Storage({
      projectId: env.GCP_PROJECT_ID,
      authClient: impersonatedClient,
    })
  }

  return new Storage({ projectId: env.GCP_PROJECT_ID })
}

export async function getStorage(): Promise<Storage> {
  if (!cachedStoragePromise) {
    cachedStoragePromise = createStorageClient().catch((err) => {
      cachedStoragePromise = null
      throw err
    })
  }
  return cachedStoragePromise
}

export function getQuarantinePath(uid: string, fileId: string): string {
  return `users/${uid}/quarantine/${fileId}`
}

export function getCleanPath(uid: string, fileId: string): string {
  return `users/${uid}/files/${fileId}`
}

export function getRedactedPath(uid: string, fileId: string): string {
  return `users/${uid}/redacted/${fileId}`
}

export async function createUploadSignedUrl(
  uid: string,
  fileId: string,
  contentType: string
): Promise<string> {
  const env = getEnv()
  const storage = await getStorage()
  const objectPath = getQuarantinePath(uid, fileId)
  const [url] = await storage
    .bucket(env.GCS_QUARANTINE_BUCKET)
    .file(objectPath)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      contentType: contentType || "application/octet-stream",
    })
  return url
}

export async function createDownloadSignedUrl(
  objectPath: string,
  filename: string,
  inline = false
): Promise<string> {
  const env = getEnv()
  const storage = await getStorage()
  const safeName = filename.replace(/["\r\n]/g, "_")
  const disposition = inline
    ? `inline; filename="${safeName}"`
    : `attachment; filename="${safeName}"`
  const [url] = await storage
    .bucket(env.GCS_CLEAN_BUCKET)
    .file(objectPath)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      responseDisposition: disposition,
    })
  return url
}

export async function inspectQuarantineObject(
  uid: string,
  fileId: string,
  maxBytes = 2 * 1024 * 1024
): Promise<{ size: number; sample: Buffer; sha256: string; contentType: string }> {
  const env = getEnv()
  const storage = await getStorage()
  const file = storage
    .bucket(env.GCS_QUARANTINE_BUCKET)
    .file(getQuarantinePath(uid, fileId))
  const [metadata] = await file.getMetadata()
  const totalSize = Number(metadata.size ?? 0)
  const contentType =
    typeof metadata.contentType === "string"
      ? metadata.contentType
      : "application/octet-stream"

  const readEnd = Math.max(0, Math.min(totalSize, maxBytes) - 1)
  const [sample] =
    totalSize > 0
      ? await file.download({ start: 0, end: readEnd })
      : [Buffer.alloc(0)]

  const sha256 = createHash("sha256").update(sample).digest("hex")
  return { size: totalSize, sample, sha256, contentType }
}

export async function promoteToClean(uid: string, fileId: string): Promise<void> {
  const env = getEnv()
  const storage = await getStorage()
  const src = storage
    .bucket(env.GCS_QUARANTINE_BUCKET)
    .file(getQuarantinePath(uid, fileId))
  const dst = storage
    .bucket(env.GCS_CLEAN_BUCKET)
    .file(getCleanPath(uid, fileId))

  await src.copy(dst)
  await src.delete({ ignoreNotFound: true })
}

export async function deleteQuarantineObject(
  uid: string,
  fileId: string
): Promise<void> {
  const env = getEnv()
  const storage = await getStorage()
  await storage
    .bucket(env.GCS_QUARANTINE_BUCKET)
    .file(getQuarantinePath(uid, fileId))
    .delete({ ignoreNotFound: true })
}

export async function readCleanSample(
  uid: string,
  fileId: string,
  maxBytes = 512 * 1024
): Promise<{ sample: Buffer; contentType: string }> {
  const env = getEnv()
  const storage = await getStorage()
  const file = storage
    .bucket(env.GCS_CLEAN_BUCKET)
    .file(getCleanPath(uid, fileId))
  const [metadata] = await file.getMetadata()
  const totalSize = Number(metadata.size ?? 0)
  const contentType =
    typeof metadata.contentType === "string"
      ? metadata.contentType
      : "application/octet-stream"
  const readEnd = Math.max(0, Math.min(totalSize, maxBytes) - 1)
  const [sample] =
    totalSize > 0
      ? await file.download({ start: 0, end: readEnd })
      : [Buffer.alloc(0)]
  return { sample, contentType }
}

export async function writeRedactedToClean(
  uid: string,
  fileId: string,
  content: Buffer | string,
  contentType: string
): Promise<void> {
  const env = getEnv()
  const storage = await getStorage()
  const dst = storage
    .bucket(env.GCS_CLEAN_BUCKET)
    .file(getRedactedPath(uid, fileId))
  await dst.save(content, {
    contentType: contentType || "text/plain; charset=utf-8",
    resumable: false,
  })
}

export async function deleteFileObjects(
  uid: string,
  fileId: string
): Promise<void> {
  const env = getEnv()
  const storage = await getStorage()
  await Promise.all([
    storage
      .bucket(env.GCS_QUARANTINE_BUCKET)
      .file(getQuarantinePath(uid, fileId))
      .delete({ ignoreNotFound: true }),
    storage
      .bucket(env.GCS_CLEAN_BUCKET)
      .file(getCleanPath(uid, fileId))
      .delete({ ignoreNotFound: true }),
    storage
      .bucket(env.GCS_CLEAN_BUCKET)
      .file(getRedactedPath(uid, fileId))
      .delete({ ignoreNotFound: true }),
  ])
}
