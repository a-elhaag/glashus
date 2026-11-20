"use client"

import * as React from "react"
import {
  Button,
  Chip,
  FileTile,
  Icon,
} from "@workspace/ui/components/glashus"
import { extractExt } from "@/lib/format"
import {
  uploadFileToGlashus,
  useFolders,
  useInvalidateDrive,
} from "@/lib/queries"

type UploadStatus = "uploading" | "scanning" | "clean" | "blocked" | "error"

type UploadItem = {
  id: string
  fileId?: string
  name: string
  ext: string
  status: UploadStatus
  progress: number
  findingCount?: number
  blockReason?: string
}

export default function UploadPage() {
  const foldersQuery = useFolders()
  const invalidateDrive = useInvalidateDrive()

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [folderId, setFolderId] = React.useState<string>("")
  const [items, setItems] = React.useState<UploadItem[]>([])
  const [dragActive, setDragActive] = React.useState(false)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = React.useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMsg(msg)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 5000)
  }, [])

  const enqueueFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const picked = Array.from(fileList)
      const targetFolderId = folderId || null

      picked.forEach((file, idx) => {
        const localId = `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
        const initial: UploadItem = {
          id: localId,
          name: file.name,
          ext: extractExt(file.name),
          status: "uploading",
          progress: 2,
        }
        setItems((prev) => [initial, ...prev])

        void uploadFileToGlashus(file, targetFolderId, {
          onStage: (stage) => {
            setItems((prev) =>
              prev.map((item) =>
                item.id === localId
                  ? {
                      ...item,
                      status: stage,
                      progress: stage === "scanning" ? 100 : item.progress,
                    }
                  : item
              )
            )
          },
          onProgress: (percent) => {
            setItems((prev) =>
              prev.map((item) =>
                item.id === localId && item.status === "uploading"
                  ? { ...item, progress: percent }
                  : item
              )
            )
          },
        })
          .then((result) => {
            invalidateDrive()
            setItems((prev) =>
              prev.map((item) =>
                item.id === localId
                  ? {
                      ...item,
                      fileId: result.file.id,
                      status: result.blockedReason ? "blocked" : "clean",
                      progress: 100,
                      findingCount: result.findings.length,
                      blockReason: result.blockedReason ?? undefined,
                    }
                  : item
              )
            )
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : "Upload failed"
            setItems((prev) =>
              prev.map((item) =>
                item.id === localId
                  ? { ...item, status: "error", blockReason: msg }
                  : item
              )
            )
            showToast(msg)
          })
      })
    },
    [folderId, invalidateDrive, showToast]
  )

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const hasUploading = items.some((x) => x.status === "uploading")
  const hasScanning = items.some((x) => x.status === "scanning")

  return (
    <div
      className="plain"
      style={{
        minHeight: "100vh",
        padding: 32,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="glass col"
        style={{
          width: 680,
          maxWidth: "100%",
          borderRadius: 28,
          padding: 28,
          gap: 18,
          alignSelf: "flex-start",
          position: "relative",
        }}
        onDragOver={(e) => {
          const types = e.dataTransfer?.types
          if (types && Array.from(types).includes("Files")) {
            e.preventDefault()
            if (!dragActive) setDragActive(true)
          }
        }}
        onDragLeave={(e) => {
          if (
            dragActive &&
            !e.currentTarget.contains(e.relatedTarget as Node | null)
          ) {
            setDragActive(false)
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer?.files?.length) {
            e.preventDefault()
            setDragActive(false)
            enqueueFiles(e.dataTransfer.files)
          }
        }}
      >
        <div className="row between">
          <h1 className="h2">
            {items.length === 0
              ? "Upload files"
              : `Uploads (${items.length})`}
          </h1>
          <Button
            label="Close"
            variant="ghost"
            size="md"
            icon="x"
            href="/drive"
            iconOnly
          />
        </div>

        <div className="row between wrap" style={{ gap: 12 }}>
          <div className="row xs muted" style={{ gap: 8 }}>
            <span
              className={hasUploading ? "b" : undefined}
              style={hasUploading ? { color: "var(--ink)" } : undefined}
            >
              Upload
            </span>
            <Icon glyph="chevR" size={12} />
            <span>Quarantine</span>
            <Icon glyph="chevR" size={12} />
            <span
              className={!hasUploading && hasScanning ? "b" : undefined}
              style={
                !hasUploading && hasScanning ? { color: "var(--ink)" } : undefined
              }
            >
              Scan
            </span>
            <Icon glyph="chevR" size={12} />
            <span
              className={!hasUploading && !hasScanning ? "b" : undefined}
              style={
                !hasUploading && !hasScanning ? { color: "var(--ink)" } : undefined
              }
            >
              Ready
            </span>
          </div>

          <label className="row xs muted" style={{ gap: 8 }}>
            <span>Folder</span>
            <select
              className="input"
              style={{ height: 32, width: "auto", minWidth: 140, fontSize: 13 }}
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">Drive root</option>
              {(foldersQuery.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          aria-label="Choose files to upload"
          className="visually-hidden"
          onChange={(e) => {
            enqueueFiles(e.target.files)
            e.target.value = ""
          }}
        />

        <div
          className={`glass-soft row wrap between item${dragActive ? " over" : ""}`}
          style={{
            borderRadius: 16,
            padding: "12px 16px",
            gap: 12,
            borderStyle: "dashed",
            borderWidth: 1.5,
            borderColor: dragActive
              ? "var(--accent)"
              : "rgba(17,17,17,0.14)",
          }}
        >
          <div className="row" style={{ gap: 10 }}>
            <div
              className="tile n"
              style={{ width: 34, height: 34, borderRadius: 10 }}
            >
              <Icon glyph="upload" size={16} />
            </div>
            <div className="col" style={{ gap: 1 }}>
              <span className="sm m">Drop files here to scan and store</span>
              <span className="xs muted">
                Uploads go to quarantine via a 60 s signed URL before entering your clean bucket.
              </span>
            </div>
          </div>
          <Button
            label="Add files"
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() => fileInputRef.current?.click()}
          />
        </div>

        {items.map((item) => {
          let subText = "Clean · stored in clean bucket"
          if (item.status === "uploading") {
            subText = `Uploading to quarantine · ${item.progress}%`
          } else if (item.status === "scanning") {
            subText = "Scanning for malware & sensitive data"
          } else if (item.status === "clean") {
            subText =
              item.findingCount && item.findingCount > 0
                ? `Clean · ${item.findingCount} sensitive finding(s) masked`
                : "Clean · verified and ready"
          } else if (item.status === "blocked" || item.status === "error") {
            subText =
              item.blockReason ??
              "Blocked · malware signature found. Deleted from quarantine."
          }

          return (
            <div
              key={item.id}
              className="glass-soft col"
              style={{ borderRadius: 16, padding: "14px 16px", gap: 10 }}
            >
              <div className="row" style={{ gap: 12 }}>
                <FileTile
                  ext={item.ext}
                  tone={item.status === "blocked" ? 2 : 0}
                  size={36}
                />
                <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                  <span className="m ell">{item.name}</span>
                  <span className="xs muted">{subText}</span>
                </div>

                {item.status === "scanning" ? (
                  <Chip label="Scanning" tone="neutral" />
                ) : null}

                {item.status === "clean" ? (
                  <>
                    {item.findingCount && item.findingCount > 0 && item.fileId ? (
                      <Button
                        label="Review scan"
                        variant="secondary"
                        size="sm"
                        icon="shield"
                        href={`/sharing/scan?fileId=${encodeURIComponent(item.fileId)}`}
                      />
                    ) : null}
                    <Chip label="Clean" tone="clear" icon="check" />
                  </>
                ) : null}

                {item.status === "blocked" ? (
                  <Chip label="Blocked" tone="accent" icon="warn" />
                ) : null}

                {item.status === "error" ? (
                  <Button
                    label="Dismiss"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(item.id)}
                  />
                ) : null}
              </div>

              {item.status === "uploading" ? (
                <div className="bar acc">
                  <i
                    style={{
                      width: `${item.progress}%`,
                      transition: "width 240ms ease-out",
                    }}
                  />
                </div>
              ) : null}

              {item.status === "scanning" ? (
                <div className="bar">
                  <i style={{ width: "100%" }} />
                </div>
              ) : null}
            </div>
          )
        })}

        {items.length === 0 ? (
          <div
            className="glass-soft col center muted"
            style={{ borderRadius: 16, padding: "28px 16px", gap: 4 }}
          >
            <span className="sm m">No files in the upload queue.</span>
            <span className="xs muted">
              Choose files above or drag files here from your computer.
            </span>
          </div>
        ) : null}

        <div className="row between wrap sm muted" style={{ gap: 12 }}>
          <span>No file enters your clean bucket without passing scan.</span>
          <Button
            label="Done"
            variant="primary"
            size="md"
            icon="check"
            href="/drive"
          />
        </div>

        {toastMsg ? (
          <div role="status" aria-live="polite" className="toast">
            <span>{toastMsg}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
