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

export const OkResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .openapi("OkResponse")

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
    email: z.string().openapi({ example: "anas@example.com" }),
    alertEmail: z.string().default("").openapi({ example: "anas@example.com" }),
    plan: PlanSchema,
    bytesUsed: z.number().int().nonnegative().openapi({ example: 1048576 }),
    storageQuotaBytes: z.number().int().positive().openapi({ example: 10737418240 }),
    aiMode: AiModeSchema,
    massAlerts: z.boolean().default(true),
    canaryAlerts: z.boolean().default(true),
    weeklySummary: z.boolean().default(false),
    requirePinOnPublic: z.boolean().default(true),
    defaultExpiryDays: z.number().int().positive().default(7),
    vaultHint: z.string().default(""),
    createdAt: z.string().datetime(),
  })
  .openapi("UserProfile")

export const UpdateMeRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    alertEmail: z.string().trim().email().or(z.literal("")).optional(),
    aiMode: AiModeSchema.optional(),
    massAlerts: z.boolean().optional(),
    canaryAlerts: z.boolean().optional(),
    weeklySummary: z.boolean().optional(),
    requirePinOnPublic: z.boolean().optional(),
    defaultExpiryDays: z.number().int().min(1).max(365).optional(),
    vaultHint: z.string().max(240).optional(),
  })
  .openapi("UpdateMeRequest")

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

export const UpdateFolderRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    parentId: z.string().nullable().optional(),
    aiConsent: AiConsentSchema.optional(),
    vault: z.boolean().optional(),
  })
  .openapi("UpdateFolderRequest")

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
    originalBlocked: z.boolean().default(false),
    hasRedactedCopy: z.boolean().default(false),
    trashedAt: z.string().datetime().nullable().default(null),
    purgeAt: z.string().datetime().nullable().default(null),
    sha256: z.string().nullable().default(null),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("FileRecord")

export const UpdateFileRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    folderId: z.string().nullable().optional(),
    trashed: z.boolean().optional(),
    originalBlocked: z.boolean().optional(),
  })
  .openapi("UpdateFileRequest")

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
    type: z.string().min(1).openapi({ example: "IBAN" }),
    location: z.string().openapi({ example: "Line 14" }),
    maskedValue: z.string().openapi({ example: "DE89 •••• •••• 3000" }),
    detector: z.enum(["dlp", "regex", "entropy"]).openapi({ example: "regex" }),
    safe: z.boolean().default(false),
  })
  .openapi("Finding")

export const FileFindingsResponseSchema = z
  .object({
    file: FileRecordSchema,
    findings: z.array(FindingSchema),
  })
  .openapi("FileFindingsResponse")

export const UpdateFindingRequestSchema = z
  .object({
    safe: z.boolean(),
  })
  .openapi("UpdateFindingRequest")

export const CompleteUploadResponseSchema = z
  .object({
    file: FileRecordSchema,
    findings: z.array(FindingSchema),
    blockedReason: z.string().nullable(),
  })
  .openapi("CompleteUploadResponse")

export const EmptyTrashResponseSchema = z
  .object({
    deletedCount: z.number().int().nonnegative(),
  })
  .openapi("EmptyTrashResponse")

export const ShareAudienceSchema = z
  .enum(["anyone", "specific_people"])
  .openapi("ShareAudience")

export const ShareRecordSchema = z
  .object({
    id: z.string().min(1),
    fileId: z.string().min(1),
    fileName: z.string().min(1),
    fileMime: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
    ownerUid: z.string().min(1),
    audience: ShareAudienceSchema,
    recipientEmail: z.string().nullable().default(null),
    expiresAt: z.string().datetime().nullable(),
    maxDownloads: z.number().int().positive().nullable(),
    downloads: z.number().int().nonnegative(),
    hasPin: z.boolean(),
    redacted: z.boolean(),
    revokedAt: z.string().datetime().nullable().default(null),
    createdAt: z.string().datetime(),
  })
  .openapi("ShareRecord")

export const CreateShareRequestSchema = z
  .object({
    fileId: z.string().min(1),
    audience: ShareAudienceSchema.default("anyone"),
    recipientEmail: z.string().trim().email().nullable().optional(),
    expiryDays: z.number().int().min(1).max(365).nullable().default(7),
    maxDownloads: z.number().int().min(1).max(1000).nullable().default(5),
    requirePin: z.boolean().default(true),
    redacted: z.boolean().default(true),
  })
  .openapi("CreateShareRequest")

export const CreateShareResponseSchema = z
  .object({
    share: ShareRecordSchema,
    pin: z.string().nullable(),
    sharePath: z.string(),
  })
  .openapi("CreateShareResponse")

export const ShareListResponseSchema = z
  .object({
    shares: z.array(ShareRecordSchema),
  })
  .openapi("ShareListResponse")

export const RevokePublicResponseSchema = z
  .object({
    revokedCount: z.number().int().nonnegative(),
  })
  .openapi("RevokePublicResponse")

export const PublicShareInfoResponseSchema = z
  .object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    fileMime: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
    ownerName: z.string().min(1),
    redacted: z.boolean(),
    hasPin: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
    downloadsRemaining: z.number().int().nonnegative().nullable(),
    expired: z.boolean(),
    revoked: z.boolean(),
    limitReached: z.boolean(),
  })
  .openapi("PublicShareInfoResponse")

export const UnlockShareRequestSchema = z
  .object({
    pin: z.string().max(12).optional(),
  })
  .openapi("UnlockShareRequest")

export const UnlockShareResponseSchema = z
  .object({
    downloadUrl: z.string().url(),
    expiresInSeconds: z.number().int().positive(),
    downloadsRemaining: z.number().int().nonnegative().nullable(),
  })
  .openapi("UnlockShareResponse")

export const ExposureRiskSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["public_link", "never_expires", "sensitive_shared"]),
    fileId: z.string().nullable(),
    shareId: z.string().nullable(),
    title: z.string().min(1),
    detail: z.string().min(1),
    actionLabel: z.string().min(1),
  })
  .openapi("ExposureRisk")

export const ExposureSummaryResponseSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    publicLinks: z.number().int().nonnegative(),
    sensitiveFindings: z.number().int().nonnegative(),
    armedCanaries: z.number().int().nonnegative(),
    risks: z.array(ExposureRiskSchema),
  })
  .openapi("ExposureSummaryResponse")

export const AuditCategorySchema = z
  .enum(["files", "sharing", "ai", "security"])
  .openapi("AuditCategory")

export const AuditEventSchema = z
  .object({
    id: z.string().min(1),
    action: z.string().min(1).openapi({ example: "file.upload" }),
    category: AuditCategorySchema,
    title: z.string().min(1),
    detail: z.string().default(""),
    target: z.string().min(1).openapi({ example: "fil_01JABC" }),
    actor: z.string().min(1),
    device: z.string().nullable().default(null),
    ip: z.string().nullable().default(null),
    time: z.string().datetime(),
  })
  .openapi("AuditEvent")

export const AuditListResponseSchema = z
  .object({
    events: z.array(AuditEventSchema),
  })
  .openapi("AuditListResponse")

export const AiLogEntrySchema = z
  .object({
    id: z.string().min(1),
    fileId: z.string().min(1),
    fileName: z.string().min(1),
    folderName: z.string().default("Drive"),
    consentMode: z.string().default("ask"),
    purpose: z.string().min(1).openapi({ example: "ask_my_files" }),
    sentSummary: z.string(),
    maskedCount: z.number().int().nonnegative(),
    model: z.string().min(1).openapi({ example: "gemini-2.5-flash" }),
    time: z.string().datetime(),
  })
  .openapi("AiLogEntry")

export const AiLogListResponseSchema = z
  .object({
    reads: z.array(AiLogEntrySchema),
    weeklyReads: z.number().int().nonnegative(),
    totalMasked: z.number().int().nonnegative(),
  })
  .openapi("AiLogListResponse")

export const CanaryStatusSchema = z
  .enum(["armed", "triggered", "paused"])
  .openapi("CanaryStatus")

export const CanaryChannelSchema = z
  .enum(["email", "push", "both"])
  .openapi("CanaryChannel")

export const CanarySchema = z
  .object({
    id: z.string().min(1),
    ownerUid: z.string().min(1),
    fileId: z.string().min(1),
    name: z.string().min(1),
    folderId: z.string().nullable().default(null),
    folderName: z.string().default("Drive"),
    status: CanaryStatusSchema,
    channel: CanaryChannelSchema.default("both"),
    detail: z.string().default("Never opened. Checked every request."),
    lastTriggeredAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("Canary")

export const CanaryTriggerSchema = z
  .object({
    id: z.string().min(1),
    canaryId: z.string().min(1),
    canaryName: z.string().min(1),
    when: z.string().datetime(),
    source: z.string().min(1),
    result: z.enum(["alert_sent", "ignored"]),
  })
  .openapi("CanaryTrigger")

export const CreateCanaryRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    folderId: z.string().nullable().default(null),
    channel: CanaryChannelSchema.default("both"),
  })
  .openapi("CreateCanaryRequest")

export const UpdateCanaryRequestSchema = z
  .object({
    status: z.enum(["armed", "paused"]).optional(),
    channel: CanaryChannelSchema.optional(),
  })
  .openapi("UpdateCanaryRequest")

export const CanaryListResponseSchema = z
  .object({
    canaries: z.array(CanarySchema),
    history: z.array(CanaryTriggerSchema),
  })
  .openapi("CanaryListResponse")

export const AskFilesRequestSchema = z
  .object({
    question: z.string().trim().min(1).max(2000),
    folderId: z.string().nullable().default(null),
  })
  .openapi("AskFilesRequest")

export const AskCitationSchema = z
  .object({
    fileId: z.string().min(1),
    fileName: z.string().min(1),
    detail: z.string().min(1),
    excerpt: z.string().min(1),
  })
  .openapi("AskCitation")

export const AskFilesResponseSchema = z
  .object({
    answer: z.string(),
    citations: z.array(AskCitationSchema),
    maskedCount: z.number().int().nonnegative(),
    ignoredCount: z.number().int().nonnegative(),
    consentBlocked: z.boolean(),
    consentMessage: z.string().nullable(),
  })
  .openapi("AskFilesResponse")

export const ExportManifestResponseSchema = z
  .object({
    exportedAt: z.string().datetime(),
    user: UserProfileSchema,
    folders: z.array(FolderSchema),
    files: z.array(FileRecordSchema),
    shares: z.array(ShareRecordSchema),
    auditCount: z.number().int().nonnegative(),
    aiReadCount: z.number().int().nonnegative(),
  })
  .openapi("ExportManifestResponse")

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
    name: z.string().min(1),
    mime: z.string().min(1),
    downloadUrl: z.string().url(),
    expiresInSeconds: z.number().int().positive().openapi({ example: 60 }),
  })
  .openapi("DownloadUrlResponse")

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type OkResponse = z.infer<typeof OkResponseSchema>
export type HealthResponse = z.infer<typeof HealthResponseSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>
export type MonthlyUsage = z.infer<typeof MonthlyUsageSchema>
export type MeResponse = z.infer<typeof MeResponseSchema>
export type Folder = z.infer<typeof FolderSchema>
export type CreateFolderRequest = z.infer<typeof CreateFolderRequestSchema>
export type UpdateFolderRequest = z.infer<typeof UpdateFolderRequestSchema>
export type FileRecord = z.infer<typeof FileRecordSchema>
export type UpdateFileRequest = z.infer<typeof UpdateFileRequestSchema>
export type FileVersion = z.infer<typeof FileVersionSchema>
export type ChunkRecord = z.infer<typeof ChunkRecordSchema>
export type Finding = z.infer<typeof FindingSchema>
export type FileFindingsResponse = z.infer<typeof FileFindingsResponseSchema>
export type UpdateFindingRequest = z.infer<typeof UpdateFindingRequestSchema>
export type CompleteUploadResponse = z.infer<typeof CompleteUploadResponseSchema>
export type ShareRecord = z.infer<typeof ShareRecordSchema>
export type CreateShareRequest = z.infer<typeof CreateShareRequestSchema>
export type CreateShareResponse = z.infer<typeof CreateShareResponseSchema>
export type PublicShareInfoResponse = z.infer<typeof PublicShareInfoResponseSchema>
export type UnlockShareRequest = z.infer<typeof UnlockShareRequestSchema>
export type UnlockShareResponse = z.infer<typeof UnlockShareResponseSchema>
export type ExposureRisk = z.infer<typeof ExposureRiskSchema>
export type ExposureSummaryResponse = z.infer<typeof ExposureSummaryResponseSchema>
export type AuditEvent = z.infer<typeof AuditEventSchema>
export type AiLogEntry = z.infer<typeof AiLogEntrySchema>
export type AiLogListResponse = z.infer<typeof AiLogListResponseSchema>
export type Canary = z.infer<typeof CanarySchema>
export type CanaryTrigger = z.infer<typeof CanaryTriggerSchema>
export type CreateCanaryRequest = z.infer<typeof CreateCanaryRequestSchema>
export type UpdateCanaryRequest = z.infer<typeof UpdateCanaryRequestSchema>
export type CanaryListResponse = z.infer<typeof CanaryListResponseSchema>
export type AskFilesRequest = z.infer<typeof AskFilesRequestSchema>
export type AskCitation = z.infer<typeof AskCitationSchema>
export type AskFilesResponse = z.infer<typeof AskFilesResponseSchema>
export type ExportManifestResponse = z.infer<typeof ExportManifestResponseSchema>
export type RequestUploadUrlRequest = z.infer<typeof RequestUploadUrlRequestSchema>
export type RequestUploadUrlResponse = z.infer<typeof RequestUploadUrlResponseSchema>
export type DownloadUrlResponse = z.infer<typeof DownloadUrlResponseSchema>
