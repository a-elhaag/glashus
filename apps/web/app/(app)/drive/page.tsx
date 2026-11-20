"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  PageHead,
  Seg,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/components/providers"
import { glashusApi } from "@/lib/api"
import {
  exposureToUi,
  extractExt,
  formatBytes,
  formatShortDate,
} from "@/lib/format"
import {
  unwrapApi,
  useExposure,
  useFiles,
  useInvalidateDrive,
  useMe,
} from "@/lib/queries"

export default function DriveHomePage() {
  const { user } = useAuth()
  const meQuery = useMe()
  const exposureQuery = useExposure()
  const filesQuery = useFiles({ trashed: false })
  const invalidateDrive = useInvalidateDrive()

  const [filter, setFilter] = React.useState<"All" | "Shared" | "Flagged">("All")
  const [search, setSearch] = React.useState("")
  const [fixingId, setFixingId] = React.useState<string | null>(null)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = React.useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastMsg(msg)
    timerRef.current = setTimeout(() => setToastMsg(null), 4000)
  }, [])

  const handleFixRisk = async (
    riskId: string,
    shareId: string | null,
    title: string
  ) => {
    if (!shareId) return
    setFixingId(riskId)
    try {
      unwrapApi(
        await glashusApi.DELETE("/v1/shares/{id}", {
          params: { path: { id: shareId } },
        })
      )
      invalidateDrive()
      showToast(`Resolved: ${title}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not resolve risk")
    } finally {
      setFixingId(null)
    }
  }

  const displayName =
    meQuery.data?.user.name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "there"
  const score = exposureQuery.data?.score ?? 100
  const publicLinks = exposureQuery.data?.publicLinks ?? 0
  const sensitiveFindings = exposureQuery.data?.sensitiveFindings ?? 0
  const armedCanaries = exposureQuery.data?.armedCanaries ?? 0
  const risks = exposureQuery.data?.risks ?? []

  const files = React.useMemo(() => filesQuery.data ?? [], [filesQuery.data])
  const filteredFiles = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return files.filter((f) => {
      const isShared = f.exposure !== "private"
      const isFlagged = f.findingCount > 0 || f.scanStatus === "blocked"
      if (filter === "Shared" && !isShared) return false
      if (filter === "Flagged" && !isFlagged) return false
      if (query) {
        const hay = `${f.name} ${f.exposure} ${f.scanStatus}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })
  }, [files, filter, search])

  const scoreLine =
    risks.length === 0
      ? "All clear. Nothing is exposed beyond the people you chose."
      : `${risks.length} ${risks.length === 1 ? "thing needs" : "things need"} your attention.`

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="drive" />
      <main className="main">
        <PageHead
          title={`Welcome, ${displayName}`}
          sub="Here is who can see your files right now."
          cta="Upload"
          ctaIcon="upload"
          ctaHref="/drive/upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <section
          aria-label="Exposure overview"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          <div className="glass card col" style={{ padding: 24, gap: 18 }}>
            <div className="sm m muted">Exposure score</div>
            <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontSize: 68,
                  fontWeight: 600,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                }}
              >
                {score}
              </span>
              <span style={{ fontSize: 18 }} className="muted">
                / 100
              </span>
            </div>
            <div className="bar" style={{ display: "flex" }}>
              <i
                style={{
                  width: `${score}%`,
                  transition: "width 280ms ease-out",
                }}
              />
              <i
                style={{
                  width: `${100 - score}%`,
                  background: "var(--accent)",
                  transition: "width 280ms ease-out",
                }}
              />
            </div>
            <p className="p">{scoreLine}</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                paddingTop: 14,
                borderTop: "1px solid rgba(17,17,17,0.07)",
              }}
            >
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>
                  {publicLinks}
                </span>
                <span className="xs muted">Public links</span>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>
                  {sensitiveFindings}
                </span>
                <span className="xs muted">Sensitive finds</span>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>
                  {armedCanaries}
                </span>
                <span className="xs muted">Canaries armed</span>
              </div>
            </div>
          </div>

          <div
            className="glass card pad0 col"
            style={{
              gridColumn: "span 2",
              minWidth: 0,
              gap: 0,
              borderRadius: 20,
            }}
          >
            <div className="row between" style={{ padding: "14px 16px 10px" }}>
              <span className="row sm m muted" style={{ gap: 8 }}>
                <span
                  className="dot"
                  style={{ color: "var(--accent)", width: 7, height: 7 }}
                  aria-hidden="true"
                />
                Needs attention
              </span>
              <Link href="/ai/activity" className="sm muted">
                View all
              </Link>
            </div>

            {risks.map((r) => (
              <div
                key={r.id}
                className="glass-soft row wrap"
                style={{
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: 16,
                  margin: "4px 8px",
                }}
              >
                <div className="tile">
                  <Icon glyph="warn" size={18} />
                </div>
                <div className="grow col" style={{ flex: "1 1 260px", gap: 3 }}>
                  <span className="m">{r.title}</span>
                  <span className="sm muted">{r.detail}</span>
                </div>
                <Button
                  label={fixingId === r.id ? "Fixing…" : r.actionLabel}
                  variant="primary"
                  size="sm"
                  disabled={fixingId === r.id || !r.shareId}
                  onClick={() =>
                    void handleFixRisk(r.id, r.shareId, r.title)
                  }
                />
              </div>
            ))}

            {risks.length === 0 ? (
              <div
                className="col center"
                style={{ padding: "40px 16px", gap: 6 }}
              >
                <span className="h2">Nothing exposed.</span>
                <span className="muted">Your glass is clear.</span>
              </div>
            ) : null}
          </div>
        </section>

        <section aria-label="Files" className="col" style={{ gap: 12 }}>
          <div className="row wrap between">
            <h2 className="h2">Recent files</h2>
            <Seg
              options="All|Shared|Flagged"
              value={filter}
              onChange={(val) => {
                if (val === "All" || val === "Shared" || val === "Flagged") {
                  setFilter(val)
                }
              }}
              aria-label="Filter recent files"
            />
          </div>

          <div
            className="glass"
            style={{ overflowX: "auto", borderRadius: 20 }}
          >
            <div style={{ minWidth: 760 }}>
              <div
                className="thead"
                style={{
                  gridTemplateColumns: "2.4fr 1.3fr 1.6fr 1fr 0.7fr 40px",
                }}
              >
                <span>Name</span>
                <span>Visibility</span>
                <span>Findings</span>
                <span>Modified</span>
                <span>Size</span>
                <span />
              </div>

              {filesQuery.isLoading ? (
                <div className="col center muted" style={{ padding: "36px 20px" }}>
                  <span className="sm">Loading your files…</span>
                </div>
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map((f) => {
                  const vis = exposureToUi(f.exposure)
                  const flagged = f.findingCount > 0 || f.scanStatus === "blocked"
                  const findingsText =
                    f.scanStatus === "blocked"
                      ? "Blocked in quarantine"
                      : f.scanStatus === "quarantined"
                        ? "Scanning…"
                        : f.findingCount > 0
                          ? `${f.findingCount} masked finding${f.findingCount === 1 ? "" : "s"}`
                          : f.hasRedactedCopy
                            ? "Redacted copy ready"
                            : "None"

                  return (
                    <div
                      key={f.id}
                      className="trow"
                      style={{
                        gridTemplateColumns:
                          "2.4fr 1.3fr 1.6fr 1fr 0.7fr 40px",
                      }}
                    >
                      <div className="row" style={{ minWidth: 0 }}>
                        <FileTile
                          ext={extractExt(f.name)}
                          tone={vis.tileTone}
                          size={36}
                        />
                        <Link
                          href={`/viewer?fileId=${encodeURIComponent(f.id)}`}
                          className="ell m"
                        >
                          {f.name}
                        </Link>
                      </div>
                      <div>
                        <Chip label={vis.label} tone={vis.visTone} />
                      </div>
                      <span
                        className="sm"
                        style={{
                          color: flagged ? "var(--accent)" : "var(--ink3)",
                          fontWeight: flagged ? 500 : 400,
                        }}
                      >
                        {findingsText}
                      </span>
                      <span className="sm muted">
                        {formatShortDate(f.updatedAt)}
                      </span>
                      <span className="sm muted">{formatBytes(f.size)}</span>
                      <Button
                        label="Share"
                        variant="ghost"
                        size="sm"
                        icon="share"
                        iconOnly
                        href={`/sharing/share?fileId=${encodeURIComponent(f.id)}`}
                      />
                    </div>
                  )
                })
              ) : (
                <div
                  className="col center muted"
                  style={{ padding: "40px 20px", gap: 10 }}
                >
                  <span className="sm m">
                    {files.length === 0
                      ? "No files in your drive yet."
                      : "No files match this filter."}
                  </span>
                  <span className="xs muted">
                    {files.length === 0
                      ? "Upload a file to run quarantine malware and PII scanning."
                      : "Switch tabs or clear the search box to see all files."}
                  </span>
                  {files.length === 0 ? (
                    <Button
                      label="Upload your first file"
                      variant="primary"
                      size="sm"
                      icon="upload"
                      href="/drive/upload"
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        {toastMsg ? (
          <div role="status" aria-live="polite" className="toast">
            <span>{toastMsg}</span>
          </div>
        ) : null}
      </main>
    </div>
  )
}
