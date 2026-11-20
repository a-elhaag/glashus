"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  PageHead,
  Seg,
  Switch,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { extractExt, formatBytes } from "@/lib/format"
import {
  type FindingData,
  unwrapApi,
  useFiles,
  useInvalidateDrive,
  useMe,
} from "@/lib/queries"

function expiryLabelToDays(label: string): number | null {
  if (label === "24h") return 1
  if (label === "7 days") return 7
  if (label === "30 days") return 30
  return null
}

function capLabelToNumber(label: string, custom: string): number | null {
  if (label === "Custom") {
    const n = Math.floor(Number(custom))
    return Math.min(1000, Math.max(1, n || 1))
  }
  const n = Number(label)
  return Number.isFinite(n) ? n : null
}

function ShareBuilderInner() {
  const params = useSearchParams()
  const initialFileId = params.get("fileId")

  const { data: me } = useMe()
  const { data: files = [], isLoading: filesLoading } = useFiles({
    trashed: false,
  })
  const invalidate = useInvalidateDrive()

  const cleanFiles = React.useMemo(
    () => files.filter((f) => f.scanStatus === "clean"),
    [files]
  )

  const [selectedId, setSelectedId] = React.useState<string>(initialFileId ?? "")
  React.useEffect(() => {
    if (initialFileId) {
      setSelectedId(initialFileId)
      return
    }
    if (!selectedId && cleanFiles[0]) {
      setSelectedId(cleanFiles[0].id)
    }
  }, [cleanFiles, initialFileId, selectedId])

  const selectedFile = React.useMemo(
    () => files.find((f) => f.id === selectedId) ?? null,
    [files, selectedId]
  )

  const [findings, setFindings] = React.useState<FindingData[]>([])
  const [findingsLoading, setFindingsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!selectedId) {
      setFindings([])
      return
    }
    let cancelled = false
    setFindingsLoading(true)
    glashusApi
      .GET("/v1/files/{id}/findings", {
        params: { path: { id: selectedId } },
      })
      .then((res) => {
        if (!cancelled) setFindings(unwrapApi(res).findings)
      })
      .catch(() => {
        if (!cancelled) setFindings([])
      })
      .finally(() => {
        if (!cancelled) setFindingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const activeFindings = React.useMemo(
    () => findings.filter((f) => !f.safe),
    [findings]
  )

  const [redacted, setRedacted] = React.useState(true)
  const [audienceLabel, setAudienceLabel] = React.useState<
    "Anyone with link" | "Specific person"
  >("Anyone with link")
  const [recipientEmail, setRecipientEmail] = React.useState("")
  const [expiryLabel, setExpiryLabel] = React.useState<string>("7 days")
  const [capLabel, setCapLabel] = React.useState<string>("5")
  const [customCap, setCustomCap] = React.useState<string>("10")
  const [requirePin, setRequirePin] = React.useState(true)

  React.useEffect(() => {
    if (me) {
      setRequirePin(me.user.requirePinOnPublic)
      const d = me.user.defaultExpiryDays
      setExpiryLabel(d === 1 ? "24h" : d === 30 ? "30 days" : "7 days")
    }
  }, [me])

  React.useEffect(() => {
    if (selectedFile?.originalBlocked) {
      setRedacted(true)
    }
  }, [selectedFile])

  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [created, setCreated] = React.useState<{
    shareId: string
    sharePath: string
    pin: string | null
  } | null>(null)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    setError(null)

    const audience =
      audienceLabel === "Specific person" ? "specific_people" : "anyone"
    if (audience === "specific_people" && !recipientEmail.trim()) {
      setError("Enter a recipient email address for specific-person shares.")
      return
    }

    setCreating(true)
    try {
      const res = unwrapApi(
        await glashusApi.POST("/v1/shares", {
          body: {
            fileId: selectedFile.id,
            audience,
            recipientEmail:
              audience === "specific_people" ? recipientEmail.trim() : null,
            expiryDays: expiryLabelToDays(expiryLabel),
            maxDownloads: capLabelToNumber(capLabel, customCap),
            requirePin,
            redacted,
          },
        })
      )
      setCreated({
        shareId: res.share.id,
        sharePath: res.sharePath,
        pin: res.pin,
      })
      invalidate()
      notify("Protected share link created")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create share link."
      )
    } finally {
      setCreating(false)
    }
  }

  const createdUrl = created
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sharing/recipient?shareId=${encodeURIComponent(created.shareId)}`
    : ""

  const copyCreated = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(`Copied ${label}`)
    } catch {
      notify(text)
    }
  }

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="shared" />
      <main className="main">
        <PageHead
          title="Share file safely"
          sub="Pre-share guard inspects findings and enforces 60 s signed URLs, PIN locks, and expiry."
          cta="All shares"
          ctaIcon="chevL"
          ctaHref="/sharing"
        />

        {filesLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Loading files…</span>
          </div>
        ) : cleanFiles.length === 0 ? (
          <div className="glass card col" style={{ padding: 28, gap: 10 }}>
            <span className="h2">No clean files ready to share</span>
            <p className="p muted" style={{ margin: 0 }}>
              Upload a clean file first before creating an external share link.
            </p>
            <div>
              <Button
                label="Upload a file"
                variant="primary"
                icon="upload"
                href="/drive/upload"
              />
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleCreate}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div className="col" style={{ gap: 16 }}>
              <section className="glass card col" style={{ gap: 12 }}>
                <span className="xs muted">1. FILE TO SHARE</span>
                <select
                  className="input"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value)
                    setCreated(null)
                  }}
                >
                  {cleanFiles.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({formatBytes(f.size)})
                    </option>
                  ))}
                </select>

                {selectedFile ? (
                  <div
                    className="glass-soft row"
                    style={{ padding: 12, borderRadius: 16, gap: 12 }}
                  >
                    <FileTile
                      ext={extractExt(selectedFile.name)}
                      tone={activeFindings.length > 0 ? 2 : 0}
                      size={38}
                    />
                    <div className="col grow" style={{ minWidth: 0, gap: 2 }}>
                      <span className="sm m ell">{selectedFile.name}</span>
                      <span className="xs muted">
                        {formatBytes(selectedFile.size)} · v
                        {selectedFile.currentVersion} ·{" "}
                        {selectedFile.originalBlocked
                          ? "Original blocked"
                          : "Original allowed"}
                      </span>
                    </div>
                    <Button
                      label="Scan report"
                      size="sm"
                      variant="ghost"
                      href={`/sharing/scan?fileId=${encodeURIComponent(selectedFile.id)}`}
                    />
                  </div>
                ) : null}

                <div
                  className="glass-soft col"
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    gap: 8,
                    borderColor:
                      activeFindings.length > 0
                        ? "rgba(217, 119, 6, 0.35)"
                        : undefined,
                  }}
                >
                  <div className="row between" style={{ gap: 8 }}>
                    <span className="sm m">
                      {findingsLoading
                        ? "Checking sensitive findings…"
                        : activeFindings.length > 0
                          ? `${activeFindings.length} sensitive finding${activeFindings.length === 1 ? "" : "s"} detected`
                          : "No sensitive findings detected"}
                    </span>
                    <Chip
                      label={
                        activeFindings.length > 0 ? "Redact suggested" : "Clear"
                      }
                      tone={activeFindings.length > 0 ? "accent" : "clear"}
                    />
                  </div>
                  {activeFindings.length > 0 ? (
                    <div className="col" style={{ gap: 6 }}>
                      {activeFindings.slice(0, 4).map((f) => (
                        <div key={f.id} className="row between sm">
                          <span>
                            <strong>{f.type}</strong> · {f.location}
                          </span>
                          <span
                            className="muted"
                            style={{ fontFamily: "ui-monospace, monospace" }}
                          >
                            {f.maskedValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="glass card col" style={{ gap: 12 }}>
                <span className="xs muted">2. COPY SENT TO RECIPIENT</span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRedacted(true)}
                    className="glass-soft col"
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      gap: 6,
                      textAlign: "left",
                      cursor: "pointer",
                      border: redacted
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--line)",
                    }}
                  >
                    <div className="row between" style={{ width: "100%" }}>
                      <span className="sm m">Redacted copy</span>
                      <Chip label="Safe" tone="clear" />
                    </div>
                    <span className="xs muted">
                      Masks sensitive tokens before download. Original never
                      leaves your vault.
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(selectedFile?.originalBlocked)}
                    onClick={() => setRedacted(false)}
                    className="glass-soft col"
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      gap: 6,
                      textAlign: "left",
                      cursor: selectedFile?.originalBlocked
                        ? "not-allowed"
                        : "pointer",
                      opacity: selectedFile?.originalBlocked ? 0.55 : 1,
                      border: !redacted
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--line)",
                    }}
                  >
                    <div className="row between" style={{ width: "100%" }}>
                      <span className="sm m">Original file</span>
                      {selectedFile?.originalBlocked ? (
                        <Chip label="Blocked" tone="accent" />
                      ) : activeFindings.length > 0 ? (
                        <Chip label="PII" tone="neutral" />
                      ) : null}
                    </div>
                    <span className="xs muted">
                      {selectedFile?.originalBlocked
                        ? "Blocked by your scan policy."
                        : "Recipient downloads the unmodified version."}
                    </span>
                  </button>
                </div>
              </section>
            </div>

            <div className="col" style={{ gap: 16 }}>
              <section className="glass card col" style={{ gap: 14 }}>
                <span className="xs muted">3. AUDIENCE &amp; LIFETIME</span>

                <div className="col" style={{ gap: 6 }}>
                  <span className="xs muted">Who can open</span>
                  <Seg
                    options="Anyone with link|Specific person"
                    value={audienceLabel}
                    onChange={(val) => {
                      if (
                        val === "Anyone with link" ||
                        val === "Specific person"
                      ) {
                        setAudienceLabel(val)
                      }
                    }}
                    aria-label="Share audience"
                  />
                </div>

                {audienceLabel === "Specific person" ? (
                  <div className="col" style={{ gap: 6 }}>
                    <label htmlFor="share-recipient-email" className="xs muted">
                      Recipient email
                    </label>
                    <input
                      id="share-recipient-email"
                      type="email"
                      className="input"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="recipient@company.com"
                    />
                  </div>
                ) : null}

                <div className="col" style={{ gap: 6 }}>
                  <span className="xs muted">Expires after</span>
                  <Seg
                    options="24h|7 days|30 days|Never"
                    value={expiryLabel}
                    onChange={setExpiryLabel}
                    aria-label="Link expiry"
                  />
                </div>

                <div className="col" style={{ gap: 6 }}>
                  <span className="xs muted">Download cap</span>
                  <Seg
                    options="1|5|20|Custom|Unlimited"
                    value={capLabel}
                    onChange={setCapLabel}
                    aria-label="Download limit"
                  />
                  {capLabel === "Custom" ? (
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={customCap}
                      onChange={(e) => setCustomCap(e.target.value)}
                      aria-label="Custom download limit (1–1000)"
                    />
                  ) : null}
                </div>

                <div
                  style={{
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <Switch
                    label="Require 4-digit PIN"
                    sub="Shown once after link creation"
                    on={requirePin}
                    onChange={setRequirePin}
                  />
                </div>

                {error ? (
                  <p className="sm" style={{ color: "var(--accent)", margin: 0 }}>
                    {error}
                  </p>
                ) : null}

                <div className="row">
                  <Button
                    label={creating ? "Creating link…" : "Create share link"}
                    variant="primary"
                    icon="share"
                    type="submit"
                    disabled={creating}
                  />
                </div>
              </section>

              {created ? (
                <section
                  className="glass card col"
                  style={{
                    gap: 12,
                    borderColor: "var(--accent)",
                  }}
                >
                  <div className="row between">
                    <span className="xs muted">SHARE READY</span>
                    <Chip label="Active" tone="clear" />
                  </div>
                  <div
                    className="glass-soft row between"
                    style={{ padding: "10px 12px", borderRadius: 12, gap: 8 }}
                  >
                    <span
                      className="xs ell"
                      style={{ fontFamily: "ui-monospace, monospace" }}
                    >
                      {createdUrl}
                    </span>
                    <Button
                      label="Copy"
                      size="sm"
                      type="button"
                      onClick={() => void copyCreated(createdUrl, "share link")}
                    />
                  </div>

                  {created.pin ? (
                    <div
                      className="glass-soft row between"
                      style={{ padding: "10px 12px", borderRadius: 12 }}
                    >
                      <div className="col" style={{ gap: 2 }}>
                        <span className="xs muted">One-time PIN</span>
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            letterSpacing: 4,
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          {created.pin}
                        </span>
                      </div>
                      <Button
                        label="Copy PIN"
                        size="sm"
                        type="button"
                        onClick={() => void copyCreated(created.pin!, "PIN")}
                      />
                    </div>
                  ) : null}

                  <div className="row wrap" style={{ gap: 8 }}>
                    <Button
                      label="Open recipient page"
                      size="sm"
                      variant="primary"
                      href={`/sharing/recipient?shareId=${encodeURIComponent(created.shareId)}`}
                    />
                    <Button
                      label="View in Shared by me"
                      size="sm"
                      href="/sharing"
                    />
                  </div>
                </section>
              ) : null}
            </div>
          </form>
        )}

        {toast ? (
          <div className="toast">
            <Icon glyph="check" size={14} /> {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default function SharePage() {
  return (
    <React.Suspense
      fallback={
        <div className="app" style={{ minHeight: 900 }}>
          <AppSidebar active="shared" />
          <main className="main">
            <div className="glass card" style={{ padding: 24 }}>
              <span className="sm muted">Loading share builder…</span>
            </div>
          </main>
        </div>
      }
    >
      <ShareBuilderInner />
    </React.Suspense>
  )
}
