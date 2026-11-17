"use client"

import * as React from "react"
import {
  Button,
  Icon,
  Seg,
} from "@workspace/ui/components/glashus"

type StateFilter = "All" | "Drive" | "Security" | "Sharing"

export default function StatesPage() {
  const [filter, setFilter] = React.useState<StateFilter>("All")
  const [retryingLoad, setRetryingLoad] = React.useState(false)
  const [loadRecovered, setLoadRecovered] = React.useState(false)
  const [scanRecovered, setScanRecovered] = React.useState(false)
  const [linkRevoked, setLinkRevoked] = React.useState(false)
  const [toast, setToast] = React.useState<{
    message: string
    undo?: () => void
  } | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  function showToast(message: string, undo?: () => void) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, undo })
    timerRef.current = setTimeout(() => setToast(null), 5000)
  }

  function handleRetryLoad() {
    if (loadRecovered) {
      setLoadRecovered(false)
      return
    }
    setRetryingLoad(true)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = setTimeout(() => {
      setRetryingLoad(false)
      setLoadRecovered(true)
      showToast("Connection restored")
    }, 350)
  }

  function handleUndoLink() {
    setLinkRevoked(true)
    showToast("Link revoked", () => {
      setLinkRevoked(false)
      setToast(null)
    })
  }

  function handleScanAgain() {
    setScanRecovered((prev) => !prev)
    showToast(
      scanRecovered
        ? "Reset to scan failed preview"
        : "Re-scan passed — file moved to Clean"
    )
  }

  const showDrive = filter === "All" || filter === "Drive"
  const showSecurity = filter === "All" || filter === "Security"
  const showSharing = filter === "All" || filter === "Sharing"

  return (
    <div
      className="plain"
      style={{ minHeight: "100vh", padding: 32, position: "relative" }}
    >
      <div
        className="row wrap between"
        style={{ marginBottom: 20, gap: 12 }}
      >
        <div className="row" style={{ gap: 12 }}>
          <Button
            label="Back to Drive"
            variant="secondary"
            size="sm"
            icon="chevL"
            href="Main.dc.html"
          />
          <h1 className="h2">System states</h1>
        </div>
        <Seg
          options={["All", "Drive", "Security", "Sharing"]}
          value={filter}
          onChange={(val) => setFilter(val as StateFilter)}
          aria-label="Filter system states"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {showDrive ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className="tile n">
              <Icon glyph="folder" size={20} />
            </div>
            <span className="m">Nothing here yet</span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              Drop a file to start. It is scanned before it lands.
            </span>
            <Button
              label="Upload a file"
              variant="primary"
              size="md"
              icon="upload"
              href="Upload.dc.html"
            />
          </div>
        ) : null}

        {showDrive ? (
          <div
            className="glass card col"
            style={{ gap: 12, padding: "24px 20px", minHeight: 220 }}
          >
            <div className="line skel" style={{ width: "40%" }} />
            <div className="row" style={{ gap: 10 }}>
              <div
                className="line skel"
                style={{ width: 32, height: 32, borderRadius: 10 }}
              />
              <div className="grow col" style={{ gap: 6 }}>
                <div className="line skel" />
                <div className="line skel" style={{ width: "55%" }} />
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div
                className="line skel"
                style={{ width: 32, height: 32, borderRadius: 10 }}
              />
              <div className="grow col" style={{ gap: 6 }}>
                <div className="line skel" />
                <div className="line skel" style={{ width: "55%" }} />
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div
                className="line skel"
                style={{ width: 32, height: 32, borderRadius: 10 }}
              />
              <div className="grow col" style={{ gap: 6 }}>
                <div className="line skel" />
                <div className="line skel" style={{ width: "55%" }} />
              </div>
            </div>
          </div>
        ) : null}

        {showDrive ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className={loadRecovered ? "tile n" : "tile"}>
              <Icon glyph={loadRecovered ? "check" : "warn"} size={20} />
            </div>
            <span className="m">
              {loadRecovered ? "Files loaded" : "Could not load files"}
            </span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              {loadRecovered
                ? "Your drive is back in sync."
                : "Check your connection. Your files are safe."}
            </span>
            <Button
              label={
                retryingLoad
                  ? "Checking..."
                  : loadRecovered
                    ? "Show error state"
                    : "Try again"
              }
              variant="secondary"
              size="md"
              icon="rotate"
              disabled={retryingLoad}
              onClick={handleRetryLoad}
            />
          </div>
        ) : null}

        {showSharing ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className="tile n">
              <Icon glyph={linkRevoked ? "x" : "check"} size={20} />
            </div>
            <span className="m">
              {linkRevoked ? "Link revoked" : "Link created"}
            </span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              {linkRevoked
                ? "Nobody can open this link anymore."
                : "Copied to your clipboard. Ends in 7 days."}
            </span>
            <Button
              label={linkRevoked ? "Restore link" : "Undo"}
              variant="ghost"
              size="md"
              icon="undo"
              onClick={() => {
                if (linkRevoked) {
                  setLinkRevoked(false)
                  showToast("Link restored")
                } else {
                  handleUndoLink()
                }
              }}
            />
          </div>
        ) : null}

        {showSecurity ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className={scanRecovered ? "tile n" : "tile"}>
              <Icon glyph={scanRecovered ? "check" : "warn"} size={20} />
            </div>
            <span className="m">
              {scanRecovered ? "Scan clean" : "Scan failed"}
            </span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              {scanRecovered
                ? "ClamAV and DLP finished. File is now in your clean bucket."
                : "We could not check this file. It stays in quarantine."}
            </span>
            <Button
              label={scanRecovered ? "Reset preview" : "Scan again"}
              variant="secondary"
              size="md"
              icon="rotate"
              onClick={handleScanAgain}
            />
          </div>
        ) : null}

        {showSecurity ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className="tile n">
              <Icon glyph="lock" size={20} />
            </div>
            <span className="m">File in quarantine</span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              Waiting for the scan. You can open it when it is clean.
            </span>
          </div>
        ) : null}

        {showSharing ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className="tile n">
              <Icon glyph="clock" size={20} />
            </div>
            <span className="m">This link has ended</span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              Ask the owner to send a new one.
            </span>
          </div>
        ) : null}

        {showDrive ? (
          <div
            className="glass card col center"
            style={{ gap: 12, padding: "28px 20px", minHeight: 220 }}
          >
            <div className="tile">
              <Icon glyph="cloud" size={20} />
            </div>
            <span className="m">Storage is full</span>
            <span className="sm muted" style={{ maxWidth: 260 }}>
              15 of 15 GB used. Clean up to keep uploading.
            </span>
            <Button
              label="Open cleanup"
              variant="primary"
              size="md"
              icon="archive"
              href="Cleanup.dc.html"
            />
          </div>
        ) : null}
      </div>

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
