"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Icon,
  PageHead,
  Seg,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { formatTimeOrDate, getDayBucket } from "@/lib/format"
import { type AuditEventData, useAudit } from "@/lib/queries"

type CategoryFilter = "All" | "Sharing" | "AI" | "Security" | "Files"

const GLYPH_MAP: Record<AuditEventData["category"], string> = {
  files: "file",
  sharing: "share",
  ai: "sparkle",
  security: "shield",
}

const TONE_MAP: Record<
  AuditEventData["category"],
  "neutral" | "accent" | "clear"
> = {
  files: "neutral",
  sharing: "accent",
  ai: "clear",
  security: "accent",
}

export default function ActivityPage() {
  const { data: events = [], isLoading, error } = useAudit()
  const [filter, setFilter] = React.useState<CategoryFilter>("All")
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((ev) => {
      if (filter === "Sharing" && ev.category !== "sharing") return false
      if (filter === "AI" && ev.category !== "ai") return false
      if (filter === "Security" && ev.category !== "security") return false
      if (filter === "Files" && ev.category !== "files") return false
      if (q) {
        const hay =
          `${ev.title} ${ev.detail} ${ev.actor} ${ev.action} ${ev.target}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [events, filter, search])

  const grouped = React.useMemo(() => {
    const groups: Record<"Today" | "Yesterday" | "Earlier", AuditEventData[]> =
      {
        Today: [],
        Yesterday: [],
        Earlier: [],
      }
    for (const ev of filtered) {
      groups[getDayBucket(ev.time)].push(ev)
    }
    return groups
  }, [filtered])

  const buckets: Array<"Today" | "Yesterday" | "Earlier"> = [
    "Today",
    "Yesterday",
    "Earlier",
  ]

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="activity" />
      <main className="main">
        <PageHead
          title="Activity timeline"
          sub="Immutable audit stream of uploads, scans, share links, AI reads, and security events."
          cta="AI access log"
          ctaIcon="sparkle"
          ctaHref="/ai/log"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="row wrap between" style={{ gap: 10 }}>
          <Seg
            options="All|Sharing|AI|Security|Files"
            value={filter}
            onChange={(val) => {
              if (
                val === "All" ||
                val === "Sharing" ||
                val === "AI" ||
                val === "Security" ||
                val === "Files"
              ) {
                setFilter(val)
              }
            }}
            aria-label="Filter activity events"
          />
          <span className="xs muted">{filtered.length} events</span>
        </div>

        {isLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Loading audit events…</span>
          </div>
        ) : error ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm" style={{ color: "var(--accent)" }}>
              {error instanceof Error
                ? error.message
                : "Could not load audit trail."}
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="glass card col center"
            style={{ padding: "40px 24px", gap: 8 }}
          >
            <span className="h2">No activity matching filter</span>
            <span className="sm muted">
              Upload a file, create a share link, or ask AI to populate the
              audit log.
            </span>
            <div style={{ marginTop: 6 }}>
              <Button
                label="Upload a file"
                variant="primary"
                size="sm"
                icon="upload"
                href="/drive/upload"
              />
            </div>
          </div>
        ) : (
          <div className="col" style={{ gap: 18 }}>
            {buckets.map((bucket) => {
              const items = grouped[bucket]
              if (items.length === 0) return null
              return (
                <section key={bucket} className="col" style={{ gap: 10 }}>
                  <span className="xs muted">{bucket.toUpperCase()}</span>
                  <div
                    className="glass"
                    style={{ borderRadius: 20, overflow: "hidden" }}
                  >
                    {items.map((ev) => (
                      <div
                        key={ev.id}
                        className="trow"
                        style={{
                          gridTemplateColumns:
                            "42px minmax(0, 1.8fr) 1fr 110px",
                        }}
                      >
                        <div className="tile" style={{ width: 34, height: 34 }}>
                          <Icon glyph={GLYPH_MAP[ev.category]} size={15} />
                        </div>
                        <div className="col" style={{ minWidth: 0, gap: 2 }}>
                          <span className="sm m ell">{ev.title}</span>
                          <span className="xs muted ell">
                            {ev.detail || ev.action}
                            {ev.device ? ` · ${ev.device}` : ""}
                            {ev.ip ? ` · ${ev.ip}` : ""}
                          </span>
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          <Chip
                            label={ev.category}
                            tone={TONE_MAP[ev.category]}
                          />
                          <span className="xs muted ell">{ev.actor}</span>
                        </div>
                        <span
                          className="xs muted"
                          style={{ textAlign: "right" }}
                        >
                          {formatTimeOrDate(ev.time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
