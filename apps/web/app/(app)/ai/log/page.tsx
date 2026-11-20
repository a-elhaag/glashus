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
import { glashusApi } from "@/lib/api"
import { formatTimeOrDate } from "@/lib/format"
import {
  unwrapApi,
  useAiLog,
  useInvalidateDrive,
  useMe,
} from "@/lib/queries"

export default function AiLogPage() {
  const { data: logData, isLoading, error } = useAiLog()
  const { data: me } = useMe()
  const invalidate = useInvalidateDrive()

  const [filter, setFilter] = React.useState<"All" | "Masked only">("All")
  const [search, setSearch] = React.useState("")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [toggling, setToggling] = React.useState(false)
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

  const aiMode = me?.user.aiMode ?? "ask"
  const isPaused = aiMode === "off"

  const toggleAiMode = async () => {
    setToggling(true)
    const nextMode = isPaused ? "ask" : "off"
    try {
      unwrapApi(
        await glashusApi.PATCH("/v1/me", {
          body: { aiMode: nextMode },
        })
      )
      invalidate()
      notify(
        nextMode === "off"
          ? "Paused all AI reads across your Drive"
          : "Resumed AI reads (Ask mode)"
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update AI mode.")
    } finally {
      setToggling(false)
    }
  }

  const reads = React.useMemo(() => logData?.reads ?? [], [logData])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return reads.filter((r) => {
      if (filter === "Masked only" && r.maskedCount === 0) return false
      if (q) {
        const hay =
          `${r.fileName} ${r.folderName} ${r.purpose} ${r.model} ${r.sentSummary}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [filter, reads, search])

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="ailog" />
      <main className="main">
        <PageHead
          title="AI access log"
          sub="Every file chunk Gemini inspected, folder consent state, and count of sensitive tokens masked beforehand."
          cta="Ask my files"
          ctaIcon="sparkle"
          ctaHref="/ai/ask"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div
          className="glass card row wrap between"
          style={{ padding: "14px 18px", gap: 12 }}
        >
          <div className="row" style={{ gap: 12 }}>
            <div className={isPaused ? "tile" : "tile n"}>
              <Icon glyph={isPaused ? "pause" : "sparkle"} size={18} />
            </div>
            <div className="col" style={{ gap: 2 }}>
              <span className="m">
                {isPaused
                  ? "AI reads are paused globally"
                  : `AI consent mode: ${aiMode.toUpperCase()}`}
              </span>
              <span className="xs muted">
                Every AI read checks folder consent first and persists a masked
                audit record here.
              </span>
            </div>
          </div>
          <Button
            label={
              toggling
                ? "Updating…"
                : isPaused
                  ? "Resume AI access"
                  : "Pause all AI"
            }
            variant={isPaused ? "primary" : "danger"}
            size="sm"
            icon={isPaused ? "play" : "pause"}
            disabled={toggling}
            onClick={() => void toggleAiMode()}
          />
        </div>

        <section
          aria-label="AI access summary"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">WEEKLY AI READS</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>
              {logData?.weeklyReads ?? 0}
            </span>
            <span className="xs muted">Logged in last 7 days</span>
          </div>
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">SENSITIVE VALUES MASKED</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>
              {logData?.totalMasked ?? 0}
            </span>
            <span className="xs muted">Never sent unmasked to Gemini</span>
          </div>
          <div className="glass card col" style={{ padding: 18, gap: 4 }}>
            <span className="xs muted">MONTHLY USAGE</span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>
              {me?.usage.aiReads ?? 0}
            </span>
            <span className="xs muted">Total requests this month</span>
          </div>
        </section>

        <section className="col" style={{ gap: 12 }}>
          <div className="row wrap between">
            <Seg
              options="All|Masked only"
              value={filter}
              onChange={(val) => {
                if (val === "All" || val === "Masked only") setFilter(val)
              }}
              aria-label="Filter AI reads"
            />
            <span className="xs muted">{filtered.length} logged reads</span>
          </div>

          <div
            className="glass"
            style={{ overflowX: "auto", borderRadius: 20 }}
          >
            <div style={{ minWidth: 740 }}>
              <div
                className="thead"
                style={{
                  gridTemplateColumns:
                    "minmax(0,2fr) 1fr 1.1fr 0.9fr 110px 44px",
                }}
              >
                <span>File</span>
                <span>Folder</span>
                <span>Purpose · Model</span>
                <span>Masked</span>
                <span>When</span>
                <span />
              </div>

              {isLoading ? (
                <div className="col center muted" style={{ padding: "36px 20px" }}>
                  <span className="sm">Loading AI access log…</span>
                </div>
              ) : error ? (
                <div
                  className="col center"
                  style={{ padding: "36px 20px", color: "var(--accent)" }}
                >
                  <span className="sm">
                    {error instanceof Error
                      ? error.message
                      : "Failed to load AI access log."}
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="col center"
                  style={{ padding: "40px 20px", gap: 6 }}
                >
                  <span className="h2">No AI reads recorded yet</span>
                  <span className="sm muted">
                    Every prompt in Ask my files writes a transparent log entry
                    here.
                  </span>
                </div>
              ) : (
                filtered.map((r) => {
                  const isOpen = expandedId === r.id
                  return (
                    <React.Fragment key={r.id}>
                      <div
                        className="trow"
                        style={{
                          gridTemplateColumns:
                            "minmax(0,2fr) 1fr 1.1fr 0.9fr 110px 44px",
                        }}
                      >
                        <div className="col" style={{ minWidth: 0, gap: 2 }}>
                          <span className="sm m ell">{r.fileName}</span>
                          <span className="xs muted">
                            Consent: {r.consentMode}
                          </span>
                        </div>
                        <span className="sm muted ell">{r.folderName}</span>
                        <div className="col" style={{ gap: 2 }}>
                          <span className="sm">{r.purpose}</span>
                          <span className="xs muted">{r.model}</span>
                        </div>
                        <div>
                          <Chip
                            label={`${r.maskedCount} masked`}
                            tone={r.maskedCount > 0 ? "accent" : "clear"}
                          />
                        </div>
                        <span className="xs muted">
                          {formatTimeOrDate(r.time)}
                        </span>
                        <Button
                          label={isOpen ? "Collapse" : "Expand"}
                          icon={isOpen ? "chevD" : "chevR"}
                          iconOnly
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedId((prev) =>
                              prev === r.id ? null : r.id
                            )
                          }
                        />
                      </div>
                      {isOpen ? (
                        <div
                          className="glass-soft col"
                          style={{
                            margin: "0 12px 10px",
                            padding: 12,
                            borderRadius: 12,
                            gap: 4,
                          }}
                        >
                          <span className="xs muted">
                            EXCERPT SUMMARY SENT TO GEMINI
                          </span>
                          <span className="sm">{r.sentSummary}</span>
                        </div>
                      ) : null}
                    </React.Fragment>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {toast ? (
          <div className="toast">
            <Icon glyph="check" size={14} /> {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}
