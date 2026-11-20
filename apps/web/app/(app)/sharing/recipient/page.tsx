"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Button,
  Chip,
  FileTile,
  Icon,
} from "@workspace/ui/components/glashus"
import { glashusApi } from "@/lib/api"
import { extractExt, formatBytes, formatShortDate } from "@/lib/format"
import { unwrapApi } from "@/lib/queries"

type PublicShareInfo = {
  id: string
  fileName: string
  fileMime: string
  fileSize: number
  ownerName: string
  redacted: boolean
  hasPin: boolean
  expiresAt: string | null
  downloadsRemaining: number | null
  expired: boolean
  revoked: boolean
  limitReached: boolean
}

function RecipientInner() {
  const router = useRouter()
  const params = useSearchParams()
  const shareId = params.get("shareId") ?? ""

  const [manualId, setManualId] = React.useState("")
  const [info, setInfo] = React.useState<PublicShareInfo | null>(null)
  const [loading, setLoading] = React.useState(Boolean(shareId))
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [digits, setDigits] = React.useState(["", "", "", ""])
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([])
  const [unlocking, setUnlocking] = React.useState(false)
  const [unlockError, setUnlockError] = React.useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!shareId) {
      setInfo(null)
      setLoading(false)
      setLoadError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setDownloadUrl(null)
    setUnlockError(null)
    glashusApi
      .GET("/v1/public/shares/{shareId}", {
        params: { path: { shareId } },
      })
      .then((res) => {
        if (!cancelled) {
          setInfo(unwrapApi(res))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setInfo(null)
          setLoadError(
            err instanceof Error ? err.message : "Share link unavailable."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [shareId])

  const pin = digits.join("")
  const blockedReason = info
    ? info.revoked
      ? "This share link has been revoked by its owner."
      : info.expired
        ? "This share link has expired."
        : info.limitReached
          ? "This share link has reached its maximum download limit."
          : null
    : null

  const requestDownload = async (submittedPin?: string) => {
    if (!shareId || !info) return
    setUnlockError(null)
    setUnlocking(true)
    try {
      const res = unwrapApi(
        await glashusApi.POST("/v1/public/shares/{shareId}/unlock", {
          params: { path: { shareId } },
          body: submittedPin ? { pin: submittedPin } : {},
        })
      )
      setDownloadUrl(res.downloadUrl)
      setInfo((prev) =>
        prev ? { ...prev, downloadsRemaining: res.downloadsRemaining } : prev
      )
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer")
    } catch (err) {
      setUnlockError(
        err instanceof Error ? err.message : "Could not unlock file."
      )
    } finally {
      setUnlocking(false)
    }
  }

  const handleDigitChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "")
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)))
      return
    }
    if (clean.length > 1) {
      const chars = clean.slice(0, 4).split("")
      const next = ["", "", "", ""].map((_, i) => chars[i] ?? "")
      setDigits(next)
      const focusIdx = Math.min(3, chars.length - 1)
      inputRefs.current[focusIdx]?.focus()
      return
    }
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)))
    if (index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) {
      setUnlockError("Enter all 4 PIN digits.")
      return
    }
    void requestDownload(pin)
  }

  return (
    <div
      className="plain"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="glass card col"
        style={{ width: "100%", maxWidth: 480, padding: 28, gap: 20 }}
      >
        <div className="row between">
          <Link href="/" className="row" style={{ gap: 8 }}>
            <span className="tile" style={{ width: 28, height: 28 }}>
              <Icon glyph="shield" size={14} />
            </span>
            <span className="m">Glashus</span>
          </Link>
          <Chip label="60 s signed link" tone="clear" />
        </div>

        {!shareId ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (manualId.trim()) {
                router.push(
                  `/sharing/recipient?shareId=${encodeURIComponent(manualId.trim())}`
                )
              }
            }}
            className="col"
            style={{ gap: 12 }}
          >
            <h1 className="h2" style={{ margin: 0 }}>
              Open a protected share
            </h1>
            <p className="p muted" style={{ margin: 0 }}>
              Paste a Glashus share link ID or return to your Drive.
            </p>
            <input
              className="input"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Share ID (e.g. shr_...)"
            />
            <div className="row wrap" style={{ gap: 8 }}>
              <Button label="Open share" variant="primary" type="submit" />
              <Button label="Go to Drive" href="/drive" />
            </div>
          </form>
        ) : loading ? (
          <div className="col center" style={{ padding: "32px 0", gap: 6 }}>
            <span className="m">Checking share link…</span>
            <span className="sm muted">Verifying expiry and access policy</span>
          </div>
        ) : loadError || !info ? (
          <div className="col" style={{ gap: 10 }}>
            <span className="h2">Share unavailable</span>
            <p className="p muted" style={{ margin: 0 }}>
              {loadError ?? "This share link could not be found."}
            </p>
            <div>
              <Button label="Go to Glashus" href="/" />
            </div>
          </div>
        ) : (
          <>
            <div
              className="glass-soft row"
              style={{ padding: 14, borderRadius: 16, gap: 14 }}
            >
              <FileTile
                ext={extractExt(info.fileName)}
                tone={info.redacted ? 0 : 1}
                size={44}
              />
              <div className="col grow" style={{ minWidth: 0, gap: 3 }}>
                <span className="m ell">{info.fileName}</span>
                <span className="xs muted">
                  Shared by {info.ownerName} · {formatBytes(info.fileSize)}
                </span>
                <div className="row wrap" style={{ gap: 6, marginTop: 2 }}>
                  <Chip
                    label={info.redacted ? "Redacted copy" : "Original"}
                    tone={info.redacted ? "clear" : "neutral"}
                  />
                  {info.expiresAt ? (
                    <Chip
                      label={`Expires ${formatShortDate(info.expiresAt)}`}
                      tone="neutral"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {blockedReason ? (
              <div
                className="glass-soft col"
                style={{
                  padding: 16,
                  borderRadius: 16,
                  gap: 6,
                  borderColor: "rgba(217, 119, 6, 0.4)",
                }}
              >
                <span className="sm m">Access blocked</span>
                <span className="sm muted">{blockedReason}</span>
              </div>
            ) : info.hasPin && !downloadUrl ? (
              <form
                onSubmit={handlePinSubmit}
                className="col"
                style={{ gap: 14 }}
              >
                <div className="col" style={{ gap: 4 }}>
                  <span className="sm m">Enter 4-digit PIN</span>
                  <span className="xs muted">
                    Ask {info.ownerName} for the PIN to issue a 60 s download
                    URL.
                  </span>
                </div>
                <div
                  className="row"
                  style={{ gap: 10, justifyContent: "center" }}
                >
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-label={`PIN digit ${i + 1}`}
                      maxLength={4}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      className="input"
                      style={{
                        width: 56,
                        height: 58,
                        textAlign: "center",
                        fontSize: 22,
                        fontWeight: 600,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                  ))}
                </div>
                {unlockError ? (
                  <span className="sm" style={{ color: "var(--accent)" }}>
                    {unlockError}
                  </span>
                ) : null}
                <Button
                  label={unlocking ? "Verifying PIN…" : "Unlock & download"}
                  variant="primary"
                  icon="lock"
                  type="submit"
                  disabled={unlocking}
                />
              </form>
            ) : (
              <div className="col" style={{ gap: 12 }}>
                {unlockError ? (
                  <span className="sm" style={{ color: "var(--accent)" }}>
                    {unlockError}
                  </span>
                ) : null}
                <Button
                  label={
                    unlocking
                      ? "Generating 60 s link…"
                      : downloadUrl
                        ? "Download again"
                        : "Download file"
                  }
                  variant="primary"
                  icon="download"
                  disabled={unlocking}
                  onClick={() => void requestDownload(info.hasPin ? pin : undefined)}
                />
                {downloadUrl ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm m"
                    style={{ textAlign: "center", color: "var(--accent)" }}
                  >
                    Direct 60 s download link ready (click if blocked)
                  </a>
                ) : null}
              </div>
            )}

            <div
              className="row between xs muted"
              style={{
                paddingTop: 12,
                borderTop: "1px solid var(--line)",
              }}
            >
              <span>
                {info.downloadsRemaining === null
                  ? "Unlimited downloads"
                  : `${info.downloadsRemaining} download${info.downloadsRemaining === 1 ? "" : "s"} remaining`}
              </span>
              <span>Scanned before sharing</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function RecipientPage() {
  return (
    <React.Suspense
      fallback={
        <div
          className="plain"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Loading protected share…</span>
          </div>
        </div>
      }
    >
      <RecipientInner />
    </React.Suspense>
  )
}
