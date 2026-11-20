"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { components } from "@workspace/sdk"
import {
  Button,
  Chip,
  FileTile,
  Icon,
} from "@workspace/ui/components/glashus"
import { useAuth } from "@/components/providers"
import { glashusApi } from "@/lib/api"
import { extractExt } from "@/lib/format"
import {
  unwrapApi,
  uploadFileToGlashus,
  useInvalidateDrive,
} from "@/lib/queries"

type StepNumber = 1 | 2 | 3
type CompleteResult = components["schemas"]["CompleteUploadResponse"]

const STEP_COPY: Record<StepNumber, { title: string; sub: string }> = {
  1: {
    title: "Add your first file",
    sub: "Anything works. We scan it in quarantine before it lands in your drive.",
  },
  2: {
    title: "Choose how AI may help",
    sub: "You can change this per folder later. AI never reads without your say.",
  },
  3: {
    title: "Your first scan result",
    sub: "This is what Glashus checked on your upload.",
  },
}

const AI_MODES = [
  {
    value: "off" as const,
    label: "Off",
    sub: "No AI reads your files.",
  },
  {
    value: "ask" as const,
    label: "Ask each time",
    sub: "You approve every AI read. Recommended.",
  },
  {
    value: "allow" as const,
    label: "Allowed folders only",
    sub: "AI reads folders you pick, with redaction on.",
  },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const invalidateDrive = useInvalidateDrive()

  const [step, setStep] = React.useState<StepNumber>(1)
  const [aiMode, setAiMode] = React.useState<"off" | "ask" | "allow">("ask")
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [scanResult, setScanResult] = React.useState<CompleteResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [savingMode, setSavingMode] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth")
    }
  }, [authLoading, user, router])

  const currentStep = STEP_COPY[step]

  const runUpload = async (file: File) => {
    setError(null)
    setUploading(true)
    setUploadProgress(5)
    try {
      const result = await uploadFileToGlashus(file, null, {
        onProgress: (pct) => setUploadProgress(pct),
      })
      setScanResult(result)
      invalidateDrive()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const handleBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepNumber) : prev))
  }

  const handleNext = async () => {
    setError(null)
    if (step === 1) {
      setStep(2)
      return
    }
    if (step === 2) {
      setSavingMode(true)
      try {
        unwrapApi(
          await glashusApi.PATCH("/v1/me", {
            body: { aiMode },
          })
        )
        invalidateDrive()
        setStep(3)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save AI preference.")
      } finally {
        setSavingMode(false)
      }
      return
    }
    router.push("/drive")
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
        className="glass col"
        style={{
          width: 720,
          maxWidth: "100%",
          borderRadius: 28,
          padding: 36,
          gap: 24,
        }}
      >
        <div className="row" style={{ gap: 8 }}>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className={`bar grow${n <= step ? " acc" : ""}`}>
              <i style={{ width: "100%" }} />
            </div>
          ))}
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="xs b muted">Step {step} of 3</span>
          <h1 className="h1">{currentStep.title}</h1>
          <p className="p muted" style={{ margin: 0 }}>
            {currentStep.sub}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="glass-soft row"
            style={{ padding: "10px 14px", borderRadius: 12, gap: 8 }}
          >
            <Icon glyph="warn" size={16} />
            <span className="xs m" style={{ color: "var(--accent)" }}>
              {error}
            </span>
          </div>
        ) : null}

        {step === 1 ? (
          <div
            className="glass-soft col center"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) void runUpload(file)
            }}
            style={{
              border: dragOver
                ? "1.5px dashed var(--accent)"
                : "1.5px dashed rgba(17,17,17,0.2)",
              borderRadius: 20,
              padding: "48px 24px",
              gap: 12,
            }}
          >
            <div className="tile">
              <Icon glyph="upload" size={20} />
            </div>
            <span className="m">
              {uploading
                ? `Uploading and scanning… ${uploadProgress}%`
                : scanResult
                  ? `Scanned: ${scanResult.file.name}`
                  : "Drop a file here"}
            </span>
            <span className="xs muted">
              Goes straight to your private quarantine bucket in Cloud Storage first.
            </span>
            <input
              ref={fileInputRef}
              type="file"
              className="visually-hidden"
              aria-label="Choose a file to scan"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void runUpload(file)
                e.target.value = ""
              }}
            />
            <Button
              label={scanResult ? "Upload another file" : "Choose file"}
              variant="secondary"
              size="md"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="col" style={{ gap: 10 }}>
            {AI_MODES.map((item) => {
              const selected = aiMode === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAiMode(item.value)}
                  className="glass-soft row"
                  style={{
                    textAlign: "left",
                    gap: 14,
                    padding: 16,
                    borderRadius: 16,
                    cursor: "pointer",
                    color: "var(--ink)",
                    width: "100%",
                    border: `1.5px solid ${selected ? "var(--accent)" : "rgba(255,255,255,0.6)"}`,
                  }}
                >
                  <div className="grow col" style={{ gap: 3 }}>
                    <span className="m">{item.label}</span>
                    <span className="sm muted">{item.sub}</span>
                  </div>
                  <span
                    className="chip chip-accent"
                    style={{ visibility: selected ? "visible" : "hidden" }}
                  >
                    Selected
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        {step === 3 ? (
          scanResult ? (
            <div className="col" style={{ gap: 12 }}>
              <div
                className="glass-soft row"
                style={{ borderRadius: 16, padding: 16, gap: 14 }}
              >
                <FileTile
                  ext={extractExt(scanResult.file.name)}
                  tone={scanResult.findings.length > 0 || scanResult.blockedReason ? 2 : 0}
                  size={40}
                />
                <div className="grow col" style={{ gap: 2 }}>
                  <span className="m">{scanResult.file.name}</span>
                  <span className="sm muted">
                    {scanResult.blockedReason
                      ? scanResult.blockedReason
                      : scanResult.findings.length > 0
                        ? `${scanResult.findings.length} sensitive item(s) found and masked`
                        : "No sensitive identifiers found"}
                  </span>
                </div>
                <Chip
                  label={
                    scanResult.blockedReason
                      ? "Blocked"
                      : scanResult.findings.length > 0
                        ? "Flagged"
                        : "Clean"
                  }
                  tone={
                    scanResult.blockedReason || scanResult.findings.length > 0
                      ? "accent"
                      : "clear"
                  }
                />
              </div>
              <div
                className="glass-soft row"
                style={{ borderRadius: 16, padding: 16, gap: 14 }}
              >
                <div className="tile n">
                  <Icon
                    glyph={scanResult.blockedReason ? "warn" : "check"}
                    size={18}
                  />
                </div>
                <div className="grow col" style={{ gap: 2 }}>
                  <span className="m">
                    {scanResult.blockedReason
                      ? "Malware test blocked in quarantine"
                      : "No malware found"}
                  </span>
                  <span className="sm muted">
                    {scanResult.blockedReason
                      ? "Quarantine object deleted automatically."
                      : "Promoted to your private clean bucket."}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="glass-soft col center"
              style={{ borderRadius: 16, padding: 28, gap: 6 }}
            >
              <span className="m">You are ready to go</span>
              <span className="sm muted">
                AI preference saved ({aiMode}). Upload any file anytime from Drive.
              </span>
            </div>
          )
        ) : null}

        <div className="row between">
          {step > 1 ? (
            <Button
              label="Back"
              variant="ghost"
              size="md"
              onClick={handleBack}
            />
          ) : (
            <span />
          )}
          <div className="row" style={{ gap: 8 }}>
            {step === 1 && !scanResult ? (
              <Button
                label="Skip upload"
                variant="ghost"
                size="md"
                onClick={() => setStep(2)}
              />
            ) : null}
            <Button
              label={
                savingMode
                  ? "Saving…"
                  : step === 3
                    ? "Open my drive"
                    : "Continue"
              }
              variant="primary"
              size="md"
              disabled={uploading || savingMode}
              onClick={() => void handleNext()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
