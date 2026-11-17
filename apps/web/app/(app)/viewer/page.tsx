"use client"

import * as React from "react"
import { Button, Chip, FileTile, Icon } from "@workspace/ui/components/glashus"

type PreviewKind =
  | "pdf"
  | "img"
  | "doc"
  | "sheet"
  | "text"
  | "video"
  | "audio"
  | "zip"
  | "none"

interface ViewerFile {
  name: string
  ext: string
  kind: string
  k: PreviewKind
  size: string
  tone: 0 | 1 | 2
  checker?: boolean
  dim?: string
}

const FILES: readonly [ViewerFile, ...ViewerFile[]] = [
  {
    name: "tax-return-2025.pdf",
    ext: "PDF",
    kind: "PDF",
    k: "pdf",
    size: "1.2 MB",
    tone: 2,
  },
  {
    name: "site-plan.png",
    ext: "PNG",
    kind: "PNG",
    k: "img",
    size: "2.8 MB",
    tone: 0,
    checker: true,
    dim: "2400 × 1600 · transparent background",
  },
  {
    name: "team-photo.jpg",
    ext: "JPG",
    kind: "JPEG",
    k: "img",
    size: "3.1 MB",
    tone: 1,
    dim: "4032 × 3024 · EXIF location removed",
  },
  {
    name: "thesis-draft-v4.docx",
    ext: "DOC",
    kind: "Word",
    k: "doc",
    size: "640 KB",
    tone: 0,
  },
  {
    name: "customers.xlsx",
    ext: "XLS",
    kind: "Excel",
    k: "sheet",
    size: "96 KB",
    tone: 0,
  },
  {
    name: "customers.csv",
    ext: "CSV",
    kind: "CSV",
    k: "sheet",
    size: "82 KB",
    tone: 0,
  },
  {
    name: "api-config.env",
    ext: "ENV",
    kind: "Text",
    k: "text",
    size: "2 KB",
    tone: 2,
  },
  {
    name: "demo-walkthrough.mp4",
    ext: "MP4",
    kind: "Video",
    k: "video",
    size: "84 MB",
    tone: 0,
  },
  {
    name: "voice-memo.m4a",
    ext: "M4A",
    kind: "Audio",
    k: "audio",
    size: "1.6 MB",
    tone: 0,
  },
  {
    name: "project-assets.zip",
    ext: "ZIP",
    kind: "Archive",
    k: "zip",
    size: "214 MB",
    tone: 1,
  },
  {
    name: "firmware.bin",
    ext: "BIN",
    kind: "Binary",
    k: "none",
    size: "12 MB",
    tone: 0,
  },
]

const TABS = ["Details", "Circle & Chat", "Access"] as const
type TabName = (typeof TABS)[number]

const CHECKER_BG =
  "linear-gradient(45deg, #E6E7EB 25%, transparent 25%, transparent 75%, #E6E7EB 75%), linear-gradient(45deg, #E6E7EB 25%, #fff 25%, #fff 75%, #E6E7EB 75%)"

const SHEET_HEADERS = ["A", "B", "C", "D", "E"] as const
const SHEET_COLUMNS = ["Customer", "Plan", "Seats", "MRR", "Region"] as const
const SHEET_ROWS = [
  ["Northwind", "Team", "24", "$1,200", "EU"],
  ["Contoso", "Pro", "8", "$320", "US"],
  ["Fabrikam", "Team", "40", "$2,000", "EU"],
  ["Tailspin", "Free", "3", "$0", "APAC"],
  ["Adventure Works", "Pro", "12", "$480", "US"],
  ["Litware", "Team", "19", "$950", "EU"],
] as const

const WAVEFORM_BARS = [
  51, 29, 60, 16, 19, 22, 56, 17, 74, 37, 14, 21, 65, 63, 18, 40, 21, 64, 17,
  25, 38, 17, 60, 16, 38, 15, 27, 47, 63, 28, 25, 49, 33, 23, 34, 57, 22, 18,
  17, 36, 73, 64, 50, 69, 68, 56, 48, 41, 33, 41, 20, 48, 73, 53, 67, 46, 19,
  25, 75, 63, 31, 53, 29, 72, 63, 15, 19, 50, 53, 54, 73, 68,
] as const

const ZIP_ENTRIES = [
  { glyph: "folder", name: "images/", size: "—" },
  { glyph: "image", name: "images/logo.svg", size: "4 KB" },
  { glyph: "image", name: "images/hero.png", size: "1.4 MB" },
  { glyph: "doc", name: "README.md", size: "2 KB" },
  { glyph: "code", name: "src/index.ts", size: "11 KB" },
  { glyph: "table", name: "data/export.csv", size: "82 KB" },
] as const

const VERSIONS = [
  { id: "v3", label: "v3 · today" },
  { id: "v2", label: "v2 · Nov 9" },
  { id: "v1", label: "v1 · Oct 30" },
] as const

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m-1",
    role: "user",
    text: "Summarize this and tell me what is risky to share.",
  },
  {
    id: "m-2",
    role: "assistant",
    text: "A personal tax return for 2025. It holds a national ID and bank details, so share the redacted copy only.",
  },
]

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export default function ViewerPage() {
  const [sel, setSel] = React.useState(0)
  const [tab, setTab] = React.useState<TabName>("Details")
  const [zoom, setZoom] = React.useState(100)
  const [rotation, setRotation] = React.useState(0)
  const [expanded, setExpanded] = React.useState(false)

  const [videoPlaying, setVideoPlaying] = React.useState(false)
  const [audioPlaying, setAudioPlaying] = React.useState(false)
  const [audioSec, setAudioSec] = React.useState(42)

  const [activeVersion, setActiveVersion] = React.useState("v3")
  const [aiDiffOpen, setAiDiffOpen] = React.useState(false)

  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [draft, setDraft] = React.useState("")

  const [toast, setToast] = React.useState<{
    message: string
    undo?: () => void
  } | null>(null)
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cur = FILES[sel] ?? FILES[0]

  const showToast = React.useCallback(
    (message: string, undo?: () => void) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
      setToast({ message, undo })
      toastTimerRef.current = setTimeout(() => {
        setToast(null)
        toastTimerRef.current = null
      }, 4500)
    },
    []
  )

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [expanded])

  React.useEffect(() => {
    if (!audioPlaying) return
    const timer = setInterval(() => {
      setAudioSec((prev) => {
        if (prev >= 110) {
          setAudioPlaying(false)
          return 42
        }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [audioPlaying])

  const handleSelectFile = (index: number) => {
    setSel(index)
    setRotation(0)
    setVideoPlaying(false)
    setAudioPlaying(false)
    setAiDiffOpen(false)
  }

  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25))
  const handleZoomIn = () => setZoom((z) => Math.min(200, z + 25))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  const handleRestore = (versionId: string, versionLabel: string) => {
    const previous = activeVersion
    setActiveVersion(versionId)
    showToast(`Restored ${versionLabel}`, () => {
      setActiveVersion(previous)
    })
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const question = draft.trim()
    if (!question) return
    const reply =
      cur.tone === 2
        ? `Checked ${cur.name} with redaction enabled. Sensitive tokens stay masked before Gemini reads the file.`
        : `Inspected ${cur.name} (${cur.kind}, ${cur.size}). No sensitive findings are exposed in this view.`
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: question },
      { id: `a-${Date.now() + 1}`, role: "assistant", text: reply },
    ])
    setDraft("")
  }

  const imgBg = cur.checker
    ? CHECKER_BG
    : "linear-gradient(135deg, #DCE1EE, #F4F5F8)"
  const audioProgressPct = Math.round((audioSec / 110) * 100)
  const activeBarCount = Math.round((audioSec / 110) * WAVEFORM_BARS.length)
  const hasTransform = zoom !== 100 || rotation !== 0

  return (
    <div
      className="plain"
      style={{
        minHeight: "100vh",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
      }}
    >
      <header
        className="glass row wrap between"
        style={{ borderRadius: 16, padding: "10px 14px", gap: 12 }}
      >
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <Button
            label="Back to Drive"
            variant="ghost"
            size="md"
            icon="chevL"
            href="Main.dc.html"
            iconOnly
          />
          <div className="col" style={{ gap: 1, minWidth: 0 }}>
            <span className="m ell">{cur.name}</span>
            <span className="xs muted">
              {cur.kind} · {cur.size}
            </span>
          </div>
          <Chip label="Redacted view" tone="accent" />
        </div>

        <div className="row" style={{ gap: 6 }}>
          <Button
            label="Zoom out"
            variant="ghost"
            size="md"
            icon="zoomOut"
            iconOnly
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            style={zoom <= 50 ? { opacity: 0.45 } : undefined}
          />
          <span className="sm m" style={{ width: 44, textAlign: "center" }}>
            {zoom}%
          </span>
          <Button
            label="Zoom in"
            variant="ghost"
            size="md"
            icon="zoomIn"
            iconOnly
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            style={zoom >= 200 ? { opacity: 0.45 } : undefined}
          />
          <Button
            label="Rotate"
            variant="ghost"
            size="md"
            icon="rotate"
            iconOnly
            onClick={handleRotate}
          />
          <Button
            label={expanded ? "Exit full screen" : "Full screen"}
            variant="ghost"
            size="md"
            icon="maximize"
            iconOnly
            onClick={() => setExpanded((v) => !v)}
          />
          <span
            style={{
              width: 1,
              height: 20,
              background: "rgba(17,17,17,0.1)",
              margin: "0 6px",
            }}
          />
          <Button
            label="Download"
            variant="secondary"
            size="md"
            icon="download"
            onClick={() => showToast(`Downloading ${cur.name}`)}
          />
          <Button
            label="Share"
            variant="primary"
            size="md"
            icon="share"
            href="Share.dc.html"
          />
        </div>
      </header>

      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 780 }}>
        {!expanded ? (
          <aside
            className="glass col"
            style={{
              width: 260,
              flex: "none",
              borderRadius: 20,
              padding: 12,
              gap: 2,
            }}
            aria-label="Files"
          >
            <span className="navlabel" style={{ paddingTop: 4 }}>
              Supported types
            </span>
            {FILES.map((f, i) => {
              const active = i === sel
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => handleSelectFile(i)}
                  className={`nav${active ? " on" : ""}`}
                  style={{
                    border: 0,
                    background: active ? undefined : "transparent",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <FileTile ext={f.ext} tone={f.tone} size={28} />
                  <span className="grow ell">{f.name}</span>
                </button>
              )
            })}
          </aside>
        ) : null}

        <section
          className="glass"
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 20,
            overflow: "auto",
            background: "rgba(255,255,255,0.35)",
          }}
          aria-label="Preview"
        >
          <div
            style={
              hasTransform
                ? {
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin:
                      rotation % 360 !== 0 ? "center center" : "center top",
                    transition: "transform var(--d-base) var(--e-out)",
                  }
                : undefined
            }
          >
            {cur.k === "pdf" ? (
              <div
                className="col"
                style={{ gap: 20, alignItems: "center", padding: "28px 0" }}
              >
                <div
                  className="sheet"
                  style={{
                    width: 520,
                    padding: "48px 52px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                  }}
                >
                  <div className="row between">
                    <span style={{ fontSize: 20, fontWeight: 600 }}>
                      Tax return 2025
                    </span>
                    <span className="xs muted">Page 1 of 3</span>
                  </div>
                  <div className="line" style={{ width: "40%" }} />
                  <div className="row sm" style={{ gap: 10, marginTop: 8 }}>
                    <span className="muted" style={{ width: 90 }}>
                      National ID
                    </span>
                    <span className="redact" style={{ width: 120 }} />
                  </div>
                  <div className="row sm" style={{ gap: 10 }}>
                    <span className="muted" style={{ width: 90 }}>
                      IBAN
                    </span>
                    <span className="redact" style={{ width: 210 }} />
                  </div>
                  <div className="line" />
                  <div className="line" style={{ width: "92%" }} />
                  <div className="line" style={{ width: "86%" }} />
                  <div className="line" style={{ width: "70%" }} />
                  <div className="line" style={{ marginTop: 10 }} />
                  <div className="line" style={{ width: "88%" }} />
                  <div className="line" style={{ width: "54%" }} />
                  <div
                    className="line"
                    style={{ marginTop: 10, width: "96%" }}
                  />
                  <div className="line" style={{ width: "80%" }} />
                  <div style={{ position: "absolute", right: 14, top: 62 }}>
                    <Chip label="2 masked" tone="accent" />
                  </div>
                </div>
                <div
                  className="sheet"
                  style={{ width: 520, height: 120, opacity: 0.7 }}
                />
              </div>
            ) : null}

            {cur.k === "img" ? (
              <div className="col center" style={{ padding: 28 }}>
                <div
                  style={{
                    width: 640,
                    height: 420,
                    borderRadius: 6,
                    boxShadow: "0 10px 30px rgba(30,32,45,0.14)",
                    overflow: "hidden",
                    position: "relative",
                    backgroundColor: "#fff",
                    backgroundImage: imgBg,
                    backgroundSize: "24px 24px",
                    backgroundPosition: "0 0, 12px 12px",
                  }}
                >
                  <svg
                    viewBox="0 0 640 420"
                    width="640"
                    height="420"
                    aria-label="Image preview"
                    role="img"
                  >
                    <rect
                      x="70"
                      y="60"
                      width="200"
                      height="140"
                      rx="10"
                      fill="rgba(15,118,110,0.16)"
                      stroke="#0F766E"
                      strokeWidth="2"
                    />
                    <rect
                      x="300"
                      y="60"
                      width="270"
                      height="90"
                      rx="10"
                      fill="rgba(17,17,17,0.08)"
                      stroke="#111"
                      strokeWidth="2"
                    />
                    <rect
                      x="300"
                      y="170"
                      width="120"
                      height="180"
                      rx="10"
                      fill="rgba(17,17,17,0.05)"
                      stroke="#111"
                      strokeWidth="2"
                    />
                    <rect
                      x="440"
                      y="170"
                      width="130"
                      height="180"
                      rx="10"
                      fill="rgba(15,118,110,0.1)"
                      stroke="#0F766E"
                      strokeWidth="2"
                    />
                    <rect
                      x="70"
                      y="230"
                      width="200"
                      height="120"
                      rx="10"
                      fill="rgba(17,17,17,0.05)"
                      stroke="#111"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <span className="xs muted" style={{ marginTop: 14 }}>
                  {cur.dim ?? ""}
                </span>
              </div>
            ) : null}

            {cur.k === "doc" ? (
              <div
                className="col"
                style={{ alignItems: "center", padding: "28px 0", gap: 12 }}
              >
                <div
                  className="sheet"
                  style={{
                    width: 520,
                    padding: 56,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Thesis draft, version 4
                  </span>
                  <div
                    className="line"
                    style={{ width: "30%", marginBottom: 8 }}
                  />
                  <span className="xs b">1. Introduction</span>
                  <div className="line" />
                  <div className="line" style={{ width: "94%" }} />
                  <div className="line" style={{ width: "88%" }} />
                  <div className="line" style={{ width: "60%" }} />
                  <span className="xs b" style={{ marginTop: 10 }}>
                    2. Related work
                  </span>
                  <div className="line" />
                  <div className="line" style={{ width: "90%" }} />
                  <div className="line" style={{ width: "72%" }} />
                </div>
                <span className="xs muted">
                  Converted to PDF on the server for a safe preview
                </span>
              </div>
            ) : null}

            {cur.k === "sheet" ? (
              <div style={{ padding: 28 }}>
                <div className="sheet" style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 560 }}>
                    <div
                      className="row"
                      style={{
                        height: 32,
                        padding: "0 12px",
                        borderBottom: "1px solid rgba(17,17,17,0.08)",
                        gap: 10,
                        background: "rgba(17,17,17,0.03)",
                      }}
                    >
                      <span className="mono muted">fx</span>
                      <span className="mono">=SUM(D2:D7)</span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "36px 1.6fr 1fr 0.7fr 0.9fr 0.8fr",
                        fontSize: 13,
                      }}
                    >
                      <div />
                      {SHEET_HEADERS.map((col) => (
                        <div
                          key={col}
                          style={{
                            padding: "6px 10px",
                            textAlign: "center",
                            color: "var(--ink3)",
                            background: "rgba(17,17,17,0.03)",
                            borderLeft: "1px solid rgba(17,17,17,0.06)",
                          }}
                        >
                          {col}
                        </div>
                      ))}

                      <div
                        style={{
                          padding: "9px 0",
                          textAlign: "center",
                          color: "var(--ink3)",
                          background: "rgba(17,17,17,0.03)",
                          borderTop: "1px solid rgba(17,17,17,0.06)",
                        }}
                      >
                        1
                      </div>
                      {SHEET_COLUMNS.map((heading) => (
                        <div
                          key={heading}
                          style={{
                            padding: "9px 10px",
                            borderTop: "1px solid rgba(17,17,17,0.06)",
                            borderLeft: "1px solid rgba(17,17,17,0.06)",
                            fontWeight: 600,
                          }}
                        >
                          {heading}
                        </div>
                      ))}

                      {SHEET_ROWS.map((row, rowIdx) => (
                        <React.Fragment key={row[0]}>
                          <div
                            style={{
                              padding: "9px 0",
                              textAlign: "center",
                              color: "var(--ink3)",
                              background: "rgba(17,17,17,0.03)",
                              borderTop: "1px solid rgba(17,17,17,0.06)",
                            }}
                          >
                            {rowIdx + 2}
                          </div>
                          {row.map((cell, colIdx) => (
                            <div
                              key={`${rowIdx}-${colIdx}`}
                              style={{
                                padding: "9px 10px",
                                borderTop: "1px solid rgba(17,17,17,0.06)",
                                borderLeft: "1px solid rgba(17,17,17,0.06)",
                                textAlign:
                                  colIdx === 2 || colIdx === 3
                                    ? "right"
                                    : undefined,
                              }}
                            >
                              {cell}
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {cur.k === "text" ? (
              <div style={{ padding: 28 }}>
                <div
                  className="sheet"
                  style={{ padding: "18px 0", overflowX: "auto" }}
                >
                  <div style={{ minWidth: 520 }}>
                    <div
                      className="row mono"
                      style={{ gap: 16, padding: "3px 18px" }}
                    >
                      <span
                        className="muted"
                        style={{ width: 18, textAlign: "right" }}
                      >
                        1
                      </span>
                      <span># Deploy settings</span>
                    </div>
                    <div
                      className="row mono"
                      style={{ gap: 16, padding: "3px 18px" }}
                    >
                      <span
                        className="muted"
                        style={{ width: 18, textAlign: "right" }}
                      >
                        2
                      </span>
                      <span>PROJECT_ID=glashus-prod</span>
                    </div>
                    <div
                      className="row mono"
                      style={{ gap: 16, padding: "3px 18px" }}
                    >
                      <span
                        className="muted"
                        style={{ width: 18, textAlign: "right" }}
                      >
                        3
                      </span>
                      <span>REGION=europe-west1</span>
                    </div>
                    <div
                      className="row mono"
                      style={{
                        gap: 16,
                        padding: "3px 18px",
                        background:
                          "color-mix(in srgb, var(--accent) 8%, transparent)",
                      }}
                    >
                      <span
                        className="muted"
                        style={{ width: 18, textAlign: "right" }}
                      >
                        4
                      </span>
                      <span>API_KEY=••••••••••••••••</span>
                      <span
                        className="chip chip-accent"
                        style={{ marginLeft: "auto" }}
                      >
                        secret masked
                      </span>
                    </div>
                    <div
                      className="row mono"
                      style={{
                        gap: 16,
                        padding: "3px 18px",
                        background:
                          "color-mix(in srgb, var(--accent) 8%, transparent)",
                      }}
                    >
                      <span
                        className="muted"
                        style={{ width: 18, textAlign: "right" }}
                      >
                        5
                      </span>
                      <span>DB_URL=postgres://••••••••@db</span>
                      <span
                        className="chip chip-accent"
                        style={{ marginLeft: "auto" }}
                      >
                        secret masked
                      </span>
                    </div>
                    <div
                      className="row mono"
                      style={{ gap: 16, padding: "3px 18px" }}
                    >
                      <span
                        className="muted"
                        style={{ width: 18, textAlign: "right" }}
                      >
                        6
                      </span>
                      <span>LOG_LEVEL=info</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {cur.k === "video" ? (
              <div className="col center" style={{ padding: 28 }}>
                <div
                  style={{
                    width: 640,
                    height: 360,
                    borderRadius: 12,
                    background: "linear-gradient(145deg, #2A2D36, #14161B)",
                    position: "relative",
                    boxShadow: "0 14px 40px rgba(30,32,45,0.25)",
                  }}
                >
                  <div
                    className="col center"
                    style={{ position: "absolute", inset: 0 }}
                  >
                    <button
                      type="button"
                      aria-label={videoPlaying ? "Pause video" : "Play video"}
                      onClick={() => setVideoPlaying((v) => !v)}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 64,
                        border: 0,
                        background: "rgba(255,255,255,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <Icon
                        glyph={videoPlaying ? "pause" : "play"}
                        size={26}
                      />
                    </button>
                  </div>
                  <div
                    className="row"
                    style={{
                      position: "absolute",
                      left: 16,
                      right: 16,
                      bottom: 14,
                      gap: 12,
                      color: "#fff",
                    }}
                  >
                    <span className="xs">
                      {videoPlaying ? "02:15" : "02:14"}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.25)",
                      }}
                    >
                      <div
                        style={{
                          width: videoPlaying ? "35%" : "32%",
                          height: 4,
                          borderRadius: 4,
                          background: "#fff",
                        }}
                      />
                    </div>
                    <span className="xs">06:48</span>
                  </div>
                </div>
                <span className="xs muted" style={{ marginTop: 14 }}>
                  1920×1080 · H.264 · streamed from a signed URL
                </span>
              </div>
            ) : null}

            {cur.k === "audio" ? (
              <div className="col center" style={{ padding: 28, gap: 18 }}>
                <div className="glass card col" style={{ width: 560, gap: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      height: 80,
                    }}
                  >
                    {WAVEFORM_BARS.map((height, idx) => (
                      <span
                        key={idx}
                        style={{
                          flex: 1,
                          borderRadius: 3,
                          background:
                            idx < activeBarCount
                              ? "var(--ink)"
                              : "rgba(17,17,17,0.2)",
                          height,
                        }}
                      />
                    ))}
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    <Button
                      label={audioPlaying ? "Pause" : "Play"}
                      variant="dark"
                      size="md"
                      icon={audioPlaying ? "pause" : "play"}
                      iconOnly
                      onClick={() => setAudioPlaying((v) => !v)}
                    />
                    <span className="xs muted">
                      {formatDuration(audioSec)}
                    </span>
                    <div className="bar grow">
                      <i style={{ width: `${audioProgressPct}%` }} />
                    </div>
                    <span className="xs muted">01:50</span>
                  </div>
                </div>
              </div>
            ) : null}

            {cur.k === "zip" ? (
              <div style={{ padding: 28 }}>
                <div
                  className="glass"
                  style={{ borderRadius: 16, overflow: "hidden" }}
                >
                  {ZIP_ENTRIES.map((entry) => (
                    <div
                      key={entry.name}
                      className="row"
                      style={{
                        padding: "11px 18px",
                        borderBottom: "1px solid rgba(17,17,17,0.05)",
                        gap: 12,
                      }}
                    >
                      <Icon glyph={entry.glyph} size={16} />
                      <span className="grow sm">{entry.name}</span>
                      <span className="xs muted">{entry.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {cur.k === "none" ? (
              <div
                className="col center"
                style={{ padding: "80px 28px", gap: 14 }}
              >
                <div
                  className="tile n"
                  style={{ width: 64, height: 64, borderRadius: 18 }}
                >
                  <Icon glyph="file" size={28} />
                </div>
                <span className="h2">No preview for .bin files</span>
                <p
                  className="p muted"
                  style={{ maxWidth: 360, margin: 0 }}
                >
                  This type is not rendered in the browser. The file stays in
                  quarantine rules and scan results still apply.
                </p>
                <Button
                  label="Download file"
                  variant="secondary"
                  size="md"
                  icon="download"
                  onClick={() => showToast(`Downloading ${cur.name}`)}
                />
              </div>
            ) : null}
          </div>
        </section>

        {!expanded ? (
          <aside
            className="glass col"
            style={{
              width: 340,
              flex: "none",
              borderRadius: 20,
              padding: 14,
              gap: 14,
            }}
            aria-label="Details"
          >
            <div
              className="seg"
              role="tablist"
              style={{ alignSelf: "stretch" }}
            >
              {TABS.map((t) => {
                const active = t === tab
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={active ? "on" : undefined}
                    style={{ flex: 1 }}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                )
              })}
            </div>

            {tab === "Details" ? (
              <div className="col" style={{ gap: 14 }}>
                <div className="col" style={{ gap: 8 }}>
                  <div className="row between sm">
                    <span className="muted">Type</span>
                    <span className="m">{cur.kind}</span>
                  </div>
                  <div className="row between sm">
                    <span className="muted">Size</span>
                    <span className="m">{cur.size}</span>
                  </div>
                  <div className="row between sm">
                    <span className="muted">Modified</span>
                    <span className="m">Nov 12, 2026</span>
                  </div>
                  <div className="row between sm">
                    <span className="muted">Scan</span>
                    <Chip label="Clean" tone="clear" icon="check" />
                  </div>
                </div>
                <hr className="hr" />
                <div className="col" style={{ gap: 8 }}>
                  <span className="sm b">Versions</span>
                  {VERSIONS.map((v) => {
                    const isCurrent = activeVersion === v.id
                    return (
                      <div key={v.id} className="row between sm">
                        <span className={isCurrent ? undefined : "muted"}>
                          {v.label}
                        </span>
                        {isCurrent ? (
                          <Chip label="Current" tone="dark" />
                        ) : (
                          <Button
                            label="Restore"
                            variant="ghost"
                            size="sm"
                            icon="undo"
                            onClick={() => handleRestore(v.id, v.label)}
                          />
                        )}
                      </div>
                    )
                  })}
                  <Button
                    label="Explain changes with AI"
                    variant="secondary"
                    size="sm"
                    icon="sparkle"
                    onClick={() => setAiDiffOpen((v) => !v)}
                  />
                  {aiDiffOpen ? (
                    <div
                      className="glass-soft col"
                      style={{
                        borderRadius: 12,
                        padding: "10px 12px",
                        gap: 4,
                      }}
                    >
                      <span className="xs b">Summary ({cur.name})</span>
                      <span className="xs muted" style={{ lineHeight: 1.5 }}>
                        Latest revision updated metadata and kept 2 sensitive
                        values masked before AI access.
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "Circle & Chat" ? (
              <div className="col" style={{ gap: 12, flex: 1 }}>
                <div
                  className="glass-soft row"
                  style={{
                    borderRadius: 12,
                    padding: "10px 12px",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "var(--accent)" }}>
                    <Icon glyph="shield" size={16} />
                  </span>
                  <span className="xs muted" style={{ lineHeight: 1.5 }}>
                    Gemini sees this file only. 2 sensitive values are redacted
                    before sending.
                  </span>
                </div>
                <div
                  className="col"
                  style={{ gap: 10, flex: 1, overflowY: "auto" }}
                >
                  {messages.map((msg) =>
                    msg.role === "user" ? (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: "flex-end",
                          maxWidth: "85%",
                          padding: "10px 12px",
                          borderRadius: "14px 14px 4px 14px",
                          background: "var(--ink)",
                          color: "#fff",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.text}
                      </div>
                    ) : (
                      <div
                        key={msg.id}
                        className="glass-soft"
                        style={{
                          maxWidth: "92%",
                          padding: "10px 12px",
                          borderRadius: "14px 14px 14px 4px",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.text}
                      </div>
                    )
                  )}
                </div>
                <form
                  onSubmit={handleChatSubmit}
                  className="row"
                  style={{ gap: 8 }}
                >
                  <input
                    className="input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Ask about this file"
                    aria-label="Ask about this file"
                  />
                  <Button
                    type="submit"
                    label="Send"
                    variant="primary"
                    size="md"
                    icon="send"
                    iconOnly
                  />
                </form>
              </div>
            ) : null}

            {tab === "Access" ? (
              <div className="col" style={{ gap: 12 }}>
                <span className="sm b">Who can open this</span>
                <div className="row sm" style={{ gap: 10 }}>
                  <span
                    className="tile n"
                    style={{ width: 32, height: 32, borderRadius: 10 }}
                  >
                    U1
                  </span>
                  <span className="grow">You</span>
                  <span className="muted">Owner</span>
                </div>
                <div className="row sm" style={{ gap: 10 }}>
                  <span
                    className="tile n"
                    style={{ width: 32, height: 32, borderRadius: 10 }}
                  >
                    U2
                  </span>
                  <span className="grow">sara@studio.dev</span>
                  <span className="muted">View</span>
                </div>
                <div className="row sm" style={{ gap: 10 }}>
                  <span
                    className="tile"
                    style={{ width: 32, height: 32, borderRadius: 10 }}
                  >
                    U3
                  </span>
                  <span className="grow">Public link</span>
                  <Chip label="Public" tone="accent" />
                </div>
                <hr className="hr" />
                <span className="sm b">AI reads</span>
                <span className="xs muted">
                  Gemini read this file 2 times this week. Both with redaction
                  on.
                </span>
                <Button
                  label="Open AI access log"
                  variant="ghost"
                  size="sm"
                  icon="clock"
                  href="AILog.dc.html"
                />
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
