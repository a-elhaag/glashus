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

type RiskItem = {
  id: "tax" | "env" | "exp"
  title: string
  detail: string
  action: string
  msg: string
}

type VisibilityTone = "clear" | "neutral" | "accent"

type RecentFileRow = {
  id: string
  name: string
  ext: string
  vis: string
  visTone: VisibilityTone
  tone: 0 | 1 | 2
  findings: string
  flagged: boolean
  isShared: boolean
  modified: string
  size: string
}

const ALL_RISKS: RiskItem[] = [
  {
    id: "tax",
    title: "tax-return-2025.pdf is public",
    detail: "Contains a national ID and an IBAN. Anyone with the link can open it.",
    action: "Share redacted copy",
    msg: "Public link replaced with a redacted copy",
  },
  {
    id: "env",
    title: "api-config.env holds a live API key",
    detail: "Shared with 1 person. Revoke access and rotate the key.",
    action: "Revoke access",
    msg: "Access revoked for 1 person",
  },
  {
    id: "exp",
    title: "4 links never expire",
    detail: "Oldest was created 5 months ago and still works.",
    action: "Expire in 7 days",
    msg: "4 links now expire in 7 days",
  },
]

const VISIBILITY_PRESETS: Record<
  "priv" | "shared" | "link" | "pub",
  { vis: string; visTone: VisibilityTone; tone: 0 | 1 | 2; isShared: boolean }
> = {
  priv: { vis: "Private", visTone: "clear", tone: 0, isShared: false },
  shared: { vis: "Shared", visTone: "neutral", tone: 1, isShared: true },
  link: { vis: "Link · 2 days left", visTone: "neutral", tone: 1, isShared: true },
  pub: { vis: "Public", visTone: "accent", tone: 2, isShared: true },
}

export default function DriveHomePage() {
  const [fixed, setFixed] = React.useState<string[]>([])
  const [last, setLast] = React.useState<{ id: string; msg: string } | null>(null)
  const [filter, setFilter] = React.useState<"All" | "Shared" | "Flagged">("All")
  const [search, setSearch] = React.useState("")

  const fix = React.useCallback((id: string, msg: string) => {
    setFixed((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setLast({ id, msg })
  }, [])

  const undo = React.useCallback(() => {
    if (!last) return
    const targetId = last.id
    setFixed((prev) => prev.filter((x) => x !== targetId))
    setLast(null)
  }, [last])

  const risks = React.useMemo(
    () => ALL_RISKS.filter((r) => !fixed.includes(r.id)),
    [fixed]
  )

  const taxFixed = fixed.includes("tax")
  const envFixed = fixed.includes("env")
  const expFixed = fixed.includes("exp")

  const score =
    62 + (taxFixed ? 16 : 0) + (envFixed ? 14 : 0) + (expFixed ? 8 : 0)
  const scoreWidth = `${score}%`
  const gapWidth = `${100 - score}%`
  const left = risks.length
  const scoreLine =
    left === 0
      ? "All clear. Nothing is exposed beyond the people you chose."
      : `${left} ${left === 1 ? "thing needs" : "things need"} your attention. Fixing them takes under a minute.`

  const publicCount = taxFixed ? 0 : 1
  const findingCount = taxFixed ? 2 : 4

  const files = React.useMemo<RecentFileRow[]>(() => {
    const makeRow = (
      id: string,
      name: string,
      ext: string,
      preset: (typeof VISIBILITY_PRESETS)[keyof typeof VISIBILITY_PRESETS],
      findings: string,
      flagged: boolean,
      modified: string,
      size: string
    ): RecentFileRow => ({
      id,
      name,
      ext,
      vis: preset.vis,
      visTone: preset.visTone,
      tone: preset.tone,
      isShared: preset.isShared,
      findings,
      flagged,
      modified,
      size,
    })

    return [
      makeRow(
        "tax",
        "tax-return-2025.pdf",
        "PDF",
        taxFixed ? VISIBILITY_PRESETS.link : VISIBILITY_PRESETS.pub,
        taxFixed ? "Redacted copy shared" : "National ID, IBAN",
        !taxFixed,
        "Oct 14",
        "1.2 MB"
      ),
      makeRow(
        "env",
        "api-config.env",
        "ENV",
        envFixed ? VISIBILITY_PRESETS.priv : VISIBILITY_PRESETS.shared,
        "API key",
        true,
        "Nov 2",
        "2 KB"
      ),
      makeRow(
        "pitch",
        "q3-pitch-deck.pdf",
        "PDF",
        VISIBILITY_PRESETS.link,
        "None",
        false,
        "Nov 9",
        "8.4 MB"
      ),
      makeRow(
        "passport",
        "passport-scan.jpg",
        "JPG",
        VISIBILITY_PRESETS.priv,
        "ID number",
        true,
        "Sep 30",
        "3.1 MB"
      ),
      makeRow(
        "thesis",
        "thesis-draft-v4.docx",
        "DOC",
        VISIBILITY_PRESETS.priv,
        "None",
        false,
        "Nov 12",
        "640 KB"
      ),
      makeRow(
        "photos",
        "team-photos.zip",
        "ZIP",
        VISIBILITY_PRESETS.shared,
        "None",
        false,
        "Aug 21",
        "214 MB"
      ),
    ]
  }, [taxFixed, envFixed])

  const filteredFiles = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return files.filter((f) => {
      if (filter === "Shared" && !f.isShared) return false
      if (filter === "Flagged" && !f.flagged) return false
      if (query) {
        const hay = `${f.name} ${f.vis} ${f.findings}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })
  }, [files, filter, search])

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <Sidebar active="drive" />
      <main className="main">
        <PageHead
          title="Good afternoon, Anas"
          sub="Here is who can see your files right now."
          cta="Upload"
          ctaIcon="upload"
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
              <i style={{ width: scoreWidth, transition: "width 280ms ease-out" }} />
              <i
                style={{
                  width: gapWidth,
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
                  {publicCount}
                </span>
                <span className="xs muted">Public links</span>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>
                  {findingCount}
                </span>
                <span className="xs muted">Sensitive finds</span>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>2</span>
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
              <Link
                href={resolveBoardHref("Activity.dc.html")}
                className="sm muted"
              >
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
                  margin: "4px 0",
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
                  label={r.action}
                  variant="primary"
                  size="sm"
                  onClick={() => fix(r.id, r.msg)}
                />
              </div>
            ))}

            {left === 0 ? (
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

              {filteredFiles.map((f) => (
                <div
                  key={f.id}
                  className="trow"
                  style={{
                    gridTemplateColumns: "2.4fr 1.3fr 1.6fr 1fr 0.7fr 40px",
                  }}
                >
                  <div className="row" style={{ minWidth: 0 }}>
                    <FileTile ext={f.ext} tone={f.tone} size={36} />
                    <Link
                      href={resolveBoardHref("Viewer.dc.html")}
                      className="ell m"
                    >
                      {f.name}
                    </Link>
                  </div>
                  <div>
                    <Chip label={f.vis} tone={f.visTone} />
                  </div>
                  <span
                    className="sm"
                    style={{
                      color: f.flagged ? "var(--accent)" : "var(--ink3)",
                      fontWeight: f.flagged ? 500 : 400,
                    }}
                  >
                    {f.findings}
                  </span>
                  <span className="sm muted">{f.modified}</span>
                  <span className="sm muted">{f.size}</span>
                  <Button
                    label="Share"
                    variant="ghost"
                    size="sm"
                    icon="share"
                    iconOnly
                    href="Share.dc.html"
                  />
                </div>
              ))}

              {filteredFiles.length === 0 ? (
                <div
                  className="col center muted"
                  style={{ padding: "36px 20px", gap: 4 }}
                >
                  <span className="sm m">No files match this filter.</span>
                  <span className="xs muted">
                    Switch tabs or clear the search box to see all files.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {last ? (
          <div role="status" aria-live="polite" className="toast">
            <span>{last.msg}</span>
            <Button
              label="Undo"
              variant="secondary"
              size="sm"
              onClick={undo}
            />
          </div>
        ) : null}
      </main>
    </div>
  )
}
