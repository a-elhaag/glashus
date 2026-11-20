export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let val = bytes
  let idx = 0
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024
    idx += 1
  }
  const decimals = idx === 0 ? 0 : val >= 10 || idx === 1 ? 0 : 1
  return `${val.toFixed(decimals)} ${units[idx]}`
}

export function extractExt(filename: string): string {
  const parts = filename.split(".")
  const raw = parts.length > 1 ? parts[parts.length - 1] : "FILE"
  return (raw ?? "FILE").slice(0, 4).toUpperCase()
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Recently"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function formatTimeOrDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Recently"
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  return formatShortDate(iso)
}

export function getDayBucket(iso: string): "Today" | "Yesterday" | "Earlier" {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Earlier"
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return "Today"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return "Earlier"
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

export function exposureToUi(exposure: "private" | "shared" | "link" | "public"): {
  label: string
  visTone: "clear" | "neutral" | "accent"
  tileTone: 0 | 1 | 2
} {
  if (exposure === "public") {
    return { label: "Public", visTone: "accent", tileTone: 2 }
  }
  if (exposure === "link") {
    return { label: "Link", visTone: "neutral", tileTone: 1 }
  }
  if (exposure === "shared") {
    return { label: "Shared", visTone: "neutral", tileTone: 1 }
  }
  return { label: "Private", visTone: "clear", tileTone: 0 }
}
