"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Icon,
  PageHead,
  Seg,
  Sidebar,
} from "@workspace/ui/components/glashus"

type ActivityCategory = "All" | "Sharing" | "AI" | "Security" | "Files"

interface ActivityItem {
  id: string
  day: "Today" | "Yesterday"
  glyph: string
  accentTile: boolean
  title: string
  detail: string
  time: string
  categories: Array<Exclude<ActivityCategory, "All">>
}

const INITIAL_EVENTS: ActivityItem[] = [
  {
    id: "ev-1",
    day: "Today",
    glyph: "trash",
    accentTile: true,
    title: "47 files deleted",
    detail: "New device · Windows, Chrome",
    time: "12:38",
    categories: ["Files", "Security"],
  },
  {
    id: "ev-2",
    day: "Today",
    glyph: "sparkle",
    accentTile: false,
    title: "Gemini read tax-return-2025.pdf",
    detail: "Circle and Chat · 2 values redacted",
    time: "11:02",
    categories: ["AI"],
  },
  {
    id: "ev-3",
    day: "Today",
    glyph: "link",
    accentTile: false,
    title: "Link created for q3-pitch-deck.pdf",
    detail: "Expires in 7 days · PIN on",
    time: "09:40",
    categories: ["Sharing"],
  },
  {
    id: "ev-4",
    day: "Today",
    glyph: "flag",
    accentTile: true,
    title: "Canary triggered",
    detail: "passwords-backup.xlsx",
    time: "09:12",
    categories: ["Security"],
  },
  {
    id: "ev-5",
    day: "Yesterday",
    glyph: "upload",
    accentTile: false,
    title: "4 files uploaded",
    detail: "All clean after scan",
    time: "Nov 13",
    categories: ["Files"],
  },
  {
    id: "ev-6",
    day: "Yesterday",
    glyph: "shield",
    accentTile: false,
    title: "Redacted copy created",
    detail: "tax-return-2025.pdf",
    time: "Nov 13",
    categories: ["Sharing", "Security"],
  },
]

type AlertResolution = "open" | "restored" | "locked" | "acknowledged"

export default function ActivityPage() {
  const [filter, setFilter] = React.useState<ActivityCategory>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [events, setEvents] = React.useState<ActivityItem[]>(INITIAL_EVENTS)
  const [alertState, setAlertState] = React.useState<AlertResolution>("open")
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

  function handleAlertAction(action: Exclude<AlertResolution, "open">) {
    const prevAlert = alertState
    const prevEvents = events

    setAlertState(action)
    if (action === "restored") {
      setEvents((list) => [
        {
          id: `ev-restore-${Date.now()}`,
          day: "Today",
          glyph: "undo",
          accentTile: false,
          title: "47 files restored",
          detail: "Moved back out of Trash",
          time: "Just now",
          categories: ["Files", "Security"],
        },
        ...list,
      ])
      showToast("47 files restored from Trash", () => {
        setAlertState(prevAlert)
        setEvents(prevEvents)
        setToast(null)
      })
    } else if (action === "locked") {
      setEvents((list) => [
        {
          id: `ev-lock-${Date.now()}`,
          day: "Today",
          glyph: "lock",
          accentTile: true,
          title: "Account sessions locked",
          detail: "Signed out Windows, Chrome session",
          time: "Just now",
          categories: ["Security"],
        },
        ...list,
      ])
      showToast("Other sessions locked", () => {
        setAlertState(prevAlert)
        setEvents(prevEvents)
        setToast(null)
      })
    } else {
      showToast("Mass-change alert acknowledged", () => {
        setAlertState(prevAlert)
        setToast(null)
      })
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const visibleEvents = events.filter((ev) => {
    if (filter !== "All" && !ev.categories.includes(filter)) {
      return false
    }
    if (normalizedQuery) {
      const hay = `${ev.title} ${ev.detail} ${ev.time}`.toLowerCase()
      if (!hay.includes(normalizedQuery)) return false
    }
    return true
  })

  const todayEvents = visibleEvents.filter((e) => e.day === "Today")
  const yesterdayEvents = visibleEvents.filter((e) => e.day === "Yesterday")

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <Sidebar active="activity" />
      <main className="main">
        <PageHead
          title="Activity"
          sub="Everything that happened in your drive"
          cta="none"
          ctaIcon="upload"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {alertState === "open" ? (
          <div
            className="glass row wrap"
            style={{
              gap: 14,
              padding: "16px 20px",
              borderRadius: 20,
              borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <div className="tile">
              <Icon glyph="warn" size={18} />
            </div>
            <div className="grow col" style={{ gap: 2, minWidth: 200 }}>
              <span className="m">47 files deleted in 2 minutes</span>
              <span className="sm muted">
                From a new device at 12:38. This is unusual for your account.
              </span>
            </div>
            <Button
              label="Restore all"
              variant="primary"
              size="md"
              icon="undo"
              onClick={() => handleAlertAction("restored")}
            />
            <Button
              label="Lock account"
              variant="secondary"
              size="md"
              icon="lock"
              onClick={() => handleAlertAction("locked")}
            />
            <Button
              label="Acknowledge"
              variant="ghost"
              size="md"
              icon="check"
              onClick={() => handleAlertAction("acknowledged")}
            />
          </div>
        ) : (
          <div
            className="glass-soft row wrap between"
            style={{
              gap: 12,
              padding: "14px 20px",
              borderRadius: 20,
            }}
          >
            <div className="row" style={{ gap: 12 }}>
              <div className="tile n">
                <Icon
                  glyph={alertState === "locked" ? "lock" : "check"}
                  size={18}
                />
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span className="sm m">
                  {alertState === "restored"
                    ? "47 files restored"
                    : alertState === "locked"
                      ? "Account sessions locked"
                      : "Mass-change alert acknowledged"}
                </span>
                <span className="xs muted">
                  12:38 deletion alert resolved.
                </span>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Chip label="Resolved" tone="neutral" icon="check" />
              <Button
                label="Reopen"
                variant="ghost"
                size="sm"
                onClick={() => setAlertState("open")}
              />
            </div>
          </div>
        )}

        <div className="row wrap between">
          <Seg
            options={["All", "Sharing", "AI", "Security", "Files"]}
            value={filter}
            onChange={(val) => setFilter(val as ActivityCategory)}
            aria-label="Filter activity by category"
          />
        </div>

        <div
          className="glass"
          style={{ borderRadius: 20, overflow: "hidden" }}
        >
          {visibleEvents.length === 0 ? (
            <div
              className="col center"
              style={{ padding: "36px 20px", gap: 10 }}
            >
              <span className="m">No matching activity</span>
              <Button
                label="Show all activity"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilter("All")
                  setSearchQuery("")
                }}
              />
            </div>
          ) : (
            <>
              {todayEvents.length > 0 ? (
                <>
                  <div
                    className="navlabel"
                    style={{ padding: "14px 20px 6px" }}
                  >
                    Today
                  </div>
                  {todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="row"
                      style={{
                        padding: "12px 20px",
                        gap: 14,
                        borderBottom: "1px solid rgba(17,17,17,0.045)",
                      }}
                    >
                      <div
                        className={ev.accentTile ? "tile" : "tile n"}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                        }}
                      >
                        <Icon glyph={ev.glyph} size={15} />
                      </div>
                      <div className="grow col" style={{ gap: 2 }}>
                        <span className="sm m">{ev.title}</span>
                        <span className="xs muted">{ev.detail}</span>
                      </div>
                      <span className="xs muted">{ev.time}</span>
                    </div>
                  ))}
                </>
              ) : null}

              {yesterdayEvents.length > 0 ? (
                <>
                  <div
                    className="navlabel"
                    style={{ padding: "14px 20px 6px" }}
                  >
                    Yesterday
                  </div>
                  {yesterdayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="row"
                      style={{
                        padding: "12px 20px",
                        gap: 14,
                        borderBottom: "1px solid rgba(17,17,17,0.045)",
                      }}
                    >
                      <div
                        className={ev.accentTile ? "tile" : "tile n"}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                        }}
                      >
                        <Icon glyph={ev.glyph} size={15} />
                      </div>
                      <div className="grow col" style={{ gap: 2 }}>
                        <span className="sm m">{ev.title}</span>
                        <span className="xs muted">{ev.detail}</span>
                      </div>
                      <span className="xs muted">{ev.time}</span>
                    </div>
                  ))}
                </>
              ) : null}
            </>
          )}
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
