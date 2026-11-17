"use client"

import * as React from "react"
import {
  Button,
  Chip,
  FileTile,
  PageHead,
  Seg,
  Sidebar,
} from "@workspace/ui/components/glashus"

type PreviewMode = "Side by side" | "Redacted only"

interface ScanFinding {
  id: string
  label: string
  location: string
  detector: string
  sampleValue: string
  redactWidth: number
}

interface ScannedFile {
  id: string
  name: string
  ext: string
  tone: 0 | 1 | 2
  docTitle: string
  findings: ScanFinding[]
}

const SCANNED_FILES: ScannedFile[] = [
  {
    id: "tax",
    name: "tax-return-2025.pdf",
    ext: "PDF",
    tone: 2,
    docTitle: "Tax return 2025",
    findings: [
      {
        id: "tax-nid",
        label: "National ID",
        location: "Page 1",
        detector: "Pattern + checksum",
        sampleValue: "784-1990-1234567-1",
        redactWidth: 130,
      },
      {
        id: "tax-iban",
        label: "IBAN",
        location: "Page 1",
        detector: "Pattern + checksum",
        sampleValue: "DE89 3704 0044 0532 0130 00",
        redactWidth: 200,
      },
    ],
  },
  {
    id: "env",
    name: "api-config.env",
    ext: "ENV",
    tone: 2,
    docTitle: "api-config.env",
    findings: [
      {
        id: "env-key",
        label: "Google API key",
        location: "Line 4",
        detector: "Prefix + entropy",
        sampleValue: "AIzaSyD-9fK2-demo-x8Q1mP",
        redactWidth: 170,
      },
    ],
  },
  {
    id: "passport",
    name: "passport-scan.jpg",
    ext: "JPG",
    tone: 0,
    docTitle: "Passport scan",
    findings: [
      {
        id: "pass-id",
        label: "ID number",
        location: "Region 2",
        detector: "OCR + checksum",
        sampleValue: "L898902C3-UTO",
        redactWidth: 135,
      },
    ],
  },
  {
    id: "survey",
    name: "survey-data.csv",
    ext: "CSV",
    tone: 2,
    docTitle: "survey-data.csv",
    findings: [
      {
        id: "survey-email",
        label: "Email address",
        location: "Column C",
        detector: "Format match",
        sampleValue: "nadia.k@example.edu",
        redactWidth: 150,
      },
      {
        id: "survey-phone",
        label: "Phone number",
        location: "Column D",
        detector: "Pattern match",
        sampleValue: "+49 170 4829104",
        redactWidth: 125,
      },
      {
        id: "survey-dob",
        label: "Date of birth",
        location: "Column E",
        detector: "Pattern match",
        sampleValue: "1994-08-19",
        redactWidth: 96,
      },
    ],
  },
  {
    id: "thesis",
    name: "thesis-draft-v4.docx",
    ext: "DOC",
    tone: 0,
    docTitle: "Thesis draft v4",
    findings: [],
  },
]

interface ToastState {
  msg: string
  undoLabel?: string
  undo?: () => void
}

export default function ScanPage() {
  const [selectedFileId, setSelectedFileId] = React.useState("tax")
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("Side by side")
  const [safeFindingIds, setSafeFindingIds] = React.useState<string[]>([])
  const [blockedFileIds, setBlockedFileIds] = React.useState<string[]>([])
  const [redactedFileIds, setRedactedFileIds] = React.useState<string[]>([])
  const [rescanningFileId, setRescanningFileId] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState | null>(null)

  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const rescanTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (rescanTimerRef.current) clearTimeout(rescanTimerRef.current)
    }
  }, [])

  const showToast = React.useCallback((next: ToastState) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(next)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 5000)
  }, [])

  const selectedFile =
    SCANNED_FILES.find((f) => f.id === selectedFileId) ?? SCANNED_FILES[0]

  if (!selectedFile) return null

  const activeFindings = selectedFile.findings.filter(
    (finding) => !safeFindingIds.includes(finding.id)
  )
  const dismissedFindings = selectedFile.findings.filter((finding) =>
    safeFindingIds.includes(finding.id)
  )
  const isBlocked = blockedFileIds.includes(selectedFile.id)
  const hasRedactedCopy = redactedFileIds.includes(selectedFile.id)
  const isRescanning = rescanningFileId === selectedFile.id

  const handleMarkSafe = (finding: ScanFinding) => {
    const prevSafe = safeFindingIds
    setSafeFindingIds((curr) =>
      curr.includes(finding.id) ? curr : [...curr, finding.id]
    )
    showToast({
      msg: `Marked ${finding.label} as safe`,
      undoLabel: "Undo",
      undo: () => {
        setSafeFindingIds(prevSafe)
        setToast(null)
      },
    })
  }

  const handleRestoreFinding = (finding: ScanFinding) => {
    const prevSafe = safeFindingIds
    setSafeFindingIds((curr) => curr.filter((id) => id !== finding.id))
    showToast({
      msg: `Restored ${finding.label} finding`,
      undoLabel: "Undo",
      undo: () => {
        setSafeFindingIds(prevSafe)
        setToast(null)
      },
    })
  }

  const handleRescan = () => {
    if (rescanTimerRef.current) clearTimeout(rescanTimerRef.current)
    const file = selectedFile
    const prevSafe = safeFindingIds
    const fileFindingIds = new Set(file.findings.map((f) => f.id))
    setRescanningFileId(file.id)

    rescanTimerRef.current = setTimeout(() => {
      rescanTimerRef.current = null
      setRescanningFileId(null)
      setSafeFindingIds((curr) => curr.filter((id) => !fileFindingIds.has(id)))
      showToast({
        msg: `Rescan complete for ${file.name}`,
        undoLabel: prevSafe.some((id) => fileFindingIds.has(id)) ? "Undo" : undefined,
        undo: prevSafe.some((id) => fileFindingIds.has(id))
          ? () => {
              setSafeFindingIds(prevSafe)
              setToast(null)
            }
          : undefined,
      })
    }, 450)
  }

  const handleToggleBlockOriginal = () => {
    const prevBlocked = blockedFileIds
    const currentlyBlocked = prevBlocked.includes(selectedFile.id)
    const nextBlocked = currentlyBlocked
      ? prevBlocked.filter((id) => id !== selectedFile.id)
      : [...prevBlocked, selectedFile.id]
    setBlockedFileIds(nextBlocked)
    showToast({
      msg: currentlyBlocked
        ? `Unblocked original sharing for ${selectedFile.name}`
        : `Blocked sharing original for ${selectedFile.name}`,
      undoLabel: "Undo",
      undo: () => {
        setBlockedFileIds(prevBlocked)
        setToast(null)
      },
    })
  }

  const handleCreateRedactedCopy = () => {
    const prevRedacted = redactedFileIds
    if (!prevRedacted.includes(selectedFile.id)) {
      setRedactedFileIds([...prevRedacted, selectedFile.id])
    }
    showToast({
      msg: `Redacted copy created for ${selectedFile.name}`,
      undoLabel: "Undo",
      undo: () => {
        setRedactedFileIds(prevRedacted)
        setToast(null)
      },
    })
  }

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <Sidebar active="scan" />
      <main className="main">
        <PageHead
          title="Scan report"
          sub="What Glashus found, and how it was handled"
          cta="Upload"
          ctaIcon="upload"
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <aside
            className="glass col"
            style={{
              flex: "0 0 340px",
              maxWidth: "100%",
              borderRadius: 22,
              padding: 12,
              gap: 2,
              alignSelf: "flex-start",
            }}
          >
            <span className="navlabel" style={{ paddingTop: 6 }}>
              Files with findings
            </span>
            {SCANNED_FILES.map((file) => {
              const remainingCount = file.findings.filter(
                (f) => !safeFindingIds.includes(f.id)
              ).length
              const selected = file.id === selectedFile.id
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                  className={`row${selected ? " sel" : ""}`}
                  style={{
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: 0,
                    background: selected ? undefined : "transparent",
                    textAlign: "left",
                    width: "100%",
                    cursor: "pointer",
                    color: "var(--ink)",
                  }}
                >
                  <FileTile ext={file.ext} tone={file.tone} size={32} />
                  <span className="grow sm m ell">{file.name}</span>
                  {remainingCount > 0 ? (
                    <Chip label={`${remainingCount} found`} tone="accent" />
                  ) : (
                    <Chip label="Clean" tone="clear" icon="check" />
                  )}
                </button>
              )
            })}
          </aside>

          <section className="col" style={{ flex: "1 1 560px", minWidth: 0, gap: 16 }}>
            <div className="glass card col" style={{ gap: 16 }}>
              <div className="row wrap between">
                <div className="row" style={{ gap: 10 }}>
                  <h2 className="h2">Redaction preview</h2>
                  {isBlocked ? (
                    <Chip label="Original blocked" tone="dark" icon="lock" />
                  ) : null}
                  {hasRedactedCopy ? (
                    <Chip label="Redacted copy ready" tone="accent" icon="check" />
                  ) : null}
                </div>
                <Seg
                  options="Side by side|Redacted only"
                  value={previewMode}
                  onChange={(val) => setPreviewMode(val as PreviewMode)}
                  aria-label="Preview layout"
                />
              </div>

              <div
                className="row wrap"
                style={{ gap: 16, alignItems: "stretch" }}
              >
                {previewMode === "Side by side" ? (
                  <div className="col" style={{ flex: "1 1 240px", gap: 8 }}>
                    <span className="xs b muted">Original</span>
                    <div
                      className="sheet col"
                      style={{ padding: 28, gap: 12, flex: 1 }}
                    >
                      <span className="b">{selectedFile.docTitle}</span>
                      <div className="line" style={{ width: "40%" }} />
                      {selectedFile.findings.length > 0 ? (
                        selectedFile.findings.map((finding) => {
                          const isSafe = safeFindingIds.includes(finding.id)
                          return (
                            <div
                              key={finding.id}
                              className="row wrap sm"
                              style={{ gap: 10 }}
                            >
                              <span className="muted" style={{ width: 92 }}>
                                {finding.label}
                              </span>
                              <span
                                className="mono"
                                style={{
                                  background: isSafe
                                    ? "rgba(17,17,17,0.06)"
                                    : "color-mix(in srgb, var(--accent) 14%, transparent)",
                                  padding: "1px 4px",
                                  borderRadius: 4,
                                  textDecoration: isSafe ? "line-through" : "none",
                                  color: isSafe ? "var(--ink3)" : "var(--ink)",
                                }}
                              >
                                {finding.sampleValue}
                              </span>
                            </div>
                          )
                        })
                      ) : (
                        <span className="sm muted">
                          No sensitive identifiers detected in this document.
                        </span>
                      )}
                      <div className="line" />
                      <div className="line" style={{ width: "88%" }} />
                      <div className="line" style={{ width: "64%" }} />
                    </div>
                  </div>
                ) : null}

                <div className="col" style={{ flex: "1 1 240px", gap: 8 }}>
                  <span className="xs b muted">Redacted copy</span>
                  <div
                    className="sheet col"
                    style={{ padding: 28, gap: 12, flex: 1 }}
                  >
                    <span className="b">{selectedFile.docTitle}</span>
                    <div className="line" style={{ width: "40%" }} />
                    {selectedFile.findings.length > 0 ? (
                      selectedFile.findings.map((finding) => {
                        const isSafe = safeFindingIds.includes(finding.id)
                        return (
                          <div
                            key={finding.id}
                            className="row wrap sm"
                            style={{ gap: 10 }}
                          >
                            <span className="muted" style={{ width: 92 }}>
                              {finding.label}
                            </span>
                            {isSafe ? (
                              <span className="mono muted">
                                {finding.sampleValue}
                              </span>
                            ) : (
                              <span
                                className="redact"
                                style={{ width: finding.redactWidth, maxWidth: "100%" }}
                              />
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <span className="sm muted">
                        Clean file — nothing required redaction.
                      </span>
                    )}
                    <div className="line" />
                    <div className="line" style={{ width: "88%" }} />
                    <div className="line" style={{ width: "64%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass card col" style={{ gap: 10 }}>
              <div className="row between wrap" style={{ gap: 8 }}>
                <h2 className="h2">Findings</h2>
                <Button
                  label={isRescanning ? "Scanning…" : "Scan again"}
                  variant="ghost"
                  size="sm"
                  icon="rotate"
                  disabled={isRescanning}
                  onClick={handleRescan}
                  style={isRescanning ? { opacity: 0.6, cursor: "wait" } : undefined}
                />
              </div>

              {activeFindings.length > 0 ? (
                activeFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="row wrap sm"
                    style={{ gap: 12 }}
                  >
                    <span className="grow m">{finding.label}</span>
                    <span className="muted">{finding.location}</span>
                    <Chip label={finding.detector} tone="neutral" />
                    <Button
                      label="Mark safe"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkSafe(finding)}
                    />
                  </div>
                ))
              ) : (
                <div className="row sm" style={{ gap: 8, padding: "4px 0" }}>
                  <Chip label="No active findings" tone="clear" icon="check" />
                  <span className="muted">
                    {dismissedFindings.length > 0
                      ? "All detected items were marked safe."
                      : "This file passed deterministic checks."}
                  </span>
                </div>
              )}

              {dismissedFindings.length > 0 ? (
                <div
                  className="col"
                  style={{
                    gap: 8,
                    marginTop: 6,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(17,17,17,0.06)",
                  }}
                >
                  <span className="xs b muted">Marked safe</span>
                  {dismissedFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="row wrap sm muted"
                      style={{ gap: 12 }}
                    >
                      <span className="grow">{finding.label}</span>
                      <span>{finding.location}</span>
                      <Button
                        label="Restore"
                        variant="ghost"
                        size="sm"
                        icon="undo"
                        onClick={() => handleRestoreFinding(finding)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="xs muted" style={{ margin: "4px 0 0" }}>
                Found by deterministic detectors, not by AI guesses. Every value
                is masked before any AI sees the file.
              </p>
            </div>

            <div
              className="row wrap"
              style={{ gap: 10, justifyContent: "flex-end" }}
            >
              <Button
                label={
                  isBlocked ? "Allow sharing original" : "Block sharing original"
                }
                variant="secondary"
                size="md"
                icon="lock"
                onClick={handleToggleBlockOriginal}
              />
              <Button
                label={
                  hasRedactedCopy ? "Update redacted copy" : "Create redacted copy"
                }
                variant="primary"
                size="md"
                icon="redact"
                onClick={handleCreateRedactedCopy}
              />
            </div>
          </section>
        </div>

        {toast ? (
          <div role="status" className="toast" style={{ position: "fixed" }}>
            <span>{toast.msg}</span>
            {toast.undo && toast.undoLabel ? (
              <Button
                label={toast.undoLabel}
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
                  toastTimerRef.current = null
                  toast.undo?.()
                }}
              />
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
