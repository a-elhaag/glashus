"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  Chip,
  FileTile,
  PageHead,
  Seg,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import {
  daysUntil,
  extractExt,
  formatBytes,
  formatShortDate,
} from "@/lib/format"
import {
  type ShareData,
  unwrapApi,
  useInvalidateDrive,
  useShares,
} from "@/lib/queries"

type TabLabel = "All" | "Public" | "People" | "Expiring"

function isExpiringSoon(share: ShareData): boolean {
  if (!share.expiresAt) return false
  const ms = new Date(share.expiresAt).getTime() - Date.now()
  return ms <= 48 * 60 * 60 * 1000
}

export default function SharingPage() {
  const { data: shares = [], isLoading, error } = useShares()
  const invalidate = useInvalidateDrive()

  const [tab, setTab] = React.useState<TabLabel>("All")
  const [search, setSearch] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [revokingAll, setRevokingAll] = React.useState(false)
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

  const activeShares = React.useMemo(
    () => shares.filter((s) => !s.revokedAt),
    [shares]
  )

  const stats = React.useMemo(() => {
    const publicCount = activeShares.filter((s) => s.audience === "anyone").length
    const expiringCount = activeShares.filter(isExpiringSoon).length
    const neverExpireCount = activeShares.filter((s) => s.expiresAt === null).length
    const downloads = activeShares.reduce((sum, s) => sum + s.downloads, 0)
    return {
      total: activeShares.length,
      publicCount,
      expiringCount,
      neverExpireCount,
      downloads,
    }
  }, [activeShares])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return activeShares.filter((s) => {
      if (tab === "Public" && s.audience !== "anyone") return false
      if (tab === "People" && s.audience !== "specific_people") return false
      if (tab === "Expiring" && !isExpiringSoon(s)) return false
      if (q) {
        const hay = `${s.fileName} ${s.recipientEmail ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [activeShares, search, tab])

  const copyShareLink = async (shareId: string, fileName: string) => {
    const url = `${window.location.origin}/sharing/recipient?shareId=${encodeURIComponent(shareId)}`
    try {
      await navigator.clipboard.writeText(url)
      notify(`Copied share link for ${fileName}`)
    } catch {
      notify(url)
    }
  }

  const revokeOne = async (share: ShareData) => {
    setPendingId(share.id)
    try {
      unwrapApi(
        await glashusApi.DELETE("/v1/shares/{id}", {
          params: { path: { id: share.id } },
        })
      )
      invalidate()
      notify(`Revoked link for ${share.fileName}`)
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not revoke link.")
    } finally {
      setPendingId(null)
    }
  }

  const revokeAllPublic = async () => {
    setRevokingAll(true)
    try {
      const res = unwrapApi(await glashusApi.POST("/v1/shares/revoke-public"))
      invalidate()
      notify(
        `Revoked ${res.revokedCount} public link${res.revokedCount === 1 ? "" : "s"}`
      )
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not revoke public links."
      )
    } finally {
      setRevokingAll(false)
    }
  }

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="shared" />
      <main className="main">
        <PageHead
          title="Shared by me"
          sub="Every active share link across your drive, its PIN lock, expiry, and download count."
          cta="New share"
          ctaIcon="share"
          ctaHref="/sharing/share"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <section
          aria-label="Share overview"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
          }}
        >
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">ACTIVE SHARES</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>{stats.total}</span>
            <span className="xs muted">
              {stats.publicCount} public · {stats.total - stats.publicCount} people
            </span>
          </div>
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">EXPIRING &lt;48H</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>
              {stats.expiringCount}
            </span>
            <span className="xs muted">Auto-revoked on expiry</span>
          </div>
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">NEVER EXPIRE</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>
              {stats.neverExpireCount}
            </span>
            <span className="xs muted">
              {stats.neverExpireCount > 0 ? "Review recommended" : "All bounded"}
            </span>
          </div>
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">TOTAL DOWNLOADS</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>
              {stats.downloads}
            </span>
            <span className="xs muted">60 s signed URLs issued</span>
          </div>
        </section>

        <section aria-label="Share links" className="col" style={{ gap: 12 }}>
          <div className="row wrap between" style={{ gap: 10 }}>
            <Seg
              options="All|Public|People|Expiring"
              value={tab}
              onChange={(val) => {
                if (
                  val === "All" ||
                  val === "Public" ||
                  val === "People" ||
                  val === "Expiring"
                ) {
                  setTab(val)
                }
              }}
              aria-label="Filter active shares"
            />
            <Button
              label={
                revokingAll
                  ? "Revoking…"
                  : `Revoke all public (${stats.publicCount})`
              }
              icon="x"
              variant="danger"
              size="sm"
              disabled={revokingAll || stats.publicCount === 0}
              onClick={() => void revokeAllPublic()}
            />
          </div>

          <div
            className="glass"
            style={{ overflowX: "auto", borderRadius: 20 }}
          >
            <div style={{ minWidth: 780 }}>
              <div
                className="thead"
                style={{
                  gridTemplateColumns:
                    "minmax(0,2.2fr) 1.3fr 1fr 0.9fr 210px",
                }}
              >
                <span>File</span>
                <span>Audience</span>
                <span>Expiry</span>
                <span>Downloads</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </div>

              {isLoading ? (
                <div className="col center muted" style={{ padding: "36px 20px" }}>
                  <span className="sm">Loading active share links…</span>
                </div>
              ) : error ? (
                <div
                  className="col center"
                  style={{ padding: "36px 20px", color: "var(--accent)" }}
                >
                  <span className="sm">
                    {error instanceof Error
                      ? error.message
                      : "Failed to load shares."}
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="col center"
                  style={{ padding: "40px 20px", gap: 6 }}
                >
                  <span className="h2">No matching share links</span>
                  <span className="sm muted">
                    Create a share link from any clean file in your Drive.
                  </span>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      label="New share"
                      variant="primary"
                      size="sm"
                      href="/sharing/share"
                    />
                  </div>
                </div>
              ) : (
                filtered.map((s) => {
                  const days = daysUntil(s.expiresAt)
                  const soon = isExpiringSoon(s)
                  return (
                    <div
                      key={s.id}
                      className="trow"
                      style={{
                        gridTemplateColumns:
                          "minmax(0,2.2fr) 1.3fr 1fr 0.9fr 210px",
                      }}
                    >
                      <div className="row" style={{ gap: 10, minWidth: 0 }}>
                        <FileTile
                          ext={extractExt(s.fileName)}
                          tone={s.audience === "anyone" ? 2 : 1}
                          size={36}
                        />
                        <div className="col" style={{ minWidth: 0, gap: 2 }}>
                          <Link
                            href={`/viewer?fileId=${encodeURIComponent(s.fileId)}`}
                            className="ell m"
                          >
                            {s.fileName}
                          </Link>
                          <div className="row" style={{ gap: 6 }}>
                            <span className="xs muted">
                              {formatBytes(s.fileSize)} ·{" "}
                              {s.redacted ? "Redacted copy" : "Original"}
                            </span>
                            {s.hasPin ? (
                              <Chip label="PIN" tone="clear" />
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Chip
                          label={
                            s.audience === "anyone"
                              ? "Anyone with link"
                              : s.recipientEmail || "Specific person"
                          }
                          tone={s.audience === "anyone" ? "accent" : "neutral"}
                        />
                      </div>

                      <div>
                        {s.expiresAt === null ? (
                          <Chip label="Never expires" tone="accent" />
                        ) : (
                          <div className="col" style={{ gap: 2 }}>
                            <span className="sm m">
                              {days === 0 ? "Today" : `${days}d left`}
                            </span>
                            <span className="xs muted">
                              {soon ? "Soon · " : ""}
                              {formatShortDate(s.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="sm">
                        <span className="m">{s.downloads}</span>
                        <span className="muted">
                          {s.maxDownloads !== null
                            ? ` / ${s.maxDownloads}`
                            : " / ∞"}
                        </span>
                      </div>

                      <div
                        className="row"
                        style={{ justifyContent: "flex-end", gap: 6 }}
                      >
                        <Button
                          label="Copy"
                          size="sm"
                          variant="ghost"
                          onClick={() => void copyShareLink(s.id, s.fileName)}
                        />
                        <Button
                          label="Open"
                          size="sm"
                          variant="ghost"
                          href={`/sharing/recipient?shareId=${encodeURIComponent(s.id)}`}
                        />
                        <Button
                          label={pendingId === s.id ? "…" : "Revoke"}
                          size="sm"
                          variant="danger"
                          disabled={pendingId === s.id}
                          onClick={() => void revokeOne(s)}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {toast ? <div className="toast">{toast}</div> : null}
      </main>
    </div>
  )
}
