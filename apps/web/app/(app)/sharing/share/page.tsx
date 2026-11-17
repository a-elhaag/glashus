"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Field,
  FileTile,
  Icon,
  Seg,
  Switch,
} from "@workspace/ui/components/glashus"

type AudienceOption = "Anyone with link" | "Specific people"
type ExpiryOption = "1 day" | "7 days" | "30 days" | "Never"
type CapOption = "1" | "5" | "10" | "Unlimited"

interface CreatedLinkState {
  url: string
  pin: string | null
  redacted: boolean
  audience: AudienceOption
  expiry: ExpiryOption
  downloadCap: CapOption
}

export default function SharePage() {
  const [audience, setAudience] = React.useState<AudienceOption>("Anyone with link")
  const [recipientEmail, setRecipientEmail] = React.useState("")
  const [redacted, setRedacted] = React.useState(true)
  const [expiry, setExpiry] = React.useState<ExpiryOption>("7 days")
  const [downloadCap, setDownloadCap] = React.useState<CapOption>("5")
  const [requirePin, setRequirePin] = React.useState(true)
  const [createdLink, setCreatedLink] = React.useState<CreatedLinkState | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = React.useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastMsg(msg)
    timerRef.current = setTimeout(() => {
      setToastMsg(null)
      timerRef.current = null
    }, 5000)
  }, [])

  const resetCreated = () => {
    if (createdLink) setCreatedLink(null)
  }

  const capLabel =
    downloadCap === "1"
      ? "1 download"
      : downloadCap === "Unlimited"
        ? "unlimited downloads"
        : `${downloadCap} downloads`
  const expiryLabel = expiry === "Never" ? "no expiry" : expiry
  const pinLabel = requirePin ? "PIN required" : "no PIN"
  const whoLabel =
    audience === "Anyone with link"
      ? "Anyone with the link"
      : recipientEmail.trim() || "Only invited people"

  const summary = redacted
    ? `${whoLabel} sees a redacted copy. Link works for ${expiryLabel}, ${capLabel}, ${pinLabel}.`
    : `${whoLabel} sees the National ID and IBAN. Consider sending the redacted copy instead.`

  const copyUrl = async (url: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      // Clipboard access can fail in restricted contexts; link remains shown below.
    }
    setCopied(true)
  }

  const handleCopy = async (url: string) => {
    await copyUrl(url)
    showToast("Link copied to your clipboard.")
  }

  const handleCreateLink = () => {
    const slug = redacted ? "tax-2025-clean-8f3k" : "tax-2025-orig-2d9m"
    const url = `https://glashus.app/s/${slug}`
    setCreatedLink({
      url,
      pin: requirePin ? "4281" : null,
      redacted,
      audience,
      expiry,
      downloadCap,
    })
    void copyUrl(url)
    showToast("Link created. Copied to your clipboard.")
  }

  const handleUndoCreate = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setCreatedLink(null)
    setCopied(false)
    setToastMsg(null)
  }

  return (
    <div
      className="plain"
      style={{
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        className="glass col"
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          borderRadius: 24,
          padding: 24,
          gap: 20,
        }}
      >
        <div className="row between">
          <div className="row" style={{ gap: 12 }}>
            <FileTile ext="PDF" tone={2} size={44} />
            <div className="col" style={{ gap: 2 }}>
              <h1 className="h2">Share tax-return-2025.pdf</h1>
              <span className="sm muted">1.2 MB · PDF</span>
            </div>
          </div>
          <Button
            label="Close"
            variant="ghost"
            size="md"
            icon="x"
            href="Main.dc.html"
            iconOnly
          />
        </div>

        <div
          className="glass-soft col"
          style={{ borderRadius: 16, padding: 16, gap: 12 }}
        >
          <div className="row" style={{ gap: 8 }}>
            <span
              className="tile"
              style={{ width: 28, height: 28, borderRadius: 8 }}
            >
              <Icon glyph="warn" size={16} />
            </span>
            <span className="sm b">2 sensitive items found before sharing</span>
          </div>
          <div className="row between sm">
            <span className="muted">National ID</span>
            <span className="mono">•••• ••• 4821</span>
          </div>
          <div className="row between sm">
            <span className="muted">IBAN</span>
            <span className="mono">DE89 •••• •••• •••• 3000 00</span>
          </div>
        </div>

        <div className="col" style={{ gap: 10 }}>
          <span className="sm b">What to share</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              aria-pressed={redacted}
              onClick={() => {
                setRedacted(true)
                resetCreated()
              }}
              className="glass-soft col"
              style={{
                textAlign: "left",
                gap: 6,
                padding: 14,
                borderRadius: 14,
                cursor: "pointer",
                color: "var(--ink)",
                border: `1.5px solid ${redacted ? "var(--accent)" : "rgba(255,255,255,0.6)"}`,
              }}
            >
              <span className="row between">
                <span className="sm b">Redacted copy</span>
                <Chip label="Recommended" tone="accent" />
              </span>
              <span className="xs muted">
                Sensitive values removed. Original stays private.
              </span>
            </button>
            <button
              type="button"
              aria-pressed={!redacted}
              onClick={() => {
                setRedacted(false)
                resetCreated()
              }}
              className="glass-soft col"
              style={{
                textAlign: "left",
                gap: 6,
                padding: 14,
                borderRadius: 14,
                cursor: "pointer",
                color: "var(--ink)",
                border: `1.5px solid ${!redacted ? "var(--accent)" : "rgba(255,255,255,0.6)"}`,
              }}
            >
              <span className="sm b">Original</span>
              <span className="xs muted">
                Everything visible to the recipient.
              </span>
            </button>
          </div>
        </div>

        <div className="col" style={{ gap: 10 }}>
          <span className="sm b">Who can open</span>
          <Seg
            options="Anyone with link|Specific people"
            value={audience}
            onChange={(val) => {
              setAudience(val as AudienceOption)
              resetCreated()
            }}
            aria-label="Share audience"
          />
          {audience === "Specific people" ? (
            <Field
              label="Recipient email"
              type="email"
              placeholder="sara@studio.dev"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value)
                resetCreated()
              }}
              note="Only signed-in recipients matching this email can open the link."
            />
          ) : null}
        </div>

        <div className="col" style={{ gap: 10 }}>
          <span className="sm b">Link expires</span>
          <Seg
            options="1 day|7 days|30 days|Never"
            value={expiry}
            onChange={(val) => {
              setExpiry(val as ExpiryOption)
              resetCreated()
            }}
            aria-label="Link expiration"
          />
        </div>

        <div className="col" style={{ gap: 10 }}>
          <span className="sm b">Download limit</span>
          <Seg
            options="1|5|10|Unlimited"
            value={downloadCap}
            onChange={(val) => {
              setDownloadCap(val as CapOption)
              resetCreated()
            }}
            aria-label="Download limit"
          />
        </div>

        <Switch
          label="Require a PIN"
          sub="Recipient must enter 4 digits to open"
          on={requirePin}
          onChange={(next) => {
            setRequirePin(next)
            resetCreated()
          }}
        />

        <hr className="hr" />
        <p className="p muted" style={{ margin: 0 }}>
          {summary}
        </p>

        {createdLink ? (
          <div
            className="glass-soft col"
            style={{
              borderRadius: 16,
              padding: 16,
              gap: 12,
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            <div className="row between wrap" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Icon glyph="check" size={16} />
                <span className="sm b">Link ready</span>
              </div>
              {createdLink.pin ? (
                <Chip label={`PIN ${createdLink.pin}`} tone="accent" icon="lock" />
              ) : (
                <Chip label="No PIN" tone="neutral" />
              )}
            </div>
            <div
              className="row between wrap"
              style={{
                gap: 8,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(17,17,17,0.08)",
              }}
            >
              <span className="mono ell" style={{ flex: 1, minWidth: 0 }}>
                {createdLink.url}
              </span>
              <Button
                label={copied ? "Copied" : "Copy link"}
                variant="secondary"
                size="sm"
                icon={copied ? "check" : "copy"}
                onClick={() => void handleCopy(createdLink.url)}
              />
            </div>
            <div className="row wrap between" style={{ gap: 8 }}>
              <Button
                label="Preview recipient page"
                variant="secondary"
                size="sm"
                icon="eye"
                href="Recipient.dc.html"
              />
              <Button
                label="View in Shared by me"
                variant="primary"
                size="sm"
                icon="link"
                href="Shared.dc.html"
              />
            </div>
          </div>
        ) : (
          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <Button label="Cancel" variant="ghost" size="md" href="Main.dc.html" />
            <Button
              label="Create link"
              variant="primary"
              size="md"
              icon="link"
              onClick={handleCreateLink}
            />
          </div>
        )}
      </div>

      {toastMsg ? (
        <div role="status" className="toast" style={{ position: "fixed" }}>
          <span>{toastMsg}</span>
          {createdLink ? (
            <Button
              label="Undo"
              variant="secondary"
              size="sm"
              onClick={handleUndoCreate}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
