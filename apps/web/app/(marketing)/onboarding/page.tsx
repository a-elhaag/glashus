"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

type StepNumber = 1 | 2 | 3

const STEP_COPY: Record<StepNumber, { title: string; sub: string }> = {
  1: {
    title: "Add your first file",
    sub: "Anything works. We scan it before it lands in your drive.",
  },
  2: {
    title: "Choose how AI may help",
    sub: "You can change this per folder later. AI never reads without your say.",
  },
  3: {
    title: "Your first scan result",
    sub: "This is what Glashus checks on every file.",
  },
}

const AI_MODES = [
  {
    label: "Off",
    sub: "No AI reads your files.",
  },
  {
    label: "Ask each time",
    sub: "You approve every AI read. Recommended.",
  },
  {
    label: "Allowed folders only",
    sub: "AI reads folders you pick, with redaction on.",
  },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<StepNumber>(1)
  const [mode, setMode] = React.useState<number>(1)
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const currentStep = STEP_COPY[step]
  const displayFileName = selectedFile ?? "passport-scan.jpg"
  const fileExt =
    displayFileName.split(".").pop()?.slice(0, 4).toUpperCase() || "JPG"

  const handleBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepNumber) : prev))
  }

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => ((prev + 1) as StepNumber))
      return
    }
    router.push(resolveBoardHref("Main.dc.html"))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file.name)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setSelectedFile(file.name)
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

        {step === 1 ? (
          <div
            className="glass-soft col center"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
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
              {selectedFile ? `Ready to scan: ${selectedFile}` : "Drop a file here"}
            </span>
            <span className="xs muted">
              Or pick one. It goes to quarantine and is scanned first.
            </span>
            <input
              ref={fileInputRef}
              type="file"
              className="visually-hidden"
              aria-label="Choose a file to scan"
              onChange={handleFileChange}
            />
            <Button
              label={selectedFile ? "Choose another file" : "Choose file"}
              variant="secondary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="col" style={{ gap: 10 }}>
            {AI_MODES.map((item, idx) => {
              const selected = mode === idx
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMode(idx)}
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
          <div className="col" style={{ gap: 12 }}>
            <div
              className="glass-soft row"
              style={{ borderRadius: 16, padding: 16, gap: 14 }}
            >
              <FileTile ext={fileExt} tone={2} size={40} />
              <div className="grow col" style={{ gap: 2 }}>
                <span className="m">{displayFileName}</span>
                <span className="sm muted">
                  1 sensitive item found: ID number
                </span>
              </div>
              <Chip label="Flagged" tone="accent" />
            </div>
            <div
              className="glass-soft row"
              style={{ borderRadius: 16, padding: 16, gap: 14 }}
            >
              <div className="tile n">
                <Icon glyph="check" size={18} />
              </div>
              <div className="grow col" style={{ gap: 2 }}>
                <span className="m">No malware found</span>
                <span className="sm muted">
                  Moved out of quarantine in 3 seconds
                </span>
              </div>
            </div>
          </div>
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
          <Button
            label={step === 3 ? "Open my drive" : "Continue"}
            variant="primary"
            size="md"
            onClick={handleNext}
          />
        </div>
      </div>
    </div>
  )
}
