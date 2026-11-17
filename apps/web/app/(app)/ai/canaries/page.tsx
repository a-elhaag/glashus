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

type AlertChannel = "Email" | "Push" | "Both"
type CanaryStatus = "Triggered" | "Armed" | "Paused"

interface CanaryItem {
  id: string
  name: string
  folder: string
  status: CanaryStatus
  detail: string
  channel: AlertChannel
}

interface TriggerRecord {
  id: string
  when: string
  canary: string
  source: string
  result: "Alert sent" | "Ignored"
}

const INITIAL_CANARIES: CanaryItem[] = [
  {
    id: "can-1",
    name: "passwords-backup.xlsx",
    folder: "/Personal",
    status: "Triggered",
    detail: "Opened 2 hours ago from an unknown location",
    channel: "Both",
  },
  {
    id: "can-2",
    name: "bank-statements-2024.zip",
    folder: "/Finance",
    status: "Armed",
    detail: "Never opened. Checked every request.",
    channel: "Both",
  },
]

const INITIAL_HISTORY: TriggerRecord[] = [
  {
    id: "hist-1",
    when: "Today, 12:41",
    canary: "passwords-backup.xlsx",
    source: "Unknown network · Chrome on Windows",
    result: "Alert sent",
  },
  {
    id: "hist-2",
    when: "Oct 18, 09:12",
    canary: "bank-statements-2024.zip",
    source: "Your own account · test",
    result: "Ignored",
  },
]

export default function CanariesPage() {
  const [canaries, setCanaries] = React.useState<CanaryItem[]>(INITIAL_CANARIES)
  const [history, setHistory] = React.useState<TriggerRecord[]>(INITIAL_HISTORY)
  const [newName, setNewName] = React.useState("client-contracts-2026.pdf")
  const [channel, setChannel] = React.useState<AlertChannel>("Both")
  const [toast, setToast] = React.useState<{
    message: string
    undo?: () => void
  } | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
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

  function handleFocusNew() {
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function handleToggleCanary(id: string) {
    const prev = canaries
    const target = canaries.find((c) => c.id === id)
    if (!target) return

    const nextStatus: CanaryStatus =
      target.status === "Armed" ? "Paused" : "Armed"
    const nextDetail =
      nextStatus === "Armed"
        ? target.status === "Triggered"
          ? "Re-armed. Checked every request."
          : "Never opened. Checked every request."
        : "Paused. Opens will not alert until armed."

    setCanaries((list) =>
      list.map((c) =>
        c.id === id ? { ...c, status: nextStatus, detail: nextDetail } : c
      )
    )
    showToast(
      nextStatus === "Armed"
        ? `Canary armed: ${target.name}`
        : `Canary paused: ${target.name}`,
      () => {
        setCanaries(prev)
        setToast(null)
      }
    )
  }

  function handleTestTrigger(canary: CanaryItem) {
    if (canary.status === "Paused") {
      showToast(`${canary.name} is paused — arm it to test triggers`)
      return
    }
    const prevHistory = history
    const record: TriggerRecord = {
      id: `hist-${Date.now()}`,
      when: "Just now",
      canary: canary.name,
      source: `Your own account · test (${canary.channel})`,
      result: "Ignored",
    }
    setHistory((items) => [record, ...items])
    showToast(`Test trigger logged for ${canary.name}`, () => {
      setHistory(prevHistory)
      setToast(null)
    })
  }

  function handleArmNew(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return

    const prev = canaries
    const created: CanaryItem = {
      id: `can-${Date.now()}`,
      name: trimmed,
      folder: "/Drive",
      status: "Armed",
      detail: `Never opened. Alerts via ${channel.toLowerCase()}.`,
      channel,
    }
    setCanaries((items) => [...items, created])
    setNewName("")
    showToast(`Canary armed: ${trimmed}`, () => {
      setCanaries(prev)
      setToast(null)
    })
  }

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <Sidebar active="canaries" />
      <main className="main">
        <PageHead
          title="Canaries"
          sub="Bait files that tell you when someone is snooping"
          cta="New canary"
          ctaIcon="plus"
          onCtaClick={handleFocusNew}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {canaries.map((canary) => (
            <div key={canary.id} className="glass card col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 12 }}>
                <div className={canary.status === "Paused" ? "tile n" : "tile"}>
                  <Icon glyph="flag" size={18} />
                </div>
                <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                  <span className="m ell">{canary.name}</span>
                  <span className="xs muted">Bait file in {canary.folder}</span>
                </div>
                <Chip
                  label={canary.status}
                  tone={canary.status === "Paused" ? "neutral" : "accent"}
                />
              </div>
              <hr className="hr" />
              <div className="row wrap between" style={{ gap: 10 }}>
                <span className="sm muted">{canary.detail}</span>
                <div className="row" style={{ gap: 6 }}>
                  <Button
                    label="Test trigger"
                    variant="ghost"
                    size="sm"
                    icon="bell"
                    onClick={() => handleTestTrigger(canary)}
                  />
                  <Button
                    label={
                      canary.status === "Armed"
                        ? "Pause"
                        : canary.status === "Triggered"
                          ? "Re-arm"
                          : "Arm"
                    }
                    variant="secondary"
                    size="sm"
                    icon={canary.status === "Armed" ? "pause" : "flag"}
                    onClick={() => handleToggleCanary(canary.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="col" style={{ gap: 12 }}>
          <h2 className="h2">Trigger history</h2>
          <div
            className="glass"
            style={{ overflowX: "auto", borderRadius: 20 }}
          >
            <div style={{ minWidth: 680 }}>
              <div
                className="thead"
                style={{ gridTemplateColumns: "1.3fr 1.2fr 1.4fr 1fr" }}
              >
                <span>When</span>
                <span>Canary</span>
                <span>Source</span>
                <span>Result</span>
              </div>
              {history.map((row) => (
                <div
                  key={row.id}
                  className="trow"
                  style={{ gridTemplateColumns: "1.3fr 1.2fr 1.4fr 1fr" }}
                >
                  <span className="sm m">{row.when}</span>
                  <span className="sm ell">{row.canary}</span>
                  <span className="sm muted">{row.source}</span>
                  <div>
                    <Chip
                      label={row.result}
                      tone={row.result === "Alert sent" ? "accent" : "neutral"}
                      icon={row.result === "Alert sent" ? "bell" : undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleArmNew}
          className="glass card row wrap"
          style={{ gap: 12, alignItems: "flex-end" }}
        >
          <div className="col" style={{ gap: 6, flex: "1 1 200px" }}>
            <label htmlFor="canary-name-input" className="xs b">
              New canary name
            </label>
            <input
              id="canary-name-input"
              ref={inputRef}
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. payroll-2026.xlsx"
              aria-label="Canary name"
            />
          </div>
          <Seg
            options={["Email", "Push", "Both"]}
            value={channel}
            onChange={(val) => setChannel(val as AlertChannel)}
            aria-label="Alert channel"
          />
          <Button
            type="submit"
            label="Arm canary"
            variant="primary"
            size="md"
            icon="flag"
            disabled={!newName.trim()}
          />
        </form>
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
