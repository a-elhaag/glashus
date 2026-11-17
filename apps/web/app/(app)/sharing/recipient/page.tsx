"use client"

import * as React from "react"
import { Button, Chip, FileTile, Icon } from "@workspace/ui/components/glashus"

const DEMO_PIN = "4281"
const PIN_SLOTS = [0, 1, 2, 3] as const

export default function RecipientPage() {
  const [digits, setDigits] = React.useState<string[]>(["", "", "", ""])
  const [error, setError] = React.useState<string | null>(null)
  const [unlocked, setUnlocked] = React.useState(false)
  const [downloadsLeft, setDownloadsLeft] = React.useState(3)
  const [downloaded, setDownloaded] = React.useState(false)
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([
    null,
    null,
    null,
    null,
  ])

  const focusSlot = (index: number) => {
    const el = inputRefs.current[index]
    if (el) el.focus()
  }

  const handleDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "")
    if (!cleaned) {
      setDigits((prev) => prev.map((val, i) => (i === index ? "" : val)))
      setError(null)
      return
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 4).split("")
      setDigits((prev) =>
        prev.map((val, i) => {
          const nextChar = chars[i - index]
          return i >= index && nextChar !== undefined ? nextChar : val
        })
      )
      setError(null)
      const nextIndex = Math.min(3, index + chars.length)
      focusSlot(nextIndex)
      return
    }

    const digit = cleaned.slice(-1)
    setDigits((prev) => prev.map((val, i) => (i === index ? digit : val)))
    setError(null)
    if (index < 3) {
      focusSlot(index + 1)
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      const current = digits[index] ?? ""
      if (!current && index > 0) {
        e.preventDefault()
        setDigits((prev) => prev.map((val, i) => (i === index - 1 ? "" : val)))
        focusSlot(index - 1)
      }
      return
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      focusSlot(index - 1)
    } else if (e.key === "ArrowRight" && index < 3) {
      e.preventDefault()
      focusSlot(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    if (!pasted) return
    e.preventDefault()
    const chars = pasted.split("")
    setDigits(PIN_SLOTS.map((i) => chars[i] ?? ""))
    setError(null)
    focusSlot(Math.min(3, pasted.length - 1))
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    const pin = digits.join("")
    if (pin.length < 4) {
      setError("Enter all 4 digits to unlock.")
      const firstEmpty = digits.findIndex((d) => !d)
      focusSlot(firstEmpty >= 0 ? firstEmpty : 0)
      return
    }
    if (pin !== DEMO_PIN) {
      setError("Incorrect PIN. Try 4281 for this preview.")
      return
    }
    setError(null)
    setUnlocked(true)
  }

  const handleDownload = () => {
    setDownloadsLeft((left) => Math.max(0, left - 1))
    setDownloaded(true)
  }

  const handleRelock = () => {
    setUnlocked(false)
    setDownloaded(false)
    setDigits(["", "", "", ""])
    setError(null)
  }

  return (
    <div
      className="plain"
      style={{
        minHeight: "100vh",
        padding: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="glass col"
        style={{
          width: 440,
          maxWidth: "100%",
          borderRadius: 28,
          padding: 36,
          gap: 22,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span className="xs b muted">Shared with you through Glashus</span>
        <FileTile ext="PDF" tone={0} size={64} />
        <div className="col" style={{ gap: 6 }}>
          <h1 className="h2">Anas shared a file</h1>
          <span className="sm muted">tax-return-2025-redacted.pdf · 1.1 MB</span>
        </div>

        <Chip
          label={unlocked ? "Unlocked · Redacted copy" : "Redacted copy"}
          tone="accent"
          icon={unlocked ? "check" : "shield"}
        />

        {unlocked ? (
          <div className="col" style={{ gap: 14, width: "100%", alignItems: "center" }}>
            <div
              className="glass-soft row"
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "12px 14px",
                gap: 10,
                textAlign: "left",
              }}
            >
              <span
                className="tile"
                style={{ width: 32, height: 32, borderRadius: 9 }}
              >
                <Icon glyph={downloaded ? "check" : "shield"} size={16} />
              </span>
              <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span className="sm m">
                  {downloaded ? "Download started" : "Verified redacted copy"}
                </span>
                <span className="xs muted">
                  National ID and IBAN were permanently masked before sharing.
                </span>
              </div>
            </div>

            <Button
              label={
                downloadsLeft === 0
                  ? "Download limit reached"
                  : downloaded
                    ? "Download again"
                    : "Download redacted copy"
              }
              variant="primary"
              size="lg"
              icon="download"
              disabled={downloadsLeft === 0}
              onClick={handleDownload}
              style={{
                width: "100%",
                ...(downloadsLeft === 0
                  ? { opacity: 0.55, cursor: "not-allowed" }
                  : {}),
              }}
            />

            <Button
              label="Lock again"
              variant="ghost"
              size="sm"
              icon="lock"
              onClick={handleRelock}
            />
          </div>
        ) : (
          <form
            onSubmit={handleUnlock}
            className="col"
            style={{ gap: 18, alignItems: "center", width: "100%" }}
          >
            <div className="col" style={{ gap: 10, alignItems: "center" }}>
              <span className="sm b">Enter the 4-digit PIN</span>
              <div className="row" style={{ gap: 10 }}>
                {PIN_SLOTS.map((slot) => (
                  <input
                    key={slot}
                    ref={(el) => {
                      inputRefs.current[slot] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`PIN digit ${slot + 1} of 4`}
                    value={digits[slot] ?? ""}
                    onChange={(e) => handleDigitChange(slot, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(slot, e)}
                    onPaste={handlePaste}
                    className="input"
                    style={{
                      width: 52,
                      height: 60,
                      padding: 0,
                      borderRadius: 12,
                      border: error
                        ? "1.5px solid var(--accent)"
                        : "1px solid rgba(17,17,17,0.14)",
                      background: "rgba(255,255,255,0.8)",
                      textAlign: "center",
                      fontSize: 24,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </div>
              {error ? (
                <span
                  role="alert"
                  className="xs m"
                  style={{ color: "var(--accent)" }}
                >
                  {error}
                </span>
              ) : (
                <span className="xs muted">Demo PIN: 4281</span>
              )}
            </div>

            <Button
              type="submit"
              label="Unlock and download"
              variant="primary"
              size="lg"
              icon="download"
            />
          </form>
        )}

        <div className="col" style={{ gap: 6 }}>
          <span className="xs muted">
            Sensitive details were removed from this copy.
          </span>
          <span className="xs muted">
            Link ends in 2 days · {downloadsLeft}{" "}
            {downloadsLeft === 1 ? "download" : "downloads"} left
          </span>
        </div>
      </div>
    </div>
  )
}
