"use client"

import * as React from "react"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  PageHead,
  Seg,
  Sidebar,
} from "@workspace/ui/components/glashus"

type MapMode = "Exposure" | "Knowledge graph"

interface GraphNode {
  id: string
  x: number
  y: number
  size: number
  radius: number
  glyph: string
  iconSize: number
  label: string
  kind: "owner" | "audience" | "person" | "ai" | "file" | "topic"
  ext?: string
  exposedByDefault?: boolean
  publicLink: string
  people: string
  aiReads: string
  sensitive: string
  fixLabel?: string
  viewerHref?: string
  kgSummary?: string
  kgLinks?: string
}

interface GraphEdge {
  id: string
  from: string
  to: string
  exposed?: boolean
  fixGroup?: string
}

const DEFAULT_EXPOSURE_NODE: GraphNode = {
  id: "you",
  x: 520,
  y: 330,
  size: 64,
  radius: 21,
  glyph: "user",
  iconSize: 25,
  label: "You",
  kind: "owner",
  publicLink: "Owner account",
  people: "Only you",
  aiReads: "6 this week",
  sensitive: "All keys wrapped via KMS",
}

const EXPOSURE_NODES: GraphNode[] = [
  DEFAULT_EXPOSURE_NODE,
  {
    id: "public-web",
    x: 180,
    y: 150,
    size: 52,
    radius: 17,
    glyph: "globe",
    iconSize: 20,
    label: "Public web",
    kind: "audience",
    exposedByDefault: true,
    publicLink: "1 active link",
    people: "Anyone with URL",
    aiReads: "N/A",
    sensitive: "ID, IBAN reachable",
    fixLabel: "Revoke public links",
  },
  {
    id: "sara",
    x: 860,
    y: 130,
    size: 44,
    radius: 14,
    glyph: "user",
    iconSize: 17,
    label: "sara@studio.dev",
    kind: "person",
    publicLink: "External guest",
    people: "1 collaborator",
    aiReads: "None",
    sensitive: "API key in api-config.env",
    fixLabel: "Remove external access",
  },
  {
    id: "gemini",
    x: 880,
    y: 420,
    size: 48,
    radius: 16,
    glyph: "sparkle",
    iconSize: 19,
    label: "Gemini (AI)",
    kind: "ai",
    publicLink: "Consented folders only",
    people: "Ask each time",
    aiReads: "14 this week",
    sensitive: "9 values masked",
  },
  {
    id: "four-people",
    x: 200,
    y: 500,
    size: 44,
    radius: 14,
    glyph: "users",
    iconSize: 17,
    label: "4 people",
    kind: "person",
    publicLink: "PIN required",
    people: "4 invited recipients",
    aiReads: "None",
    sensitive: "None detected",
  },
  {
    id: "tax-return",
    x: 520,
    y: 100,
    size: 46,
    radius: 15,
    glyph: "file",
    iconSize: 18,
    label: "tax-return-2025.pdf",
    kind: "file",
    ext: "PDF",
    exposedByDefault: true,
    publicLink: "Public",
    people: "3",
    aiReads: "2 this week",
    sensitive: "ID, IBAN",
    fixLabel: "Fix exposure",
    viewerHref: "Viewer.dc.html",
  },
  {
    id: "api-config",
    x: 520,
    y: 560,
    size: 46,
    radius: 15,
    glyph: "key",
    iconSize: 18,
    label: "api-config.env",
    kind: "file",
    ext: "ENV",
    exposedByDefault: true,
    publicLink: "Shared externally",
    people: "1 (sara@studio.dev)",
    aiReads: "0 (AI off)",
    sensitive: "API key, token",
    fixLabel: "Fix exposure",
    viewerHref: "Viewer.dc.html",
  },
  {
    id: "thesis-draft",
    x: 740,
    y: 280,
    size: 40,
    radius: 13,
    glyph: "file",
    iconSize: 16,
    label: "thesis-draft-v4.docx",
    kind: "file",
    ext: "DOC",
    publicLink: "Private",
    people: "1 (You)",
    aiReads: "3 this week",
    sensitive: "None",
    viewerHref: "Viewer.dc.html",
  },
  {
    id: "pitch-deck",
    x: 310,
    y: 330,
    size: 40,
    radius: 13,
    glyph: "file",
    iconSize: 16,
    label: "q3-pitch-deck.pdf",
    kind: "file",
    ext: "PDF",
    publicLink: "PIN protected",
    people: "4 people",
    aiReads: "1 (embedding)",
    sensitive: "None",
    viewerHref: "Viewer.dc.html",
  },
]

const EXPOSURE_EDGES: GraphEdge[] = [
  { id: "e1", from: "you", to: "tax-return", exposed: true, fixGroup: "tax-return" },
  { id: "e2", from: "tax-return", to: "public-web", exposed: true, fixGroup: "tax-return" },
  { id: "e3", from: "you", to: "api-config", exposed: true, fixGroup: "api-config" },
  { id: "e4", from: "api-config", to: "sara", exposed: true, fixGroup: "api-config" },
  { id: "e5", from: "you", to: "thesis-draft" },
  { id: "e6", from: "thesis-draft", to: "gemini" },
  { id: "e7", from: "you", to: "pitch-deck" },
  { id: "e8", from: "pitch-deck", to: "four-people" },
  { id: "e9", from: "tax-return", to: "gemini" },
  { id: "e10", from: "you", to: "four-people" },
]

const KNOWLEDGE_NODES: GraphNode[] = [
  {
    id: "kg-thesis",
    x: 520,
    y: 310,
    size: 62,
    radius: 20,
    glyph: "folder",
    iconSize: 24,
    label: "Thesis cluster",
    kind: "topic",
    publicLink: "Consented folder",
    people: "You",
    aiReads: "4 indexed files",
    sensitive: "4 contact tokens",
    kgSummary: "Connected by methodology citations and survey cohort IDs.",
    kgLinks: "thesis-draft-v4.docx, survey-data.csv, references.pdf",
  },
  {
    id: "kg-draft",
    x: 280,
    y: 180,
    size: 48,
    radius: 16,
    glyph: "file",
    iconSize: 18,
    label: "thesis-draft-v4.docx",
    kind: "file",
    ext: "DOC",
    exposedByDefault: true,
    publicLink: "Private",
    people: "You",
    aiReads: "3 this week",
    sensitive: "None",
    viewerHref: "Viewer.dc.html",
    kgSummary: "Cites survey-data.csv in Section 3 and 14 entries in references.pdf.",
    kgLinks: "survey-data.csv · references.pdf",
  },
  {
    id: "kg-survey",
    x: 240,
    y: 440,
    size: 46,
    radius: 15,
    glyph: "table",
    iconSize: 18,
    label: "survey-data.csv",
    kind: "file",
    ext: "CSV",
    publicLink: "Private",
    people: "You",
    aiReads: "Column schema only",
    sensitive: "4 masked emails",
    viewerHref: "Viewer.dc.html",
    kgSummary: "Referenced by figure-3-results.png and thesis-draft-v4.docx.",
    kgLinks: "thesis-draft-v4.docx · figure-3-results.png",
  },
  {
    id: "kg-refs",
    x: 520,
    y: 110,
    size: 44,
    radius: 14,
    glyph: "doc",
    iconSize: 17,
    label: "references.pdf",
    kind: "file",
    ext: "PDF",
    publicLink: "Private",
    people: "You",
    aiReads: "768-dim vector",
    sensitive: "None",
    viewerHref: "Viewer.dc.html",
    kgSummary: "Bibliography shared across thesis-draft-v4.docx and defense-slides.pdf.",
    kgLinks: "thesis-draft-v4.docx · defense-slides.pdf",
  },
  {
    id: "kg-lease",
    x: 800,
    y: 180,
    size: 46,
    radius: 15,
    glyph: "file",
    iconSize: 18,
    label: "lease-agreement.pdf",
    kind: "file",
    ext: "PDF",
    exposedByDefault: true,
    publicLink: "Private",
    people: "You",
    aiReads: "Ask files (2 citations)",
    sensitive: "Masked on read",
    viewerHref: "Viewer.dc.html",
    kgSummary: "Linked by landlord entity and 60-day notice deadline to landlord-letter.docx.",
    kgLinks: "landlord-letter.docx · /Personal",
  },
  {
    id: "kg-letter",
    x: 840,
    y: 420,
    size: 44,
    radius: 14,
    glyph: "doc",
    iconSize: 17,
    label: "landlord-letter.docx",
    kind: "file",
    ext: "DOC",
    publicLink: "Private",
    people: "You",
    aiReads: "Not used",
    sensitive: "None",
    viewerHref: "Viewer.dc.html",
    kgSummary: "Shares address and end-date terms with lease-agreement.pdf.",
    kgLinks: "lease-agreement.pdf",
  },
  {
    id: "kg-slides",
    x: 540,
    y: 530,
    size: 44,
    radius: 14,
    glyph: "file",
    iconSize: 17,
    label: "defense-slides.pdf",
    kind: "file",
    ext: "PDF",
    publicLink: "Private",
    people: "You",
    aiReads: "768-dim vector",
    sensitive: "None",
    viewerHref: "Viewer.dc.html",
    kgSummary: "Summarizes findings from thesis-draft-v4.docx and survey-data.csv.",
    kgLinks: "thesis-draft-v4.docx · references.pdf",
  },
]

const KNOWLEDGE_EDGES: GraphEdge[] = [
  { id: "ke1", from: "kg-thesis", to: "kg-draft", exposed: true },
  { id: "ke2", from: "kg-draft", to: "kg-survey", exposed: true },
  { id: "ke3", from: "kg-draft", to: "kg-refs", exposed: true },
  { id: "ke4", from: "kg-thesis", to: "kg-slides" },
  { id: "ke5", from: "kg-slides", to: "kg-survey" },
  { id: "ke6", from: "kg-slides", to: "kg-refs" },
  { id: "ke7", from: "kg-lease", to: "kg-letter", exposed: true },
  { id: "ke8", from: "kg-thesis", to: "kg-lease" },
]

export default function ExposurePage() {
  const [mode, setMode] = React.useState<MapMode>("Exposure")
  const [selectedId, setSelectedId] = React.useState<string>("tax-return")
  const [fixedIds, setFixedIds] = React.useState<string[]>([])
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

  const nodes = mode === "Exposure" ? EXPOSURE_NODES : KNOWLEDGE_NODES
  const edges = mode === "Exposure" ? EXPOSURE_EDGES : KNOWLEDGE_EDGES
  const nodeMap = React.useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  )

  const selectedNode =
    nodeMap.get(selectedId) ?? nodes[0] ?? DEFAULT_EXPOSURE_NODE

  function showToast(message: string, undo?: () => void) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, undo })
    timerRef.current = setTimeout(() => setToast(null), 5000)
  }

  function isNodeExposed(node: GraphNode): boolean {
    if (mode !== "Exposure") return Boolean(node.exposedByDefault)
    if (node.id === "public-web") {
      return !fixedIds.includes("tax-return")
    }
    if (node.id === "sara") {
      return !fixedIds.includes("api-config")
    }
    return Boolean(node.exposedByDefault) && !fixedIds.includes(node.id)
  }

  function isEdgeExposed(edge: GraphEdge): boolean {
    if (!edge.exposed) return false
    if (mode === "Exposure" && edge.fixGroup) {
      return !fixedIds.includes(edge.fixGroup)
    }
    return true
  }

  function handleModeChange(next: string) {
    const nextMode = next as MapMode
    setMode(nextMode)
    setSelectedId(nextMode === "Exposure" ? "tax-return" : "kg-draft")
  }

  function handleFixNode(node: GraphNode) {
    const prev = fixedIds
    const targetFixId =
      node.id === "public-web"
        ? "tax-return"
        : node.id === "sara"
          ? "api-config"
          : node.id
    if (fixedIds.includes(targetFixId)) return
    setFixedIds((ids) => [...ids, targetFixId])
    showToast(`Exposure fixed for ${node.label}`, () => {
      setFixedIds(prev)
      setToast(null)
    })
  }

  const selectedIsExposed =
    mode === "Exposure" && isNodeExposed(selectedNode)

  const displayPublicLink =
    mode === "Exposure" && !selectedIsExposed && selectedNode.exposedByDefault
      ? "Private (fixed)"
      : selectedNode.publicLink

  const displayPeople =
    mode === "Exposure" &&
    selectedNode.id === "api-config" &&
    !selectedIsExposed
      ? "1 (You)"
      : mode === "Exposure" &&
          selectedNode.id === "tax-return" &&
          !selectedIsExposed
        ? "1 (You)"
        : selectedNode.people

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <Sidebar active="exposure" />
      <main className="main">
        <PageHead
          title="Exposure map"
          sub="Files, people, links and AI on one picture"
          cta="none"
          ctaIcon="upload"
        />

        <div className="row wrap between">
          <div className="row" style={{ gap: 10 }}>
            <Seg
              options={["Exposure", "Knowledge graph"]}
              value={mode}
              onChange={handleModeChange}
              aria-label="Graph view mode"
            />
          </div>
          <div className="row" style={{ gap: 14 }}>
            <span className="row xs muted" style={{ gap: 6 }}>
              <i
                style={{
                  width: 18,
                  height: 2,
                  background: "var(--accent)",
                  display: "inline-block",
                }}
              />
              {mode === "Exposure" ? "Exposed route" : "Shared citation"}
            </span>
            <span className="row xs muted" style={{ gap: 6 }}>
              <i
                style={{
                  width: 18,
                  borderTop: "1.5px dashed rgba(17,17,17,0.4)",
                  display: "inline-block",
                }}
              />
              {mode === "Exposure" ? "Private route" : "Related folder"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div
            className="glass"
            style={{
              flex: "1 1 640px",
              minWidth: 0,
              height: 640,
              borderRadius: 22,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="0 0 1040 640"
              width="100%"
              height="640"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0 }}
            >
              {edges.map((edge) => {
                const a = nodeMap.get(edge.from)
                const b = nodeMap.get(edge.to)
                if (!a || !b) return null
                const exposed = isEdgeExposed(edge)
                const connectedToSelected =
                  edge.from === selectedNode.id || edge.to === selectedNode.id
                return (
                  <line
                    key={edge.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={
                      exposed
                        ? "#0F766E"
                        : connectedToSelected
                          ? "rgba(17,17,17,0.5)"
                          : "rgba(17,17,17,0.22)"
                    }
                    strokeWidth={exposed ? 2 : connectedToSelected ? 2 : 1.5}
                    strokeDasharray={exposed ? undefined : "4 5"}
                  />
                )
              })}
            </svg>

            {nodes.map((node) => {
              const exposed = isNodeExposed(node)
              const selected = node.id === selectedNode.id
              return (
                <button
                  key={node.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedId(node.id)}
                  style={{
                    position: "absolute",
                    left: `${(node.x / 1040) * 100}%`,
                    top: `${(node.y / 640) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="glass"
                    style={{
                      width: node.size,
                      height: node.size,
                      borderRadius: node.radius,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: exposed ? "var(--accent)" : "var(--ink)",
                      borderColor: exposed
                        ? "var(--accent)"
                        : selected
                          ? "var(--ink)"
                          : undefined,
                      background: exposed
                        ? "color-mix(in srgb, var(--accent) 12%, rgba(255,255,255,0.7))"
                        : undefined,
                      boxShadow: selected
                        ? exposed
                          ? "0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent)"
                          : "0 0 0 3px rgba(17,17,17,0.14)"
                        : undefined,
                    }}
                  >
                    <Icon glyph={node.glyph} size={node.iconSize} />
                  </div>
                  <span
                    className="xs m"
                    style={{
                      background: selected
                        ? "var(--ink)"
                        : "rgba(255,255,255,0.7)",
                      color: selected ? "#fff" : "var(--ink)",
                      padding: "2px 8px",
                      borderRadius: 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {node.label}
                  </span>
                </button>
              )
            })}
          </div>

          <aside
            className="glass col"
            style={{
              flex: "0 0 320px",
              borderRadius: 22,
              padding: 20,
              gap: 14,
              alignSelf: "flex-start",
            }}
          >
            <div className="row" style={{ gap: 12 }}>
              {selectedNode.ext ? (
                <FileTile
                  ext={selectedNode.ext}
                  tone={selectedIsExposed ? 2 : 0}
                  size={40}
                />
              ) : (
                <div className={selectedIsExposed ? "tile" : "tile n"}>
                  <Icon glyph={selectedNode.glyph} size={18} />
                </div>
              )}
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span className="m ell">{selectedNode.label}</span>
                <span className="xs muted">Selected</span>
              </div>
            </div>

            <hr className="hr" />

            {mode === "Exposure" ? (
              <>
                <div className="row between sm">
                  <span className="muted">Public link</span>
                  <Chip
                    label={displayPublicLink}
                    tone={selectedIsExposed ? "accent" : "neutral"}
                  />
                </div>
                <div className="row between sm">
                  <span className="muted">People</span>
                  <span className="m">{displayPeople}</span>
                </div>
                <div className="row between sm">
                  <span className="muted">AI reads</span>
                  <span className="m">{selectedNode.aiReads}</span>
                </div>
                <div className="row between sm">
                  <span className="muted">Sensitive</span>
                  <span className="m">{selectedNode.sensitive}</span>
                </div>
              </>
            ) : (
              <>
                <div className="col" style={{ gap: 4 }}>
                  <span className="xs b muted">Connections</span>
                  <span className="sm">{selectedNode.kgSummary}</span>
                </div>
                <div className="row between sm">
                  <span className="muted">Linked files</span>
                  <span className="m ell" style={{ maxWidth: 180 }}>
                    {selectedNode.kgLinks}
                  </span>
                </div>
                <div className="row between sm">
                  <span className="muted">AI reads</span>
                  <span className="m">{selectedNode.aiReads}</span>
                </div>
              </>
            )}

            <hr className="hr" />

            <div className="row" style={{ gap: 8 }}>
              {mode === "Exposure" &&
              selectedIsExposed &&
              selectedNode.fixLabel ? (
                <Button
                  label={selectedNode.fixLabel}
                  variant="primary"
                  size="md"
                  icon="redact"
                  onClick={() => handleFixNode(selectedNode)}
                />
              ) : mode === "Exposure" && selectedNode.exposedByDefault ? (
                <Chip label="Exposure fixed" tone="neutral" icon="check" />
              ) : null}

              {selectedNode.viewerHref ? (
                <Button
                  label="Open"
                  variant="secondary"
                  size="md"
                  href={selectedNode.viewerHref}
                />
              ) : (
                <Button
                  label="Ask my files"
                  variant="secondary"
                  size="md"
                  icon="sparkle"
                  href="Ask.dc.html"
                />
              )}
            </div>
          </aside>
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
