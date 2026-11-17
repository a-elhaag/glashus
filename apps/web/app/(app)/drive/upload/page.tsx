"use client"

import * as React from "react"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

type UploadStatus = "uploading" | "scanning" | "clean" | "blocked"

type UploadItem = {
  id: string
  name: string
  ext: string
  status: UploadStatus
  progress: number
  suggestedName?: string
  acceptedFrom?: string
  blockReason?: string
}

type ToastState = {
  msg: string
  undo?: () => void
} | null

const INITIAL_UPLOADS: UploadItem[] = [
  {
    id: "u-report",
    name: "q4-report.pdf",
    ext: "PDF",
    status: "uploading",
    progress: 64,
  },
  {
    id: "u-assets",
    name: "project-assets.zip",
    ext: "ZIP",
    status: "scanning",
    progress: 100,
  },
  {
    id: "u-photo",
    name: "IMG_4032.jpg",
    ext: "JPG",
    status: "clean",
    progress: 100,
    suggestedName: "kitchen-renovation-site-photo.jpg",
  },
  {
    id: "u-exe",
    name: "setup-helper.exe",
    ext: "EXE",
    status: "blocked",
    progress: 100,
    blockReason: "Blocked · malware signature found. Deleted from quarantine.",
  },
]

function extractExt(filename: string): string {
  const parts = filename.split(".")
  const raw = parts.length > 1 ? parts[parts.length - 1] : "FILE"
  return (raw ?? "FILE").slice(0, 4).toUpperCase()
}

export default function UploadPage() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeTimersRef = React.useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  )

  const [items, setItems] = React.useState<UploadItem[]>(INITIAL_UPLOADS)
  const [dragActive, setDragActive] = React.useState(false)
  const [toast, setToast] = React.useState<ToastState>(null)

  React.useEffect(() => {
    const timers = activeTimersRef.current
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const showToast = React.useCallback((msg: string, undo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, undo })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 5000)
  }, [])

  const schedule = React.useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      activeTimersRef.current.delete(t)
      fn()
    }, ms)
    activeTimersRef.current.add(t)
  }, [])

  const enqueueFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const picked = Array.from(fileList)
      const created: UploadItem[] = picked.map((file, idx) => ({
        id: `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        ext: extractExt(file.name),
        status: "uploading",
        progress: 18,
      }))

      setItems((prev) => [...created, ...prev])

      created.forEach((entry, idx) => {
        const delayOffset = idx * 180
        schedule(() => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === entry.id && item.status === "uploading"
                ? { ...item, progress: 58 }
                : item
            )
          )
        }, 350 + delayOffset)

        schedule(() => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === entry.id && item.status === "uploading"
                ? { ...item, status: "scanning", progress: 100 }
                : item
            )
          )
        }, 850 + delayOffset)

        schedule(() => {
          const suspicious =
            entry.ext === "EXE" ||
            entry.name.toLowerCase().includes("eicar")
          setItems((prev) =>
            prev.map((item) =>
              item.id === entry.id && item.status === "scanning"
                ? suspicious
                  ? {
                      ...item,
                      status: "blocked",
                      blockReason:
                        "Blocked · malware signature found. Deleted from quarantine.",
                    }
                  : { ...item, status: "clean" }
                : item
            )
          )
        }, 1750 + delayOffset)
      })
    },
    [schedule]
  )

  const handleCancel = React.useCallback(
    (id: string) => {
      const index = items.findIndex((x) => x.id === id)
      if (index < 0) return
      const target = items[index]
      if (!target) return
      setItems((prev) => prev.filter((x) => x.id !== id))
      showToast(`Canceled upload for ${target.name}`, () => {
        setItems((cur) => {
          if (cur.some((x) => x.id === target.id)) return cur
          const copy = [...cur]
          copy.splice(Math.min(index, copy.length), 0, target)
          return copy
        })
        setToast(null)
      })
    },
    [items, showToast]
  )

  const handleAcceptSuggestedName = React.useCallback(
    (id: string) => {
      const target = items.find((x) => x.id === id)
      if (!target || !target.suggestedName) return
      const originalName = target.name
      const nextName = target.suggestedName
      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                name: nextName,
                suggestedName: undefined,
                acceptedFrom: originalName,
              }
            : x
        )
      )
      showToast(`Renamed to ${nextName}`, () => {
        setItems((cur) =>
          cur.map((x) =>
            x.id === id
              ? {
                  ...x,
                  name: originalName,
                  suggestedName: nextName,
                  acceptedFrom: undefined,
                }
              : x
          )
        )
        setToast(null)
      })
    },
    [items, showToast]
  )

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
              : `Uploading ${items.length} ${items.length === 1 ? "file" : "files"}`}
          </h1>
          <Button
            label="Close"
            variant="ghost"
            size="md"
            icon="x"
            href={resolveBoardHref("Main.dc.html")}
            iconOnly
          />
        </div>

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
              <span className="sm m">Drop files here to scan and encrypt</span>
              <span className="xs muted">
                Uploads go to quarantine before entering your clean bucket.
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
          let subText = "Clean · encrypted and ready"
          if (item.status === "uploading") {
            subText = `Uploading · ${item.progress}%`
          } else if (item.status === "scanning") {
            subText = "Scanning in quarantine"
          } else if (item.status === "clean" && item.suggestedName) {
            subText = `Clean · suggested name: ${item.suggestedName}`
          } else if (item.status === "clean" && item.acceptedFrom) {
            subText = `Clean · renamed from ${item.acceptedFrom}`
          } else if (item.status === "blocked") {
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
                <FileTile ext={item.ext} tone={0} size={36} />
                <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                  <span className="m ell">{item.name}</span>
                  <span className="xs muted">{subText}</span>
                </div>

                {item.status === "uploading" ? (
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(item.id)}
                  />
                ) : null}

                {item.status === "scanning" ? (
                  <Chip label="Scanning" tone="neutral" />
                ) : null}

                {item.status === "clean" && item.suggestedName ? (
                  <Button
                    label="Accept name"
                    variant="secondary"
                    size="sm"
                    icon="sparkle"
                    onClick={() => handleAcceptSuggestedName(item.id)}
                  />
                ) : null}

                {item.status === "clean" && !item.suggestedName ? (
                  <Chip
                    label={item.acceptedFrom ? "Renamed" : "Clean"}
                    tone="clear"
                    icon="check"
                  />
                ) : null}

                {item.status === "blocked" ? (
                  <Chip label="Blocked" tone="accent" icon="warn" />
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
              Choose files above or return to Drive.
            </span>
          </div>
        ) : null}

        <div className="row between wrap sm muted" style={{ gap: 12 }}>
          <span>Names are suggested by AI only if you allow it.</span>
          <Button
            label="Done"
            variant="primary"
            size="md"
            icon="check"
            href={resolveBoardHref("Main.dc.html")}
          />
        </div>

        {toast ? (
          <div role="status" aria-live="polite" className="toast">
            <span>{toast.msg}</span>
            {toast.undo ? (
              <Button
                label="Undo"
                variant="secondary"
                size="sm"
                onClick={toast.undo}
              />
            ) : (
              <span style={{ width: 8 }} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
