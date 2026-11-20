import { z } from "@hono/zod-openapi"

export const ErrorDetailSchema = z
  .object({
    code: z.string().openapi({ example: "UNAUTHORIZED" }),
    message: z.string().openapi({ example: "Missing or invalid Bearer token." }),
  })
  .openapi("ErrorDetail")

export const ErrorResponseSchema = z
  .object({
    error: ErrorDetailSchema,
  })
  .openapi("ErrorResponse")

export const HealthResponseSchema = z
  .object({
    status: z.literal("ok").openapi({ example: "ok" }),
    service: z.string().openapi({ example: "glashus-api" }),
    timestamp: z.string().datetime().openapi({ example: "2026-11-20T12:00:00.000Z" }),
  })
  .openapi("HealthResponse")

export const PlanSchema = z.enum(["free", "plus_10gb", "plus_100gb"]).openapi("Plan")

export const AiModeSchema = z.enum(["off", "ask", "allow"]).openapi("AiMode")

export const UserProfileSchema = z
  .object({
    uid: z.string().min(1).openapi({ example: "usr_abc123" }),
    name: z.string().openapi({ example: "Anas Abuelhaag" }),
    email: z.string().email().openapi({ example: "anas@example.com" }),
    plan: PlanSchema,
    bytesUsed: z.number().int().nonnegative().openapi({ example: 1048576 }),
    storageQuotaBytes: z.number().int().positive().openapi({ example: 10737418240 }),
    aiMode: AiModeSchema,
    createdAt: z.string().datetime(),
  })
  .openapi("UserProfile")

export const MonthlyUsageSchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .openapi({ example: "2026-11" }),
    downloadBytes: z.number().int().nonnegative().openapi({ example: 0 }),
    downloadCapBytes: z.number().int().positive().openapi({ example: 10737418240 }),
    aiReads: z.number().int().nonnegative().openapi({ example: 0 }),
  })
  .openapi("MonthlyUsage")

export const MeResponseSchema = z
  .object({
    user: UserProfileSchema,
    usage: MonthlyUsageSchema,
  })
  .openapi("MeResponse")

export const AiConsentSchema = z.enum(["off", "ask", "allow"]).openapi("AiConsent")

export const FolderSchema = z
  .object({
    id: z.string().min(1).openapi({ example: "fld_root" }),
    name: z.string().min(1).max(255).openapi({ example: "Taxes 2026" }),
    parentId: z.string().nullable().openapi({ example: null }),
    aiConsent: AiConsentSchema,
    vault: z.boolean().openapi({ example: false }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Folder")

export const CreateFolderRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255).openapi({ example: "Receipts" }),
    parentId: z.string().nullable().default(null).openapi({ example: null }),
    aiConsent: AiConsentSchema.default("off"),
    vault: z.boolean().default(false),
  })
  .openapi("CreateFolderRequest")

export const FolderListResponseSchema = z
  .object({
    folders: z.array(FolderSchema),
  })
  .openapi("FolderListResponse")

export const ScanStatusSchema = z
  .enum(["quarantined", "clean", "blocked"])
  .openapi("ScanStatus")

export const ExposureLevelSchema = z
  .enum(["private", "shared", "link", "public"])
  .openapi("ExposureLevel")

export const FileRecordSchema = z
  .object({
    id: z.string().min(1).openapi({ example: "fil_01JABC" }),
    name: z.string().min(1).max(255).openapi({ example: "tax-return-2025.pdf" }),
    folderId: z.string().nullable().openapi({ example: "fld_root" }),
    mime: z.string().min(1).openapi({ example: "application/pdf" }),
    size: z.number().int().nonnegative().openapi({ example: 1245184 }),
    currentVersion: z.number().int().positive().openapi({ example: 1 }),
    scanStatus: ScanStatusSchema,
    exposure: ExposureLevelSchema,
    findingCount: z.number().int().nonnegative().default(0),
    trashedAt: z.string().datetime().nullable().default(null),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("FileRecord")

export const FileListResponseSchema = z
  .object({
    files: z.array(FileRecordSchema),
  })
  .openapi("FileListResponse")

export const FileVersionSchema = z
  .object({
    version: z.number().int().positive(),
    chunkHashes: z.array(z.string().min(1)),
    size: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    author: z.string().min(1),
  })
  .openapi("FileVersion")

export const ChunkRecordSchema = z
  .object({
    hash: z.string().min(1),
    refCount: z.number().int().nonnegative(),
    packId: z.string().nullable(),
    offset: z.number().int().nonnegative(),
    length: z.number().int().positive(),
  })
  .openapi("ChunkRecord")

export const FindingSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1).openapi({ example: "IBAN_CODE" }),
    location: z.string().openapi({ example: "page 2, line 14" }),
    maskedValue: z.string().openapi({ example: "DE89 **** **** **** **30 00" }),
    detector: z.enum(["dlp", "regex", "entropy"]).openapi({ example: "dlp" }),
  })
  .openapi("Finding")

export const ShareAudienceSchema = z
  .enum(["anyone", "specific_people"])
  .openapi("ShareAudience")

export const ShareRecordSchema = z
  .object({
    id: z.string().min(1),
    fileId: z.string().min(1),
    ownerUid: z.string().min(1),
    audience: ShareAudienceSchema,
    expiresAt: z.string().datetime(),
    maxDownloads: z.number().int().positive().nullable(),
    downloads: z.number().int().nonnegative(),
    hasPin: z.boolean(),
    redacted: z.boolean(),
    revokedAt: z.string().datetime().nullable().default(null),
    createdAt: z.string().datetime(),
  })
  .openapi("ShareRecord")

export const AuditEventSchema = z
  .object({
    id: z.string().min(1),
    action: z.string().min(1).openapi({ example: "file.upload" }),
    target: z.string().min(1).openapi({ example: "fil_01JABC" }),
    actor: z.string().min(1),
    device: z.string().nullable().default(null),
    ip: z.string().nullable().default(null),
    time: z.string().datetime(),
  })
  .openapi("AuditEvent")

export const AiLogEntrySchema = z
  .object({
    id: z.string().min(1),
    fileId: z.string().min(1),
    purpose: z.string().min(1).openapi({ example: "ask_my_files" }),
    sentSummary: z.string(),
    maskedCount: z.number().int().nonnegative(),
    model: z.string().min(1).openapi({ example: "gemini-2.5-flash" }),
    time: z.string().datetime(),
  })
  .openapi("AiLogEntry")

export const CanarySchema = z
  .object({
    id: z.string().min(1),
    ownerUid: z.string().min(1),
    fileId: z.string().min(1),
    lastTriggeredAt: z.string().datetime().nullable(),
    channel: z.enum(["email", "in_app"]).default("in_app"),
  })
  .openapi("Canary")

export const RequestUploadUrlRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    folderId: z.string().nullable().default(null),
    mime: z.string().min(1).default("application/octet-stream"),
    size: z.number().int().positive(),
  })
  .openapi("RequestUploadUrlRequest")

export const RequestUploadUrlResponseSchema = z
  .object({
    fileId: z.string().min(1),
    uploadUrl: z.string().url(),
    expiresInSeconds: z.number().int().positive().openapi({ example: 60 }),
  })
  .openapi("RequestUploadUrlResponse")

export const DownloadUrlResponseSchema = z
  .object({
    fileId: z.string().min(1),
    downloadUrl: z.string().url(),
    expiresInSeconds: z.number().int().positive().openapi({ example: 60 }),
  })
  .openapi("DownloadUrlResponse")

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type HealthResponse = z.infer<typeof HealthResponseSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type MonthlyUsage = z.infer<typeof MonthlyUsageSchema>
export type MeResponse = z.infer<typeof MeResponseSchema>
export type Folder = z.infer<typeof FolderSchema>
export type CreateFolderRequest = z.infer<typeof CreateFolderRequestSchema>
export type FileRecord = z.infer<typeof FileRecordSchema>
export type FileVersion = z.infer<typeof FileVersionSchema>
export type ChunkRecord = z.infer<typeof ChunkRecordSchema>
export type Finding = z.infer<typeof FindingSchema>
export type ShareRecord = z.infer<typeof ShareRecordSchema>
export type AuditEvent = z.infer<typeof AuditEventSchema>
export type AiLogEntry = z.infer<typeof AiLogEntrySchema>
export type Canary = z.infer<typeof CanarySchema>
export type RequestUploadUrlRequest = z.infer<typeof RequestUploadUrlRequestSchema>
export type RequestUploadUrlResponse = z.infer<typeof RequestUploadUrlResponseSchema>
export type DownloadUrlResponse = z.infer<typeof DownloadUrlResponseSchema>
