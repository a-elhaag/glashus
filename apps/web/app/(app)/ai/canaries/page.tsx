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
  type CanaryListData,
  unwrapApi,
  useCanaries,
  useFolders,
  useInvalidateDrive,
} from "@/lib/queries"

type CanaryItem = CanaryListData["canaries"][number]

function statusUi(status: CanaryItem["status"]): {
  label: string
  tone: "accent" | "neutral"
} {
  if (status === "triggered") return { label: "Triggered", tone: "accent" }
  if (status === "paused") return { label: "Paused", tone: "neutral" }
  return { label: "Armed", tone: "accent" }
}

export default function CanariesPage() {
  const { data, isLoading, error } = useCanaries()
  const { data: folders = [] } = useFolders()
  const invalidate = useInvalidateDrive()

  const canaries = data?.canaries ?? []
  const history = data?.history ?? []

  const [newName, setNewName] = React.useState("")
  const [folderId, setFolderId] = React.useState<string>("")
  const [channelUi, setChannelUi] = React.useState<"Both" | "Email" | "Push">(
    "Both"
  )
  const [search, setSearch] = React.useState("")
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const nameInputRef = React.useRef<HTMLInputElement | null>(null)
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

  const filteredCanaries = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return canaries
    return canaries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.folderName.toLowerCase().includes(q)
    )
  }, [canaries, search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    const channel =
      channelUi === "Email"
        ? "email"
        : channelUi === "Push"
          ? "push"
          : "both"
    try {
      const created = unwrapApi(
        await glashusApi.POST("/v1/canaries", {
          body: {
            name: trimmed,
            folderId: folderId || null,
            channel,
          },
        })
      )
      setNewName("")
      invalidate()
      notify(`Canary armed: ${created.name}`)
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not arm canary.")
    } finally {
      setCreating(false)
    }
  }

  const handleTestTrigger = async (canary: CanaryItem) => {
    setBusyId(`test:${canary.id}`)
    try {
      unwrapApi(
        await glashusApi.POST("/v1/canaries/{id}/test", {
          params: { path: { id: canary.id } },
        })
      )
      invalidate()
      notify(`Simulated trigger on ${canary.name}`)
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not test canary.")
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleCanary = async (canary: CanaryItem) => {
    const nextStatus = canary.status === "armed" ? "paused" : "armed"
    setBusyId(`toggle:${canary.id}`)
    try {
      unwrapApi(
        await glashusApi.PATCH("/v1/canaries/{id}", {
          params: { path: { id: canary.id } },
          body: { status: nextStatus },
        })
      )
      invalidate()
      notify(
        nextStatus === "paused"
          ? `Paused ${canary.name}`
          : `Armed ${canary.name}`
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not update canary.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <AppSidebar active="canaries" />
      <main className="main">
        <PageHead
          title="Canaries"
          sub="Bait files that tell you when someone opens an unexpected link or downloads suspicious files."
          cta="New canary"
          ctaIcon="plus"
          onCtaClick={() => {
            nameInputRef.current?.scrollIntoView({ behavior: "smooth" })
            nameInputRef.current?.focus()
          }}
          searchValue={search}
          onSearchChange={setSearch}
        />

        <form
          onSubmit={handleCreate}
          className="glass card col"
          style={{ gap: 12 }}
        >
          <div className="row wrap between" style={{ gap: 8 }}>
            <span className="m">Arm a new canary bait file</span>
            <Seg
              options="Both|Email|Push"
              value={channelUi}
              onChange={(val) => {
                if (val === "Both" || val === "Email" || val === "Push") {
                  setChannelUi(val)
                }
              }}
              aria-label="Alert channel"
            />
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <input
              ref={nameInputRef}
              className="input grow"
              style={{ minWidth: 220 }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Bait filename (e.g. Q4-payroll-keys.xlsx)"
            />
            <select
              aria-label="Target folder"
              className="input"
              style={{ width: 200 }}
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">/Drive (root)</option>
              {folders.map((fld) => (
                <option key={fld.id} value={fld.id}>
                  /{fld.name}
                </option>
              ))}
            </select>
            <Button
              label={creating ? "Arming…" : "Arm canary"}
              variant="primary"
              icon="flag"
              type="submit"
              disabled={creating || !newName.trim()}
            />
          </div>
        </form>

        {isLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Loading canaries…</span>
          </div>
        ) : error ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm" style={{ color: "var(--accent)" }}>
              {error instanceof Error
                ? error.message
                : "Could not load canaries."}
            </span>
          </div>
        ) : filteredCanaries.length === 0 ? (
          <div className="glass card col center" style={{ padding: 32, gap: 6 }}>
            <span className="h2">No canary files armed</span>
            <span className="sm muted">
              Create a bait file above to get alerted whenever anyone opens or
              tests it.
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {filteredCanaries.map((canary) => {
              const st = statusUi(canary.status)
              return (
                <div
                  key={canary.id}
                  className="glass card col"
                  style={{ gap: 12 }}
                >
                  <div className="row" style={{ gap: 12 }}>
                    <div
                      className={
                        canary.status === "paused" ? "tile n" : "tile"
                      }
                    >
                      <Icon glyph="flag" size={18} />
                    </div>
                    <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="m ell">{canary.name}</span>
                      <span className="xs muted">
                        {canary.folderName} · Alerts via {canary.channel}
                      </span>
                    </div>
                    <Chip label={st.label} tone={st.tone} />
                  </div>
                  <hr className="hr" />
                  <div className="row wrap between" style={{ gap: 10 }}>
                    <span className="sm muted">{canary.detail}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <Button
                        label={
                          busyId === `test:${canary.id}`
                            ? "Testing…"
                            : "Test trigger"
                        }
                        variant="ghost"
                        size="sm"
                        icon="bell"
                        disabled={busyId !== null}
                        onClick={() => void handleTestTrigger(canary)}
                      />
                      <Button
                        label={
                          busyId === `toggle:${canary.id}`
                            ? "…"
                            : canary.status === "armed"
                              ? "Pause"
                              : canary.status === "triggered"
                                ? "Re-arm"
                                : "Arm"
                        }
                        variant="secondary"
                        size="sm"
                        icon={canary.status === "armed" ? "pause" : "flag"}
                        disabled={busyId !== null}
                        onClick={() => void handleToggleCanary(canary)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="col" style={{ gap: 12 }}>
          <h2 className="h2">Trigger history</h2>
          <div
            className="glass"
            style={{ overflowX: "auto", borderRadius: 20 }}
          >
            <div style={{ minWidth: 680 }}>
              <div
                className="thead"
                style={{ gridTemplateColumns: "1.2fr 1.2fr 1.4fr 1fr" }}
              >
                <span>When</span>
                <span>Canary</span>
                <span>Source</span>
                <span>Result</span>
              </div>
              {history.length === 0 ? (
                <div className="col center muted" style={{ padding: "28px 20px" }}>
                  <span className="sm">No trigger events recorded yet.</span>
                </div>
              ) : (
                history.map((row) => (
                  <div
                    key={row.id}
                    className="trow"
                    style={{ gridTemplateColumns: "1.2fr 1.2fr 1.4fr 1fr" }}
                  >
                    <span className="sm m">{formatTimeOrDate(row.when)}</span>
                    <span className="sm ell">{row.canaryName}</span>
                    <span className="sm muted">{row.source}</span>
                    <div>
                      <Chip
                        label={
                          row.result === "alert_sent"
                            ? "Alert sent"
                            : "Ignored"
                        }
                        tone={row.result === "alert_sent" ? "accent" : "neutral"}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {toast ? (
          <div className="toast">
            <Icon glyph="check" size={14} /> {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}
