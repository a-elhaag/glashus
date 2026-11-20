"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  useFolders,
  useInvalidateDrive,
  useShares,
} from "@/lib/queries"

type InspectorTab = "Details" | "Access" | "Ask"

type PreviewKind = "image" | "pdf" | "video" | "audio" | "csv" | "text" | "other"

function detectPreviewKind(file: FileData): PreviewKind {
  const mime = file.mime.toLowerCase()
  const ext = extractExt(file.name).toLowerCase()
  if (mime.startsWith("image/")) return "image"
  if (mime === "application/pdf" || ext === "pdf") return "pdf"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (mime === "text/csv" || ext === "csv") return "csv"
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    ["txt", "md", "json", "ts", "tsx", "js", "jsx", "env", "log", "yaml", "yml"].includes(
      ext
    )
  ) {
    return "text"
  }
  return "other"
}

function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 40)
    .map((line) => line.split(",").map((cell) => cell.trim()))
}

function ViewerInner() {
  const router = useRouter()
  const params = useSearchParams()
  const paramFileId = params.get("fileId")

  const { data: files = [], isLoading: filesLoading } = useFiles({
    trashed: false,
  })
  const { data: folders = [] } = useFolders()
  const { data: shares = [] } = useShares()
  const invalidate = useInvalidateDrive()

  const [selectedId, setSelectedId] = React.useState<string>(paramFileId ?? "")
  React.useEffect(() => {
    if (paramFileId) {
      setSelectedId(paramFileId)
      return
    }
    if (!selectedId && files[0]) {
      setSelectedId(files[0].id)
    }
  }, [files, paramFileId, selectedId])

  const file = React.useMemo(
    () => files.find((f) => f.id === selectedId) ?? files[0] ?? null,
    [files, selectedId]
  )

  const folderName = React.useMemo(() => {
    if (!file?.folderId) return "Drive"
    return folders.find((fld) => fld.id === file.folderId)?.name ?? "Drive"
  }, [file, folders])

  const fileShares = React.useMemo(
    () =>
      file
        ? shares.filter((s) => s.fileId === file.id && !s.revokedAt)
        : [],
    [file, shares]
  )

  const [tab, setTab] = React.useState<InspectorTab>("Details")
  const [zoom, setZoom] = React.useState(100)
  const [rotation, setRotation] = React.useState(0)

  const [inlineUrl, setInlineUrl] = React.useState<string | null>(null)
  const [urlLoading, setUrlLoading] = React.useState(false)
  const [urlError, setUrlError] = React.useState<string | null>(null)
  const [textContent, setTextContent] = React.useState<string | null>(null)
  const [textError, setTextError] = React.useState<string | null>(null)

  const [findings, setFindings] = React.useState<FindingData[]>([])
  const [askInput, setAskInput] = React.useState("")
  const [asking, setAsking] = React.useState(false)
  const [askHistory, setAskHistory] = React.useState<
    Array<{
      id: string
      role: "user" | "assistant"
      text: string
      consentBlocked?: boolean
    }>
  >([])

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

  const loadSignedPreview = React.useCallback(async (target: FileData) => {
    if (target.scanStatus !== "clean") {
      setInlineUrl(null)
      setUrlError(
        target.scanStatus === "blocked"
          ? "Preview disabled: file is blocked in quarantine."
          : "File is still scanning in quarantine."
      )
      return
    }
    setUrlLoading(true)
    setUrlError(null)
    setTextContent(null)
    setTextError(null)
    try {
      const res = unwrapApi(
        await glashusApi.POST("/v1/files/{id}/download-url", {
          params: { path: { id: target.id }, query: { inline: "true" } },
        })
      )
      setInlineUrl(res.downloadUrl)

      const kind = detectPreviewKind(target)
      if (kind === "text" || kind === "csv") {
        try {
          const resp = await fetch(res.downloadUrl)
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`)
          }
          const raw = await resp.text()
          setTextContent(
            raw.length > 120000
              ? `${raw.slice(0, 120000)}\n\n… [Truncated inline preview at 120 KB]`
              : raw
          )
        } catch {
          setTextError(
            "Inline text fetch blocked by CORS or unavailable; open the signed URL directly."
          )
        }
      }
    } catch (err) {
      setInlineUrl(null)
      setUrlError(
        err instanceof Error ? err.message : "Could not obtain signed preview URL."
      )
    } finally {
      setUrlLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!file) {
      setInlineUrl(null)
      setFindings([])
      return
    }
    setZoom(100)
    setRotation(0)
    setAskHistory([])
    void loadSignedPreview(file)

    let cancelled = false
    glashusApi
      .GET("/v1/files/{id}/findings", {
        params: { path: { id: file.id } },
      })
      .then((res) => {
        if (!cancelled) setFindings(unwrapApi(res).findings)
      })
      .catch(() => {
        if (!cancelled) setFindings([])
      })
    return () => {
      cancelled = true
    }
  }, [file, loadSignedPreview])

  const handleDownload = async () => {
    if (!file) return
    setBusyAction("download")
    try {
      const res = unwrapApi(
        await glashusApi.POST("/v1/files/{id}/download-url", {
          params: { path: { id: file.id }, query: { inline: "false" } },
        })
      )
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer")
      notify(`Opened 60 s signed download link for ${file.name}`)
    } catch (err) {
      notify(err instanceof Error ? err.message : "Download failed.")
    } finally {
      setBusyAction(null)
    }
  }

  const handleTrash = async () => {
    if (!file) return
    setBusyAction("trash")
    try {
      unwrapApi(
        await glashusApi.PATCH("/v1/files/{id}", {
          params: { path: { id: file.id } },
          body: { trashed: true },
        })
      )
      invalidate()
      notify(`Moved ${file.name} to Trash`)
      router.push("/drive")
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not trash file.")
    } finally {
      setBusyAction(null)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    setBusyAction(shareId)
    try {
      unwrapApi(
        await glashusApi.DELETE("/v1/shares/{id}", {
          params: { path: { id: shareId } },
        })
      )
      invalidate()
      notify("Revoked share link")
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not revoke link.")
    } finally {
      setBusyAction(null)
    }
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !askInput.trim() || asking) return
    const q = askInput.trim()
    setAskInput("")
    const msgId = `u-${Date.now()}`
    setAskHistory((prev) => [...prev, { id: msgId, role: "user", text: q }])
    setAsking(true)
    try {
      const res = unwrapApi(
        await glashusApi.POST("/v1/ai/ask", {
          body: { question: q, folderId: file.folderId },
        })
      )
      invalidate()
      setAskHistory((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: res.consentBlocked
            ? res.consentMessage || res.answer
            : res.answer,
          consentBlocked: res.consentBlocked,
        },
      ])
    } catch (err) {
      setAskHistory((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: err instanceof Error ? err.message : "Could not ask AI.",
        },
      ])
    } finally {
      setAsking(false)
    }
  }

  const kind = file ? detectPreviewKind(file) : "other"
  const activeFindings = findings.filter((f) => !f.safe)

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="drive" />
      <main className="main">
        <PageHead
          title={file ? file.name : "File viewer"}
          sub={
            file
              ? `${folderName} · ${formatBytes(file.size)} · v${file.currentVersion}`
              : "Inspect clean files via 60 s signed URLs."
          }
          cta="Back to folders"
          ctaIcon="chevL"
          ctaHref="/drive/folders"
        />

        {filesLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Loading files…</span>
          </div>
        ) : !file ? (
          <div className="glass card col" style={{ padding: 28, gap: 10 }}>
            <span className="h2">No files in Drive yet</span>
            <p className="p muted" style={{ margin: 0 }}>
              Upload a file to inspect it in the viewer.
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
          <div className="col" style={{ gap: 16 }}>
            <div className="glass card row wrap between" style={{ padding: 12, gap: 10 }}>
              <div className="row" style={{ gap: 10, minWidth: 240, flex: "1 1 260px" }}>
                <FileTile
                  ext={extractExt(file.name)}
                  tone={activeFindings.length > 0 ? 2 : 0}
                  size={34}
                />
                <select
                  aria-label="Select file to view"
                  className="input"
                  value={file.id}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedId(id)
                    router.replace(`/viewer?fileId=${encodeURIComponent(id)}`)
                  }}
                >
                  {files.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({formatBytes(item.size)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="row wrap" style={{ gap: 8 }}>
                {kind === "image" ? (
                  <>
                    <Button
                      label="Zoom out"
                      icon="zoomOut"
                      iconOnly
                      size="sm"
                      onClick={() => setZoom((z) => Math.max(40, z - 20))}
                    />
                    <span className="xs muted">{zoom}%</span>
                    <Button
                      label="Zoom in"
                      icon="zoomIn"
                      iconOnly
                      size="sm"
                      onClick={() => setZoom((z) => Math.min(200, z + 20))}
                    />
                    <Button
                      label="Rotate"
                      icon="rotate"
                      iconOnly
                      size="sm"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                    />
                  </>
                ) : null}
                <Button
                  label={urlLoading ? "Refreshing…" : "Refresh link"}
                  icon="rotate"
                  size="sm"
                  onClick={() => void loadSignedPreview(file)}
                />
                <Button
                  label={busyAction === "download" ? "Preparing…" : "Download"}
                  icon="download"
                  size="sm"
                  variant="primary"
                  disabled={busyAction !== null || file.scanStatus !== "clean"}
                  onClick={() => void handleDownload()}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 340px)",
                gap: 16,
                alignItems: "start",
              }}
            >
              <section
                className="glass card col center"
                style={{
                  minHeight: 460,
                  padding: 18,
                  overflow: "hidden",
                  gap: 12,
                }}
              >
                {urlLoading ? (
                  <div className="col center" style={{ gap: 6 }}>
                    <span className="m">Generating 60 s signed preview…</span>
                    <span className="xs muted">{file.mime}</span>
                  </div>
                ) : urlError || !inlineUrl ? (
                  <div className="col center" style={{ gap: 8, textAlign: "center" }}>
                    <div className="tile">
                      <Icon glyph="warn" size={20} />
                    </div>
                    <span className="m">Preview unavailable</span>
                    <span className="sm muted">
                      {urlError ?? "Signed URL unavailable."}
                    </span>
                  </div>
                ) : kind === "image" ? (
                  <div
                    style={{
                      width: "100%",
                      maxHeight: 540,
                      overflow: "auto",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 12,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={inlineUrl}
                      alt={file.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: 500,
                        borderRadius: 12,
                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                        transition: "transform 160ms ease",
                      }}
                    />
                  </div>
                ) : kind === "pdf" ? (
                  <div className="col" style={{ width: "100%", gap: 10 }}>
                    <iframe
                      src={inlineUrl}
                      title={file.name}
                      style={{
                        width: "100%",
                        height: 520,
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        background: "#fff",
                      }}
                    />
                    <div className="row between xs muted">
                      <span>Signed PDF stream (60 s TTL)</span>
                      <a
                        href={inlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", fontWeight: 600 }}
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  </div>
                ) : kind === "video" ? (
                  <video
                    controls
                    src={inlineUrl}
                    style={{
                      width: "100%",
                      maxHeight: 480,
                      borderRadius: 12,
                      background: "#111",
                    }}
                  />
                ) : kind === "audio" ? (
                  <div className="col center" style={{ width: "100%", gap: 14, padding: 24 }}>
                    <div className="tile">
                      <Icon glyph="music" size={22} />
                    </div>
                    <span className="m">{file.name}</span>
                    <audio controls src={inlineUrl} style={{ width: "100%", maxWidth: 420 }} />
                  </div>
                ) : kind === "csv" && textContent !== null ? (
                  <div style={{ width: "100%", overflowX: "auto", maxHeight: 500 }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <tbody>
                        {parseCsvRows(textContent).map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{
                              borderBottom: "1px solid var(--line)",
                              fontWeight: rIdx === 0 ? 600 : 400,
                            }}
                          >
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} style={{ padding: "8px 10px" }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (kind === "text" || kind === "csv") && textContent !== null ? (
                  <pre
                    style={{
                      width: "100%",
                      maxHeight: 500,
                      overflow: "auto",
                      margin: 0,
                      padding: 14,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.55)",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {textContent}
                  </pre>
                ) : (
                  <div className="col center" style={{ gap: 10, padding: 24, textAlign: "center" }}>
                    <FileTile ext={extractExt(file.name)} tone={0} size={52} />
                    <span className="m">{file.name}</span>
                    <span className="sm muted">
                      {textError ??
                        `${file.mime} · Inline preview is not rendered for this binary format.`}
                    </span>
                    <Button
                      label="Open signed URL"
                      variant="primary"
                      icon="download"
                      onClick={() => void handleDownload()}
                    />
                  </div>
                )}
              </section>

              <aside className="glass card col" style={{ gap: 14 }}>
                <Seg
                  options="Details|Access|Ask"
                  value={tab}
                  onChange={(val) => {
                    if (val === "Details" || val === "Access" || val === "Ask") {
                      setTab(val)
                    }
                  }}
                  aria-label="Viewer inspector tabs"
                />

                {tab === "Details" ? (
                  <div className="col" style={{ gap: 12 }}>
                    <div className="row between sm">
                      <span className="muted">Status</span>
                      <Chip
                        label={
                          activeFindings.length > 0
                            ? `${activeFindings.length} finding(s)`
                            : file.scanStatus
                        }
                        tone={activeFindings.length > 0 ? "accent" : "clear"}
                      />
                    </div>
                    <div className="row between sm">
                      <span className="muted">Type</span>
                      <span className="m">{file.mime}</span>
                    </div>
                    <div className="row between sm">
                      <span className="muted">Size</span>
                      <span className="m">{formatBytes(file.size)}</span>
                    </div>
                    <div className="row between sm">
                      <span className="muted">Folder</span>
                      <span className="m">{folderName}</span>
                    </div>
                    <div className="row between sm">
                      <span className="muted">Modified</span>
                      <span className="m">{formatShortDate(file.updatedAt)}</span>
                    </div>
                    {file.sha256 ? (
                      <div className="row between sm">
                        <span className="muted">SHA-256</span>
                        <span
                          className="xs"
                          style={{ fontFamily: "ui-monospace, monospace" }}
                        >
                          {file.sha256.slice(0, 12)}…
                        </span>
                      </div>
                    ) : null}

                    <hr className="hr" />
                    <div className="col" style={{ gap: 8 }}>
                      <Button
                        label="Share safely"
                        variant="primary"
                        icon="share"
                        href={`/sharing/share?fileId=${encodeURIComponent(file.id)}`}
                      />
                      <Button
                        label="Open scan report"
                        variant="secondary"
                        icon="shield"
                        href={`/sharing/scan?fileId=${encodeURIComponent(file.id)}`}
                      />
                      <Button
                        label={
                          busyAction === "trash" ? "Moving…" : "Move to trash"
                        }
                        variant="danger"
                        icon="trash"
                        disabled={busyAction !== null}
                        onClick={() => void handleTrash()}
                      />
                    </div>
                  </div>
                ) : tab === "Access" ? (
                  <div className="col" style={{ gap: 10 }}>
                    <div className="row between">
                      <span className="sm m">
                        Active shares ({fileShares.length})
                      </span>
                      <Link
                        href={`/sharing/share?fileId=${encodeURIComponent(file.id)}`}
                        className="xs m"
                        style={{ color: "var(--accent)" }}
                      >
                        + Share
                      </Link>
                    </div>
                    {fileShares.length === 0 ? (
                      <span className="sm muted">
                        Private. Only you can access this file.
                      </span>
                    ) : (
                      fileShares.map((s) => (
                        <div
                          key={s.id}
                          className="glass-soft col"
                          style={{ padding: 10, borderRadius: 12, gap: 6 }}
                        >
                          <div className="row between">
                            <Chip
                              label={
                                s.audience === "anyone"
                                  ? "Anyone with link"
                                  : s.recipientEmail || "Specific person"
                              }
                              tone={
                                s.audience === "anyone" ? "accent" : "neutral"
                              }
                            />
                            <Button
                              label={busyAction === s.id ? "…" : "Revoke"}
                              size="sm"
                              variant="danger"
                              disabled={busyAction !== null}
                              onClick={() => void handleRevokeShare(s.id)}
                            />
                          </div>
                          <span className="xs muted">
                            {s.downloads} download{s.downloads === 1 ? "" : "s"}
                            {s.hasPin ? " · PIN locked" : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="col" style={{ gap: 10 }}>
                    <span className="xs muted">
                      Ask Gemini about files in {folderName}. Sensitive tokens
                      are masked and reads are logged.
                    </span>
                    <div className="col" style={{ gap: 8, maxHeight: 260, overflowY: "auto" }}>
                      {askHistory.length === 0 ? (
                        <span className="sm muted">
                          Ask a question about this document below.
                        </span>
                      ) : (
                        askHistory.map((m) => (
                          <div
                            key={m.id}
                            className="glass-soft col"
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              gap: 4,
                              borderColor: m.consentBlocked
                                ? "rgba(217,119,6,0.4)"
                                : undefined,
                            }}
                          >
                            <span className="xs muted">
                              {m.role === "user" ? "You" : "Glashus AI"}
                            </span>
                            <span className="sm">{m.text}</span>
                            {m.consentBlocked ? (
                              <Link
                                href="/drive/settings#ai-consent"
                                className="xs m"
                                style={{ color: "var(--accent)" }}
                              >
                                Allow AI in Settings
                              </Link>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleAsk} className="row" style={{ gap: 6 }}>
                      <input
                        className="input grow"
                        value={askInput}
                        onChange={(e) => setAskInput(e.target.value)}
                        placeholder="Ask about this file…"
                      />
                      <Button
                        label={asking ? "…" : "Ask"}
                        icon="send"
                        size="sm"
                        variant="primary"
                        type="submit"
                        disabled={asking}
                      />
                    </form>
                  </div>
                )}
              </aside>
            </div>
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

export default function ViewerPage() {
  return (
    <React.Suspense
      fallback={
        <div className="app" style={{ minHeight: 900 }}>
          <AppSidebar active="drive" />
          <main className="main">
            <div className="glass card" style={{ padding: 24 }}>
              <span className="sm muted">Loading file viewer…</span>
            </div>
          </main>
        </div>
      }
    >
      <ViewerInner />
    </React.Suspense>
  )
}
