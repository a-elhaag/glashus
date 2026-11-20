"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Icon,
  PageHead,
  Seg,
  Switch,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { formatBytes } from "@/lib/format"
import {
  unwrapApi,
  useFiles,
  useFolders,
  useMe,
} from "@/lib/queries"

type ExportFormat = "JSON" | "Text summary"

export default function ExportPage() {
  const { data: me } = useMe()
  const { data: folders = [] } = useFolders()
  const { data: files = [], isLoading } = useFiles({ trashed: false })

  const [scopeFolderId, setScopeFolderId] = React.useState<string>("")
  const [format, setFormat] = React.useState<ExportFormat>("JSON")
  const [includeAuditCounts, setIncludeAuditCounts] = React.useState(true)
  const [downloading, setDownloading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
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

  const scopedFiles = React.useMemo(() => {
    if (!scopeFolderId) return files
    return files.filter((f) => f.folderId === scopeFolderId)
  }, [files, scopeFolderId])

  const totalFindings = React.useMemo(
    () => scopedFiles.reduce((sum, f) => sum + f.findingCount, 0),
    [scopedFiles]
  )

  const totalBytes = React.useMemo(
    () => scopedFiles.reduce((sum, f) => sum + f.size, 0),
    [scopedFiles]
  )

  const scopeLabel = React.useMemo(() => {
    if (!scopeFolderId) return "All Drive"
    return folders.find((fld) => fld.id === scopeFolderId)?.name ?? "Folder"
  }, [folders, scopeFolderId])

  const previewText = React.useMemo(() => {
    if (format === "JSON") {
      return JSON.stringify(
        {
          account: me?.user.email ?? "",
          scope: scopeLabel,
          fileCount: scopedFiles.length,
          totalBytes,
          maskedFindingsCount: totalFindings,
          files: scopedFiles.slice(0, 8).map((f) => ({
            id: f.id,
            name: f.name,
            mime: f.mime,
            size: f.size,
            exposure: f.exposure,
            scanStatus: f.scanStatus,
            maskedFindings: f.findingCount,
          })),
        },
        null,
        2
      )
    }

    const lines = [
      `# Glashus Metadata Export (${scopeLabel})`,
      `Account: ${me?.user.email ?? "signed-in user"}`,
      `Files: ${scopedFiles.length} (${formatBytes(totalBytes)})`,
      `Masked findings recorded: ${totalFindings} (raw sensitive tokens omitted)`,
      "",
      ...scopedFiles
        .slice(0, 12)
        .map(
          (f) =>
            `- ${f.name} [${f.exposure}] · ${formatBytes(f.size)} · ${f.findingCount} finding(s)`
        ),
    ]
    return lines.join("\n")
  }, [format, me?.user.email, scopeLabel, scopedFiles, totalBytes, totalFindings])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      notify("Preview copied to clipboard")
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      notify("Clipboard unavailable in this browser context")
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const manifest = unwrapApi(await glashusApi.GET("/v1/export"))
      const filteredFiles = scopeFolderId
        ? manifest.files.filter((f) => f.folderId === scopeFolderId)
        : manifest.files
      const filteredFolders = scopeFolderId
        ? manifest.folders.filter((fld) => fld.id === scopeFolderId)
        : manifest.folders

      const payload =
        format === "JSON"
          ? JSON.stringify(
              {
                exportedAt: manifest.exportedAt,
                scope: scopeLabel,
                user: manifest.user,
                folders: filteredFolders,
                files: filteredFiles,
                shares: manifest.shares,
                ...(includeAuditCounts
                  ? {
                      auditCount: manifest.auditCount,
                      aiReadCount: manifest.aiReadCount,
                    }
                  : {}),
              },
              null,
              2
            )
          : [
              `# Glashus Export · ${manifest.exportedAt}`,
              `Scope: ${scopeLabel}`,
              `User: ${manifest.user.name} <${manifest.user.email}>`,
              `Folders: ${filteredFolders.length} · Files: ${filteredFiles.length} · Shares: ${manifest.shares.length}`,
              ...(includeAuditCounts
                ? [
                    `Audit events: ${manifest.auditCount} · AI reads: ${manifest.aiReadCount}`,
                  ]
                : []),
              "",
              ...filteredFiles.map(
                (f) =>
                  `- ${f.name} (${formatBytes(f.size)}) · ${f.exposure} · ${f.scanStatus} · ${f.findingCount} masked findings`
              ),
            ].join("\n")

      const ext = format === "JSON" ? "json" : "txt"
      const mime = format === "JSON" ? "application/json" : "text/plain"
      const blob = new Blob([payload], { type: `${mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `glashus-export-${new Date().toISOString().slice(0, 10)}.${ext}`
      anchor.click()
      URL.revokeObjectURL(url)
      notify(`Downloaded live ${format} export`)
    } catch (err) {
      notify(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="export" />
      <main className="main">
        <PageHead
          title="Export data"
          sub="Download your Drive inventory, folders, shares, and masked finding counts without exposing raw sensitive values."
          cta="Settings"
          ctaIcon="sliders"
          ctaHref="/drive/settings"
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          <section className="glass card col" style={{ gap: 14 }}>
            <span className="xs muted">EXPORT OPTIONS</span>

            <div className="col" style={{ gap: 6 }}>
              <label htmlFor="export-scope" className="xs muted">
                Folder scope
              </label>
              <select
                id="export-scope"
                className="input"
                value={scopeFolderId}
                onChange={(e) => setScopeFolderId(e.target.value)}
              >
                <option value="">All Drive ({files.length} files)</option>
                {folders.map((fld) => (
                  <option key={fld.id} value={fld.id}>
                    /{fld.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <span className="xs muted">Format</span>
              <Seg
                options="JSON|Text summary"
                value={format}
                onChange={(val) => {
                  if (val === "JSON" || val === "Text summary") setFormat(val)
                }}
                aria-label="Export format"
              />
            </div>

            <Switch
              label="Include audit &amp; AI read counts"
              sub="Aggregated counters only, no unmasked content"
              on={includeAuditCounts}
              onChange={setIncludeAuditCounts}
            />

            <div className="glass-soft row wrap" style={{ padding: 12, borderRadius: 12, gap: 8 }}>
              <Chip label={`${scopedFiles.length} files`} tone="clear" />
              <Chip label={formatBytes(totalBytes)} tone="neutral" />
              <Chip label={`${totalFindings} masked findings`} tone="accent" />
            </div>

            <div className="row wrap" style={{ gap: 8 }}>
              <Button
                label={downloading ? "Exporting…" : `Download ${format}`}
                variant="primary"
                icon="download"
                disabled={downloading || isLoading}
                onClick={() => void handleDownload()}
              />
              <Button
                label={copied ? "Copied" : "Copy preview"}
                variant="secondary"
                icon="copy"
                onClick={() => void handleCopy()}
              />
            </div>
          </section>

          <section className="glass card col" style={{ gap: 10 }}>
            <div className="row between">
              <span className="xs muted">LIVE MANIFEST PREVIEW</span>
              <Chip label="PII masked" tone="clear" />
            </div>
            <pre
              style={{
                margin: 0,
                padding: 14,
                borderRadius: 12,
                background: "rgba(255,255,255,0.55)",
                maxHeight: 420,
                overflow: "auto",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {isLoading ? "Loading Drive manifest…" : previewText}
            </pre>
          </section>
        </div>

        {toast ? (
          <div className="toast">
            <Icon glyph="check" size={14} /> {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}
