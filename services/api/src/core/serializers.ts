import type { DocumentData } from "firebase-admin/firestore"
import {
  FREE_STORAGE_QUOTA_BYTES,
  type FileRecord,
  type Finding,
  type Folder,
  type ShareRecord,
  type UserProfile,
} from "@workspace/schema"

export function toUserProfile(
  uid: string,
  data: DocumentData | undefined,
  fallbackEmail = "",
  fallbackName = ""
): UserProfile {
  const now = new Date().toISOString()
  const plan =
    data?.plan === "plus_10gb" || data?.plan === "plus_100gb"
      ? data.plan
      : "free"
  const aiMode =
    data?.aiMode === "ask" || data?.aiMode === "allow" ? data.aiMode : "off"

  return {
    uid,
    name: typeof data?.name === "string" ? data.name : fallbackName,
    email: typeof data?.email === "string" ? data.email : fallbackEmail,
    alertEmail:
      typeof data?.alertEmail === "string"
        ? data.alertEmail
        : typeof data?.email === "string"
          ? data.email
          : fallbackEmail,
    plan,
    bytesUsed: typeof data?.bytesUsed === "number" ? data.bytesUsed : 0,
    storageQuotaBytes: FREE_STORAGE_QUOTA_BYTES,
    aiMode,
    massAlerts:
      typeof data?.massAlerts === "boolean" ? data.massAlerts : true,
    canaryAlerts:
      typeof data?.canaryAlerts === "boolean" ? data.canaryAlerts : true,
    weeklySummary:
      typeof data?.weeklySummary === "boolean" ? data.weeklySummary : false,
    requirePinOnPublic:
      typeof data?.requirePinOnPublic === "boolean"
        ? data.requirePinOnPublic
        : true,
    defaultExpiryDays:
      typeof data?.defaultExpiryDays === "number" && data.defaultExpiryDays > 0
        ? data.defaultExpiryDays
        : 7,
    vaultHint: typeof data?.vaultHint === "string" ? data.vaultHint : "",
    createdAt: typeof data?.createdAt === "string" ? data.createdAt : now,
  }
}

export function toFolder(id: string, data: DocumentData): Folder {
  const now = new Date().toISOString()
  return {
    id,
    name: String(data.name ?? "Untitled"),
    parentId: typeof data.parentId === "string" ? data.parentId : null,
    aiConsent:
      data.aiConsent === "ask" || data.aiConsent === "allow"
        ? data.aiConsent
        : "off",
    vault: Boolean(data.vault),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
  }
}

export function toFileRecord(id: string, data: DocumentData): FileRecord {
  const now = new Date().toISOString()
  return {
    id,
    name: String(data.name ?? "untitled"),
    folderId: typeof data.folderId === "string" ? data.folderId : null,
    mime: String(data.mime ?? "application/octet-stream"),
    size: typeof data.size === "number" ? data.size : 0,
    currentVersion:
      typeof data.currentVersion === "number" ? data.currentVersion : 1,
    scanStatus:
      data.scanStatus === "clean" || data.scanStatus === "blocked"
        ? data.scanStatus
        : "quarantined",
    exposure:
      data.exposure === "shared" ||
      data.exposure === "link" ||
      data.exposure === "public"
        ? data.exposure
        : "private",
    findingCount: typeof data.findingCount === "number" ? data.findingCount : 0,
    originalBlocked: Boolean(data.originalBlocked),
    hasRedactedCopy: Boolean(data.hasRedactedCopy),
    trashedAt: typeof data.trashedAt === "string" ? data.trashedAt : null,
    purgeAt: typeof data.purgeAt === "string" ? data.purgeAt : null,
    sha256: typeof data.sha256 === "string" ? data.sha256 : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
  }
}

export function toFinding(id: string, data: DocumentData): Finding {
  return {
    id,
    type: String(data.type ?? "Sensitive value"),
    location: String(data.location ?? "Document"),
    maskedValue: String(data.maskedValue ?? "••••••••"),
    detector:
      data.detector === "dlp" || data.detector === "entropy"
        ? data.detector
        : "regex",
    safe: Boolean(data.safe),
  }
}

export function toShareRecord(id: string, data: DocumentData): ShareRecord {
  const now = new Date().toISOString()
  return {
    id,
    fileId: String(data.fileId ?? ""),
    fileName: String(data.fileName ?? "Shared file"),
    fileMime: String(data.fileMime ?? "application/octet-stream"),
    fileSize: typeof data.fileSize === "number" ? data.fileSize : 0,
    ownerUid: String(data.ownerUid ?? ""),
    audience: data.audience === "specific_people" ? "specific_people" : "anyone",
    recipientEmail:
      typeof data.recipientEmail === "string" ? data.recipientEmail : null,
    expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : null,
    maxDownloads:
      typeof data.maxDownloads === "number" ? data.maxDownloads : null,
    downloads: typeof data.downloads === "number" ? data.downloads : 0,
    hasPin: Boolean(data.hasPin),
    redacted: Boolean(data.redacted),
    revokedAt: typeof data.revokedAt === "string" ? data.revokedAt : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
  }
}
