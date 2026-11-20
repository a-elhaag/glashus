"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  PageHead,
  Seg,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { extractExt, formatBytes, formatShortDate } from "@/lib/format"
import {
  type FileData,
  type FindingData,
  unwrapApi,
  useFiles,
  useInvalidateDrive,
} from "@/lib/queries"

function ScanReportInner() {
  const params = useSearchParams()
  const initialFileId = params.get("fileId")

  const { data: files = [], isLoading: filesLoading } = useFiles({
    trashed: false,
  })
  const invalidate = useInvalidateDrive()

  const orderedFiles = React.useMemo(() => {
    return [...files].sort((a, b) => {
      if (b.findingCount !== a.findingCount) {
        return b.findingCount - a.findingCount
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [files])

  const [selectedId, setSelectedId] = React.useState<string>(initialFileId ?? "")
  React.useEffect(() => {
    if (initialFileId) {
      setSelectedId(initialFileId)
      return
    }
    if (!selectedId && orderedFiles[0]) {
      setSelectedId(orderedFiles[0].id)
    }
  }, [initialFileId, orderedFiles, selectedId])

  const [search, setSearch] = React.useState("")
  const [viewMode, setViewMode] = React.useState<"Side by side" | "Redacted only">(
    "Side by side"
  )
  const [detailFile, setDetailFile] = React.useState<FileData | null>(null)
  const [findings, setFindings] = React.useState<FindingData[]>([])
  const [loadingFindings, setLoadingFindings] = React.useState(false)
  const [busyAction, setBusyAction] = React.useState<string | null>(null)
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

  const loadFindings = React.useCallback(async (fileId: string) => {
    setLoadingFindings(true)
    try {
      const res = unwrapApi(
        await glashusApi.GET("/v1/files/{id}/findings", {
          params: { path: { id: fileId } },
        })
      )
      setDetailFile(res.file)
      setFindings(res.findings)
    } catch (err) {
      setDetailFile(null)
      setFindings([])
      notify(err instanceof Error ? err.message : "Could not load scan report.")
    } finally {
      setLoadingFindings(false)
    }
  }, [notify])

  React.useEffect(() => {
    if (!selectedId) {
      setDetailFile(null)
      setFindings([])
      return
    }
    void loadFindings(selectedId)
  }, [loadFindings, selectedId])

  const selectedFile =
    detailFile ?? orderedFiles.find((f) => f.id === selectedId) ?? null

  const filteredList = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orderedFiles
    return orderedFiles.filter((f) => f.name.toLowerCase().includes(q))
  }, [orderedFiles, search])

  const activeFindings = React.useMemo(
    () => findings.filter((f) => !f.safe),
    [findings]
  )

  const toggleSafe = async (finding: FindingData) => {
    if (!selectedFile) return
    setBusyAction(finding.id)
    try {
      const updated = unwrapApi(
        await glashusApi.PATCH("/v1/files/{id}/findings/{findingId}", {
          params: { path: { id: selectedFile.id, findingId: finding.id } },
          body: { safe: !finding.safe },
        })
      )
      setFindings((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      )
      invalidate()
      notify(
        finding.safe
          ? `Restored finding ${finding.type}`
          : `Marked ${finding.type} as safe`
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update finding.")
    } finally {
      setBusyAction(null)
    }
  }

  const rescanFile = async () => {
    if (!selectedFile) return
    setBusyAction("rescan")
    try {
      const res = unwrapApi(
        await glashusApi.POST("/v1/files/{id}/rescan", {
          params: { path: { id: selectedFile.id } },
        })
      )
      setDetailFile(res.file)
      setFindings(res.findings)
      invalidate()
      notify(
        `Scan complete: ${res.findings.filter((f) => !f.safe).length} active finding(s)`
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Rescan failed.")
    } finally {
      setBusyAction(null)
    }
  }

  const toggleBlockOriginal = async () => {
    if (!selectedFile) return
    const next = !selectedFile.originalBlocked
    setBusyAction("block")
    try {
      const updated = unwrapApi(
        await glashusApi.PATCH("/v1/files/{id}", {
          params: { path: { id: selectedFile.id } },
          body: { originalBlocked: next },
        })
      )
      setDetailFile(updated)
      invalidate()
      notify(
        next
          ? `Original sharing blocked for ${updated.name}`
          : `Original sharing allowed for ${updated.name}`
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not update file policy.")
    } finally {
      setBusyAction(null)
    }
  }

  const createRedactedCopy = async () => {
    if (!selectedFile) return
    setBusyAction("redact")
    try {
      const created = unwrapApi(
        await glashusApi.POST("/v1/files/{id}/redacted-copy", {
          params: { path: { id: selectedFile.id } },
        })
      )
      invalidate()
      await loadFindings(selectedFile.id)
      notify(`Created redacted copy: ${created.name}`)
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not create redacted copy."
      )
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="scan" />
      <main className="main">
        <PageHead
          title="Scan report"
          sub="ClamAV + DLP inspection results. Raw sensitive tokens are masked at scan time and never persisted."
          cta="Upload"
          ctaIcon="upload"
          ctaHref="/drive/upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        {filesLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Loading scanned files…</span>
          </div>
        ) : orderedFiles.length === 0 ? (
          <div className="glass card col" style={{ padding: 28, gap: 10 }}>
            <span className="h2">No files scanned yet</span>
            <p className="p muted" style={{ margin: 0 }}>
              Upload a document to run malware and sensitive data inspection.
            </p>
            <div>
              <Button
                label="Upload a file"
                variant="primary"
                icon="upload"
                href="/drive/upload"
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(250px, 300px) minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <aside
              className="glass card pad0 col"
              style={{ borderRadius: 20, overflow: "hidden", gap: 0 }}
            >
              <div
                className="row between"
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <span className="sm m">Files ({filteredList.length})</span>
                <span className="xs muted">Flagged first</span>
              </div>
              <div className="col" style={{ gap: 2, padding: 8 }}>
                {filteredList.map((f) => {
                  const selected = f.id === selectedId
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className="row"
                      style={{
                        gap: 10,
                        padding: "10px 10px",
                        borderRadius: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        border: "none",
                        background: selected
                          ? "rgba(255,255,255,0.68)"
                          : "transparent",
                      }}
                    >
                      <FileTile
                        ext={extractExt(f.name)}
                        tone={f.findingCount > 0 ? 2 : 0}
                        size={32}
                      />
                      <div className="col grow" style={{ minWidth: 0, gap: 2 }}>
                        <span className="sm m ell">{f.name}</span>
                        <span className="xs muted">
                          {f.scanStatus === "blocked"
                            ? "Blocked"
                            : f.findingCount > 0
                              ? `${f.findingCount} finding${f.findingCount === 1 ? "" : "s"}`
                              : "Clean"}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            {selectedFile ? (
              <div className="col" style={{ gap: 16, minWidth: 0 }}>
                <section className="glass card col" style={{ gap: 14 }}>
                  <div className="row wrap between" style={{ gap: 12 }}>
                    <div className="row" style={{ gap: 12, minWidth: 0 }}>
                      <FileTile
                        ext={extractExt(selectedFile.name)}
                        tone={activeFindings.length > 0 ? 2 : 0}
                        size={42}
                      />
                      <div className="col" style={{ minWidth: 0, gap: 2 }}>
                        <span className="h2 ell">{selectedFile.name}</span>
                        <span className="xs muted">
                          {formatBytes(selectedFile.size)} · Updated{" "}
                          {formatShortDate(selectedFile.updatedAt)} · Status:{" "}
                          {selectedFile.scanStatus}
                        </span>
                      </div>
                    </div>

                    <div className="row wrap" style={{ gap: 8 }}>
                      <Chip
                        label={
                          activeFindings.length > 0
                            ? `${activeFindings.length} active findings`
                            : "Clear"
                        }
                        tone={activeFindings.length > 0 ? "accent" : "clear"}
                      />
                      <Button
                        label={
                          busyAction === "rescan" ? "Scanning…" : "Scan again"
                        }
                        size="sm"
                        icon="search"
                        disabled={busyAction !== null}
                        onClick={() => void rescanFile()}
                      />
                      <Button
                        label="Share"
                        size="sm"
                        variant="primary"
                        icon="share"
                        href={`/sharing/share?fileId=${encodeURIComponent(selectedFile.id)}`}
                      />
                    </div>
                  </div>

                  <div className="row wrap between" style={{ gap: 10 }}>
                    <Seg
                      options="Side by side|Redacted only"
                      value={viewMode}
                      onChange={(val) => {
                        if (
                          val === "Side by side" ||
                          val === "Redacted only"
                        ) {
                          setViewMode(val)
                        }
                      }}
                      aria-label="Scan diff mode"
                    />
                    <div className="row wrap" style={{ gap: 8 }}>
                      <Button
                        label={
                          busyAction === "block"
                            ? "Updating…"
                            : selectedFile.originalBlocked
                              ? "Allow original"
                              : "Block original"
                        }
                        size="sm"
                        variant={
                          selectedFile.originalBlocked ? "ghost" : "danger"
                        }
                        disabled={busyAction !== null}
                        onClick={() => void toggleBlockOriginal()}
                      />
                      <Button
                        label={
                          busyAction === "redact"
                            ? "Creating…"
                            : "Create redacted copy"
                        }
                        size="sm"
                        variant="primary"
                        disabled={busyAction !== null}
                        onClick={() => void createRedactedCopy()}
                      />
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      viewMode === "Side by side"
                        ? "repeat(auto-fit, minmax(260px, 1fr))"
                        : "minmax(0, 1fr)",
                    gap: 14,
                  }}
                >
                  {viewMode === "Side by side" ? (
                    <div className="glass card col" style={{ gap: 10 }}>
                      <div className="row between">
                        <span className="sm m">Original vault copy</span>
                        <Chip
                          label={
                            selectedFile.originalBlocked ? "Blocked" : "Allowed"
                          }
                          tone={
                            selectedFile.originalBlocked ? "accent" : "neutral"
                          }
                        />
                      </div>
                      {findings.length === 0 ? (
                        <span className="sm muted">
                          No sensitive patterns matched in this file.
                        </span>
                      ) : (
                        <div className="col" style={{ gap: 8 }}>
                          {findings.map((f) => (
                            <div
                              key={f.id}
                              className="glass-soft col"
                              style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                gap: 3,
                              }}
                            >
                              <div className="row between">
                                <span className="xs muted">{f.location}</span>
                                <span className="xs muted">{f.detector}</span>
                              </div>
                              <span
                                className="sm"
                                style={{
                                  fontFamily: "ui-monospace, monospace",
                                }}
                              >
                                {f.type}: {f.maskedValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="glass card col" style={{ gap: 10 }}>
                    <div className="row between">
                      <span className="sm m">Redacted external view</span>
                      <Chip
                        label={
                          selectedFile.hasRedactedCopy
                            ? "Saved copy ready"
                            : "Preview"
                        }
                        tone="clear"
                      />
                    </div>
                    {findings.length === 0 ? (
                      <span className="sm muted">
                        Nothing to redact. Clean copy matches original structure.
                      </span>
                    ) : (
                      <div className="col" style={{ gap: 8 }}>
                        {findings.map((f) => (
                          <div
                            key={f.id}
                            className="glass-soft col"
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              gap: 4,
                            }}
                          >
                            <span className="xs muted">{f.location}</span>
                            <div className="row" style={{ gap: 8 }}>
                              <span className="sm">{f.type}:</span>
                              {f.safe ? (
                                <span className="sm muted">
                                  Preserved (marked safe)
                                </span>
                              ) : (
                                <span className="redact sm">
                                  [REDACTED {f.type}]
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="glass card col" style={{ gap: 10 }}>
                  <div className="row between">
                    <span className="h2">Findings ({findings.length})</span>
                    <span className="xs muted">
                      Mark false positives safe so future shares skip them
                    </span>
                  </div>

                  {loadingFindings ? (
                    <span className="sm muted">Loading findings…</span>
                  ) : findings.length === 0 ? (
                    <span className="sm muted">
                      No findings recorded for this file.
                    </span>
                  ) : (
                    <div className="col" style={{ gap: 8 }}>
                      {findings.map((f) => (
                        <div
                          key={f.id}
                          className="glass-soft row wrap between"
                          style={{
                            padding: "12px 14px",
                            borderRadius: 14,
                            gap: 10,
                          }}
                        >
                          <div className="col" style={{ gap: 3 }}>
                            <div className="row" style={{ gap: 8 }}>
                              <span className="sm m">{f.type}</span>
                              <Chip
                                label={f.safe ? "Marked safe" : f.detector}
                                tone={f.safe ? "clear" : "accent"}
                              />
                            </div>
                            <span className="xs muted">
                              {f.location} ·{" "}
                              <span
                                style={{ fontFamily: "ui-monospace, monospace" }}
                              >
                                {f.maskedValue}
                              </span>
                            </span>
                          </div>
                          <Button
                            label={
                              busyAction === f.id
                                ? "…"
                                : f.safe
                                  ? "Restore"
                                  : "Mark safe"
                            }
                            size="sm"
                            variant="ghost"
                            disabled={busyAction !== null}
                            onClick={() => void toggleSafe(f)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : null}
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

export default function ScanPage() {
  return (
    <React.Suspense
      fallback={
        <div className="app" style={{ minHeight: 900 }}>
          <AppSidebar active="scan" />
          <main className="main">
            <div className="glass card" style={{ padding: 24 }}>
              <span className="sm muted">Loading scan report…</span>
            </div>
          </main>
        </div>
      }
    >
      <ScanReportInner />
    </React.Suspense>
  )
}
