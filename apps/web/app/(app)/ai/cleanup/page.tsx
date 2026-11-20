"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Icon,
  PageHead,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { formatBytes } from "@/lib/format"
import {
  type FileData,
  unwrapApi,
  useFiles,
  useInvalidateDrive,
  useMe,
  useShares,
} from "@/lib/queries"

interface CleanupSuggestion {
  id: string
  kind: "duplicate" | "never_expires" | "blocked"
  title: string
  reason: string
  reclaimBytes: number
  actionLabel: string
  fileId?: string
  shareId?: string
}

export default function CleanupPage() {
  const { data: me } = useMe()
  const { data: files = [], isLoading } = useFiles({ trashed: false })
  const { data: shares = [] } = useShares()
  const invalidate = useInvalidateDrive()

  const [dismissedIds, setDismissedIds] = React.useState<string[]>([])
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const notify = React.useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(msg)
    timerRef.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const breakdown = React.useMemo(() => {
    let video = 0
    let images = 0
    let docs = 0
    let other = 0
    for (const f of files) {
      const m = f.mime.toLowerCase()
      if (m.startsWith("video/")) video += f.size
      else if (m.startsWith("image/")) images += f.size
      else if (
        m.includes("pdf") ||
        m.startsWith("text/") ||
        m.includes("document") ||
        m.includes("sheet")
      ) {
        docs += f.size
      } else {
        other += f.size
      }
    }
    const total = Math.max(1, video + images + docs + other)
    return {
      videoPct: Math.round((video / total) * 100),
      imagesPct: Math.round((images / total) * 100),
      docsPct: Math.round((docs / total) * 100),
      otherPct: Math.round((other / total) * 100),
    }
  }, [files])

  const suggestions = React.useMemo<CleanupSuggestion[]>(() => {
    const list: CleanupSuggestion[] = []
    const byHash = new Map<string, FileData[]>()
    for (const f of files) {
      if (f.sha256) {
        const arr = byHash.get(f.sha256) ?? []
        arr.push(f)
        byHash.set(f.sha256, arr)
      }
      if (f.scanStatus === "blocked") {
        list.push({
          id: `blocked-${f.id}`,
          kind: "blocked",
          title: `Quarantined file: ${f.name}`,
          reason: "Blocked during security scan. Safe to move to Trash.",
          reclaimBytes: f.size,
          actionLabel: "Move to Trash",
          fileId: f.id,
        })
      }
    }

    for (const [, group] of byHash) {
      if (group.length > 1) {
        const sorted = [...group].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        )
        const original = sorted[0]!
        for (const dup of sorted.slice(1)) {
          list.push({
            id: `dup-${dup.id}`,
            kind: "duplicate",
            title: `Duplicate file: ${dup.name}`,
            reason: `Identical SHA-256 content hash to ${original.name}.`,
            reclaimBytes: dup.size,
            actionLabel: "Trash duplicate",
            fileId: dup.id,
          })
        }
      }
    }

    for (const s of shares) {
      if (!s.revokedAt && s.expiresAt === null) {
        list.push({
          id: `share-${s.id}`,
          kind: "never_expires",
          title: `Permanent share link: ${s.fileName}`,
          reason:
            s.audience === "anyone"
              ? "Public link has no expiry date."
              : "Shared link never expires automatically.",
          reclaimBytes: 0,
          actionLabel: "Revoke link",
          shareId: s.id,
        })
      }
    }

    return list.filter((item) => !dismissedIds.includes(item.id))
  }, [dismissedIds, files, shares])

  const reclaimableBytes = suggestions.reduce(
    (sum, item) => sum + item.reclaimBytes,
    0
  )

  const handleApply = async (item: CleanupSuggestion) => {
    setBusyId(item.id)
    try {
      if (item.fileId) {
        unwrapApi(
          await glashusApi.PATCH("/v1/files/{id}", {
            params: { path: { id: item.fileId } },
            body: { trashed: true },
          })
        )
        notify(`Moved file to Trash`)
      } else if (item.shareId) {
        unwrapApi(
          await glashusApi.DELETE("/v1/shares/{id}", {
            params: { path: { id: item.shareId } },
          })
        )
        notify(`Revoked permanent share link`)
      }
      invalidate()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setBusyId(null)
    }
  }

  const user = me?.user
  const usedBytes = user?.bytesUsed ?? 0
  const quotaBytes = user?.storageQuotaBytes ?? 10 * 1024 * 1024 * 1024

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <AppSidebar active="cleanup" />
      <main className="main">
        <PageHead
          title="Cleanup"
          sub="Live duplicate detection, blocked uploads, and unbounded share links. Nothing runs without your click."
          cta="Trash"
          ctaIcon="trash"
          ctaHref="/drive/trash"
        />

        <div className="glass card col" style={{ gap: 14 }}>
          <div className="row between wrap" style={{ gap: 8 }}>
            <h2 className="h2">
              {formatBytes(usedBytes)} of {formatBytes(quotaBytes)} used
            </h2>
            <span className="sm muted">
              {formatBytes(reclaimableBytes)} reclaimable from{" "}
              {suggestions.length} item(s)
            </span>
          </div>
          <div className="bar" style={{ height: 12, display: "flex" }}>
            <i
              style={{
                width: `${breakdown.videoPct}%`,
                background: "var(--ink)",
                display: "block",
                height: "100%",
              }}
            />
            <i
              style={{
                width: `${breakdown.imagesPct}%`,
                background: "var(--accent)",
                display: "block",
                height: "100%",
              }}
            />
            <i
              style={{
                width: `${breakdown.docsPct}%`,
                background: "rgba(17,17,17,0.45)",
                display: "block",
                height: "100%",
              }}
            />
            <i
              style={{
                width: `${breakdown.otherPct}%`,
                background: "rgba(17,17,17,0.18)",
                display: "block",
                height: "100%",
              }}
            />
          </div>
          <div className="row wrap xs muted" style={{ gap: 18 }}>
            <span>Video {breakdown.videoPct}%</span>
            <span>Images {breakdown.imagesPct}%</span>
            <span>Documents {breakdown.docsPct}%</span>
            <span>Other {breakdown.otherPct}%</span>
          </div>
        </div>

        {isLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Analyzing Drive usage…</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div
            className="glass card col center"
            style={{ padding: "36px 24px", gap: 10 }}
          >
            <div className="tile n">
              <Icon glyph="check" size={20} />
            </div>
            <span className="m">Your Drive looks tidy</span>
            <span className="sm muted">
              No duplicate files, blocked uploads, or unbounded links found.
            </span>
            {dismissedIds.length > 0 ? (
              <Button
                label="Show dismissed items"
                variant="secondary"
                size="sm"
                icon="rotate"
                onClick={() => setDismissedIds([])}
              />
            ) : null}
          </div>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            {suggestions.map((item) => (
              <div
                key={item.id}
                className="glass card row wrap between"
                style={{ gap: 14 }}
              >
                <div className="col" style={{ gap: 4, flex: "1 1 280px" }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <span className="m">{item.title}</span>
                    {item.reclaimBytes > 0 ? (
                      <Chip
                        label={formatBytes(item.reclaimBytes)}
                        tone="clear"
                      />
                    ) : (
                      <Chip label="Exposure hygiene" tone="accent" />
                    )}
                  </div>
                  <span className="sm muted">{item.reason}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button
                    label="Dismiss"
                    size="sm"
                    variant="ghost"
                    disabled={busyId !== null}
                    onClick={() =>
                      setDismissedIds((prev) => [...prev, item.id])
                    }
                  />
                  <Button
                    label={busyId === item.id ? "Applying…" : item.actionLabel}
                    size="sm"
                    variant={item.kind === "duplicate" ? "secondary" : "danger"}
                    disabled={busyId !== null}
                    onClick={() => void handleApply(item)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {toast ? (
          <div className="toast">
            <Icon glyph="check" size={14} /> {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}
