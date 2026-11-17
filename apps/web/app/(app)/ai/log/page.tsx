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
  Sidebar,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

type PurposeFilter =
  | "All"
  | "Chat"
  | "Ask files"
  | "Naming"
  | "Version diff"
  | "Embedding"
  | "Cleanup"

type MaskFilter = "All reads" | "Masked only"

interface AiLogEntry {
  id: string
  time: string
  ext: string
  fileName: string
  purpose: Exclude<PurposeFilter, "All">
  whatSent: string
  model: string
  masked: boolean
  folder: string
  consentMode: string
  detailNote: string
}

const AI_LOG_ENTRIES: AiLogEntry[] = [
  {
    id: "log-1",
    time: "12:41",
    ext: "PDF",
    fileName: "tax-return-2025.pdf",
    purpose: "Chat",
    whatSent: "Text with 2 values masked",
    model: "Gemini",
    masked: true,
    folder: "/Finance",
    consentMode: "Ask each time (approved)",
    detailNote:
      "Replaced ID and IBAN with temporary tokens before sending to Vertex AI. Prompt injection check passed.",
  },
  {
    id: "log-2",
    time: "11:02",
    ext: "PDF",
    fileName: "lease-agreement.pdf",
    purpose: "Ask files",
    whatSent: "3 passages, no masking needed",
    model: "Gemini",
    masked: false,
    folder: "/Personal",
    consentMode: "Ask each time (approved)",
    detailNote:
      "Sent pages 4 and 7 excerpts for end-date and notice-period citations.",
  },
  {
    id: "log-3",
    time: "10:15",
    ext: "JPG",
    fileName: "IMG_4032.jpg",
    purpose: "Naming",
    whatSent: "Image only, EXIF removed",
    model: "Gemini",
    masked: true,
    folder: "/Photos",
    consentMode: "Allowed",
    detailNote:
      "GPS coordinates, camera serial and timestamp were stripped before generating filename suggestion.",
  },
  {
    id: "log-4",
    time: "Nov 13",
    ext: "DOC",
    fileName: "thesis-draft-v4.docx",
    purpose: "Version diff",
    whatSent: "v2 and v3 text",
    model: "Gemini",
    masked: false,
    folder: "/Thesis",
    consentMode: "Allowed",
    detailNote:
      "Compared section structure between version 2 and version 3; zero PII patterns detected.",
  },
  {
    id: "log-5",
    time: "Nov 13",
    ext: "PDF",
    fileName: "q3-pitch-deck.pdf",
    purpose: "Embedding",
    whatSent: "768-number summary, no text",
    model: "Gemini",
    masked: false,
    folder: "/Work",
    consentMode: "Allowed",
    detailNote:
      "Generated 768-dimension vector index for Ask my files; raw slides are never stored with the vector.",
  },
  {
    id: "log-6",
    time: "Nov 12",
    ext: "CSV",
    fileName: "survey-data.csv",
    purpose: "Cleanup",
    whatSent: "Column names only",
    model: "Gemini",
    masked: true,
    folder: "/Thesis",
    consentMode: "Allowed",
    detailNote:
      "Respondent email and phone rows stayed local; only schema header strings were inspected.",
  },
]

const PURPOSE_OPTIONS: PurposeFilter[] = [
  "All",
  "Chat",
  "Ask files",
  "Naming",
  "Version diff",
  "Embedding",
  "Cleanup",
]

export default function AiLogPage() {
  const [paused, setPaused] = React.useState(false)
  const [purposeFilter, setPurposeFilter] = React.useState<PurposeFilter>("All")
  const [maskFilter, setMaskFilter] = React.useState<MaskFilter>("All reads")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
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

  function handleTogglePause() {
    const prev = paused
    const next = !prev
    setPaused(next)
    showToast(
      next ? "All AI access paused across folders" : "AI access resumed",
      () => {
        setPaused(prev)
        setToast(null)
      }
    )
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredEntries = AI_LOG_ENTRIES.filter((entry) => {
    if (purposeFilter !== "All" && entry.purpose !== purposeFilter) {
      return false
    }
    if (maskFilter === "Masked only" && !entry.masked) {
      return false
    }
    if (normalizedQuery) {
      const hay =
        `${entry.fileName} ${entry.purpose} ${entry.whatSent} ${entry.folder}`.toLowerCase()
      if (!hay.includes(normalizedQuery)) return false
    }
    return true
  })

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <Sidebar active="ailog" />
      <main className="main">
        <PageHead
          title="AI access log"
          sub="Every time Gemini touched a file, and what it saw"
          cta="none"
          ctaIcon="upload"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="glass card row wrap" style={{ gap: 16 }}>
          <div className="tile">
            <Icon glyph={paused ? "pause" : "sparkle"} size={18} />
          </div>
          <div className="grow col" style={{ gap: 2, minWidth: 220 }}>
            <span className="m">
              {paused
                ? "AI access: Paused for all folders"
                : "AI access: Ask each time"}
            </span>
            <span className="sm muted">
              {paused
                ? "No new Gemini reads can run until you resume."
                : "Change it per folder in Settings."}
            </span>
          </div>
          <Button
            label={paused ? "Resume AI" : "Pause all AI"}
            variant={paused ? "primary" : "danger"}
            size="md"
            icon={paused ? "play" : "pause"}
            onClick={handleTogglePause}
          />
          <Button
            label="Settings"
            variant="secondary"
            size="md"
            icon="sliders"
            href="Settings.dc.html"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div
            className="glass card col"
            style={{ gap: 4, padding: "18px 20px" }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              14
            </span>
            <span className="sm muted">AI reads this week</span>
          </div>
          <div
            className="glass card col"
            style={{ gap: 4, padding: "18px 20px" }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              9
            </span>
            <span className="sm muted">Values masked before sending</span>
          </div>
          <div
            className="glass card col"
            style={{ gap: 4, padding: "18px 20px" }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "var(--accent)",
              }}
            >
              0
            </span>
            <span className="sm muted">Reads without consent</span>
          </div>
        </div>

        <div className="row wrap between" style={{ gap: 12 }}>
          <Seg
            options={PURPOSE_OPTIONS}
            value={purposeFilter}
            onChange={(val) => setPurposeFilter(val as PurposeFilter)}
            aria-label="Filter by AI purpose"
          />
          <Seg
            options={["All reads", "Masked only"]}
            value={maskFilter}
            onChange={(val) => setMaskFilter(val as MaskFilter)}
            aria-label="Filter by masking"
          />
        </div>

        <div
          className="glass"
          style={{ overflowX: "auto", borderRadius: 20 }}
        >
          <div style={{ minWidth: 760 }}>
            <div
              className="thead"
              style={{ gridTemplateColumns: "0.8fr 2fr 1fr 1.6fr 0.8fr" }}
            >
              <span>Time</span>
              <span>File</span>
              <span>Purpose</span>
              <span>What was sent</span>
              <span>Model</span>
            </div>

            {filteredEntries.length === 0 ? (
              <div
                className="col center"
                style={{ padding: "36px 20px", gap: 10 }}
              >
                <span className="m">No AI reads match this filter</span>
                <Button
                  label="Reset filters"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPurposeFilter("All")
                    setMaskFilter("All reads")
                    setSearchQuery("")
                  }}
                />
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = selectedId === entry.id
                return (
                  <React.Fragment key={entry.id}>
                    <div
                      className={`trow${isSelected ? " sel" : ""}`}
                      style={{
                        gridTemplateColumns: "0.8fr 2fr 1fr 1.6fr 0.8fr",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setSelectedId(isSelected ? null : entry.id)
                      }
                    >
                      <span className="sm muted">{entry.time}</span>
                      <div className="row" style={{ minWidth: 0 }}>
                        <FileTile ext={entry.ext} tone={0} size={36} />
                        <div
                          className="col"
                          style={{ gap: 1, minWidth: 0 }}
                        >
                          <Link
                            href={resolveBoardHref("Viewer.dc.html")}
                            className="ell m"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {entry.fileName}
                          </Link>
                        </div>
                      </div>
                      <div>
                        <Chip label={entry.purpose} tone="neutral" />
                      </div>
                      <span className="sm muted">{entry.whatSent}</span>
                      <span className="sm muted">{entry.model}</span>
                    </div>
                    {isSelected ? (
                      <div
                        className="glass-soft row wrap between"
                        style={{
                          padding: "12px 20px",
                          gap: 12,
                          borderBottom: "1px solid rgba(17,17,17,0.06)",
                        }}
                      >
                        <div className="col" style={{ gap: 2, minWidth: 260 }}>
                          <span className="xs b">
                            {entry.folder} · {entry.consentMode}
                          </span>
                          <span className="xs muted">{entry.detailNote}</span>
                        </div>
                        <Button
                          label="Open file"
                          variant="ghost"
                          size="sm"
                          icon="eye"
                          href="Viewer.dc.html"
                        />
                      </div>
                    ) : null}
                  </React.Fragment>
                )
              })
            )}
          </div>
        </div>
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
