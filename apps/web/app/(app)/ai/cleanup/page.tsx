"use client"

import * as React from "react"
import {
  Button,
  FileTile,
  Icon,
  PageHead,
  Sidebar,
} from "@workspace/ui/components/glashus"

interface CleanupItem {
  id: string
  ext: string
  name: string
  why: string
  sizeLabel: string
  sizeGb: number
  actionLabel: string
  actionVariant: "primary" | "secondary"
  actionIcon: "trash" | "link"
  reclaimsStorage: boolean
  toastText: string
}

const INITIAL_SUGGESTIONS: CleanupItem[] = [
  {
    id: "dup-backup",
    ext: "ZIP",
    name: "backup-2025.zip and backup-2025 (1).zip",
    why: "Why: Same content, same checksum. One copy is enough.",
    sizeLabel: "412 MB",
    sizeGb: 0.412,
    actionLabel: "Move 1 to trash",
    actionVariant: "secondary",
    actionIcon: "trash",
    reclaimsStorage: true,
    toastText: "Moved 1 copy to trash (412 MB reclaimed)",
  },
  {
    id: "stale-recording",
    ext: "MP4",
    name: "screen-recording-march.mp4",
    why: "Why: Not opened in 14 months, shared with nobody.",
    sizeLabel: "640 MB",
    sizeGb: 0.64,
    actionLabel: "Move to trash",
    actionVariant: "secondary",
    actionIcon: "trash",
    reclaimsStorage: true,
    toastText: "Moved screen-recording-march.mp4 to trash",
  },
  {
    id: "old-lease",
    ext: "PDF",
    name: "old-lease-2019.pdf",
    why: "Why: Not opened in 3 years. A public link still works.",
    sizeLabel: "2 MB",
    sizeGb: 0.002,
    actionLabel: "Expire link",
    actionVariant: "primary",
    actionIcon: "link",
    reclaimsStorage: false,
    toastText: "Public link expired for old-lease-2019.pdf",
  },
]

export default function CleanupPage() {
  const [resolvedIds, setResolvedIds] = React.useState<string[]>([])
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([])
  const [toast, setToast] = React.useState<{
    message: string
    undo?: () => void
  } | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function showToast(message: string, undo?: () => void) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, undo })
    timerRef.current = setTimeout(() => setToast(null), 5000)
  }

  const visibleSuggestions = INITIAL_SUGGESTIONS.filter(
    (item) => !resolvedIds.includes(item.id) && !dismissedIds.includes(item.id)
  )

  const reclaimedGb = INITIAL_SUGGESTIONS.filter(
    (item) => resolvedIds.includes(item.id) && item.reclaimsStorage
  ).reduce((sum, item) => sum + item.sizeGb, 0)

  const remainingReclaimableGb = visibleSuggestions.reduce(
    (sum, item) => sum + item.sizeGb,
    0
  )

  const usedGb = Math.max(0, 3.2 - reclaimedGb)
  const reclaimableDisplay =
    remainingReclaimableGb >= 1
      ? `${remainingReclaimableGb.toFixed(1)} GB`
      : remainingReclaimableGb > 0
        ? `${Math.round(remainingReclaimableGb * 1000)} MB`
        : "0 MB"

  function handleAction(item: CleanupItem) {
    const prev = resolvedIds
    setResolvedIds((ids) => [...ids, item.id])
    showToast(item.toastText, () => {
      setResolvedIds(prev)
      setToast(null)
    })
  }

  function handleDismiss(item: CleanupItem) {
    const prev = dismissedIds
    setDismissedIds((ids) => [...ids, item.id])
    showToast(`Dismissed ${item.name}`, () => {
      setDismissedIds(prev)
      setToast(null)
    })
  }

  function handleResetAll() {
    setResolvedIds([])
    setDismissedIds([])
    setToast(null)
  }

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <Sidebar
        active="cleanup"
        storageText={`${usedGb.toFixed(1)} of 15 GB`}
        storagePercent={Math.round((usedGb / 15) * 100)}
      />
      <main className="main">
        <PageHead
          title="Cleanup"
          sub="Suggestions always say why. Nothing is deleted without a click."
          cta="none"
          ctaIcon="upload"
        />

        <div className="glass card col" style={{ gap: 14 }}>
          <div className="row between">
            <h2 className="h2">{usedGb.toFixed(1)} of 15 GB used</h2>
            <span className="sm muted">
              {reclaimableDisplay} can be reclaimed
            </span>
          </div>
          <div className="bar" style={{ height: 12, display: "flex" }}>
            <i
              style={{
                width: "40%",
                background: "var(--ink)",
                display: "block",
                height: "100%",
              }}
            />
            <i
              style={{
                width: "28%",
                background: "var(--accent)",
                display: "block",
                height: "100%",
              }}
            />
            <i
              style={{
                width: "18%",
                background: "rgba(17,17,17,0.45)",
                display: "block",
                height: "100%",
              }}
            />
            <i
              style={{
                width: "14%",
                background: "rgba(17,17,17,0.18)",
                display: "block",
                height: "100%",
              }}
            />
          </div>
          <div className="row wrap xs muted" style={{ gap: 18 }}>
            <span>Video 40%</span>
            <span>Photos 28%</span>
            <span>Documents 18%</span>
            <span>Other 14%</span>
          </div>
        </div>

        {visibleSuggestions.length === 0 ? (
          <div
            className="glass card col center"
            style={{ padding: "36px 24px", gap: 10 }}
          >
            <div className="tile n">
              <Icon glyph="check" size={20} />
            </div>
            <span className="m">No cleanup suggestions left</span>
            <span className="sm muted">
              Every duplicate, stale file and old link has been handled or
              dismissed.
            </span>
            <Button
              label="Review suggestions again"
              variant="secondary"
              size="sm"
              icon="rotate"
              onClick={handleResetAll}
            />
          </div>
        ) : (
          visibleSuggestions.map((item) => (
            <div
              key={item.id}
              className="glass card row wrap"
              style={{ gap: 14, padding: "16px 20px" }}
            >
              <FileTile ext={item.ext} tone={0} size={40} />
              <div
                className="grow col"
                style={{ gap: 3, minWidth: 240 }}
              >
                <span className="m">{item.name}</span>
                <span className="sm muted">{item.why}</span>
              </div>
              <span className="sm muted">{item.sizeLabel}</span>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  label="Dismiss"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(item)}
                />
                <Button
                  label={item.actionLabel}
                  variant={item.actionVariant}
                  size="sm"
                  icon={item.actionIcon}
                  onClick={() => handleAction(item)}
                />
              </div>
            </div>
          ))
        )}
      </main>

      {toast ? (
        <div role="status" className="toast" style={{ position: "fixed" }}>
          <span>{toast.message}</span>
          {toast.undo ? (
            <Button
              label="Undo"
              variant="secondary"
              size="sm"
              onClick={toast.undo}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
