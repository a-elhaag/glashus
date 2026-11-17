"use client"

import * as React from "react"
import {
  Button,
  Icon,
  PageHead,
  Seg,
  Sidebar,
  Switch,
} from "@workspace/ui/components/glashus"

type ExportFormat = "ZIP" | "PDF bundle" | "JSON"

interface FolderPreset {
  id: string
  name: string
  meta: string
  fileCount: number
  maskedTotal: number
  beforeLine1: string
  beforeLine2: string
  tokenizedLine1: string
  tokenizedLine2: string
  redactedLine1: string
  redactedLine2: string
  tokenMap: Array<{ token: string; value: string }>
}

const DEFAULT_PRESET: FolderPreset = {
  id: "thesis",
  name: "Thesis folder",
  meta: "7 files · 5.8 MB",
  fileCount: 7,
  maskedTotal: 4,
  beforeLine1: "Prof. Haddad approved the survey on 12 Oct.",
  beforeLine2: "Contact: haddad@uni.edu, +49 170 1234567",
  tokenizedLine1: "PERSON_1 approved the survey on 12 Oct.",
  tokenizedLine2: "Contact: EMAIL_1, PHONE_1",
  redactedLine1: "[REDACTED] approved the survey on 12 Oct.",
  redactedLine2: "Contact: [REDACTED], [REDACTED]",
  tokenMap: [
    { token: "PERSON_1", value: "Prof. Haddad" },
    { token: "EMAIL_1", value: "haddad@uni.edu" },
    { token: "PHONE_1", value: "+49 170 1234567" },
  ],
}

const FOLDER_PRESETS: FolderPreset[] = [
  DEFAULT_PRESET,
  {
    id: "finance",
    name: "Finance folder",
    meta: "4 files · 3.1 MB",
    fileCount: 4,
    maskedTotal: 6,
    beforeLine1: "Account holder: Anas Abuelhaag (ID 2980411-88).",
    beforeLine2: "Transfer IBAN DE89 3704 0044 0532 0130 00.",
    tokenizedLine1: "Account holder: PERSON_1 (ID ID_1).",
    tokenizedLine2: "Transfer IBAN IBAN_1.",
    redactedLine1: "Account holder: [REDACTED] (ID [REDACTED]).",
    redactedLine2: "Transfer IBAN [REDACTED].",
    tokenMap: [
      { token: "PERSON_1", value: "Anas Abuelhaag" },
      { token: "ID_1", value: "2980411-88" },
      { token: "IBAN_1", value: "DE89 3704 0044 0532 0130 00" },
    ],
  },
  {
    id: "personal",
    name: "Personal folder",
    meta: "9 files · 11.4 MB",
    fileCount: 9,
    maskedTotal: 3,
    beforeLine1: "Landlord Mara Weber confirmed renewal until Aug 2027.",
    beforeLine2: "Reply to mara.weber@haus.de before Jul 2.",
    tokenizedLine1: "Landlord PERSON_1 confirmed renewal until Aug 2027.",
    tokenizedLine2: "Reply to EMAIL_1 before Jul 2.",
    redactedLine1: "Landlord [REDACTED] confirmed renewal until Aug 2027.",
    redactedLine2: "Reply to [REDACTED] before Jul 2.",
    tokenMap: [
      { token: "PERSON_1", value: "Mara Weber" },
      { token: "EMAIL_1", value: "mara.weber@haus.de" },
    ],
  },
]

function restoreTokens(
  input: string,
  tokenMap: Array<{ token: string; value: string }>
): string {
  let out = input
  for (const item of tokenMap) {
    out = out.split(item.token).join(item.value)
  }
  return out
}

export default function ExportPage() {
  const [presetIndex, setPresetIndex] = React.useState(0)
  const [maskPersonal, setMaskPersonal] = React.useState(true)
  const [replaceWithTokens, setReplaceWithTokens] = React.useState(true)
  const [stripMetadata, setStripMetadata] = React.useState(true)
  const [format, setFormat] = React.useState<ExportFormat>("ZIP")
  const [restoredMode, setRestoredMode] = React.useState(false)
  const [restoreText, setRestoreText] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const preset = FOLDER_PRESETS[presetIndex] ?? DEFAULT_PRESET

  const afterLine1 = !maskPersonal
    ? preset.beforeLine1
    : restoredMode
      ? preset.beforeLine1
      : replaceWithTokens
        ? preset.tokenizedLine1
        : preset.redactedLine1

  const afterLine2 = !maskPersonal
    ? preset.beforeLine2
    : restoredMode
      ? preset.beforeLine2
      : replaceWithTokens
        ? preset.tokenizedLine2
        : preset.redactedLine2

  const previewPlainText =
    format === "JSON"
      ? JSON.stringify(
          {
            folder: preset.name,
            metadataStripped: stripMetadata,
            tokenized: maskPersonal && replaceWithTokens && !restoredMode,
            excerpt: [afterLine1, afterLine2],
          },
          null,
          2
        )
      : `${afterLine1}\n${afterLine2}`

  const restoreSource =
    restoreText || `${preset.tokenizedLine1}\n${preset.tokenizedLine2}`
  const restoredOutput = restoreTokens(restoreSource, preset.tokenMap)

  function showToast(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }

  function handleCycleFolder() {
    setPresetIndex((idx) => (idx + 1) % FOLDER_PRESETS.length)
    setRestoredMode(false)
    setRestoreText("")
  }

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(
        restoredMode ? restoredOutput : previewPlainText
      )
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    showToast("Masked copy placed on clipboard")
  }

  function handleToggleRestore() {
    if (!maskPersonal || !replaceWithTokens) {
      showToast("Enable token replacement to restore from a token map")
      return
    }
    setRestoredMode((prev) => !prev)
  }

  function handleExport() {
    const ext =
      format === "JSON" ? "json" : format === "PDF bundle" ? "txt" : "txt"
    const content =
      format === "JSON"
        ? previewPlainText
        : `# Glashus AI-safe export (${format})\nFolder: ${preset.name}\nMetadata stripped: ${stripMetadata ? "yes" : "no"}\n\n${afterLine1}\n${afterLine2}\n`
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${preset.id}-ai-safe.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Download fallback
    }
    showToast(
      `Prepared ${format} export (${maskPersonal ? `${preset.maskedTotal} values masked` : "unmasked"})`
    )
  }

  const summaryMessage = !maskPersonal
    ? `Warning: masking is off. Sensitive values in ${preset.fileCount} files will be exported as-is.`
    : restoredMode
      ? "Previewing restored text locally. Your token map never leaves your drive."
      : replaceWithTokens
        ? `${preset.maskedTotal} values masked in ${preset.fileCount} files. The token map stays in your drive.`
        : `${preset.maskedTotal} values permanently redacted in ${preset.fileCount} files (cannot be restored).`

  return (
    <div className="app" style={{ minHeight: 900, position: "relative" }}>
      <Sidebar active="export" />
      <main className="main">
        <PageHead
          title="AI-safe export"
          sub="A copy you can paste into any AI tool without leaking"
          cta="none"
          ctaIcon="upload"
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <section
            className="glass card col"
            style={{ flex: "1 1 420px", gap: 14 }}
          >
            <h2 className="h2">Choose what to export</h2>
            <div
              className="glass-soft row"
              style={{ borderRadius: 14, padding: 12, gap: 12 }}
            >
              <Icon glyph="folder" size={18} />
              <div className="grow col" style={{ gap: 1 }}>
                <span className="sm m">{preset.name}</span>
                <span className="xs muted">{preset.meta}</span>
              </div>
              <Button
                label="Change"
                variant="ghost"
                size="sm"
                onClick={handleCycleFolder}
              />
            </div>

            <hr className="hr" />

            <Switch
              label="Mask personal data"
              sub="Names, IDs, emails, card numbers"
              on={maskPersonal}
              onChange={(next) => {
                setMaskPersonal(next)
                if (!next) setRestoredMode(false)
              }}
            />
            <Switch
              label="Replace with tokens"
              sub="Use tokens like PERSON_1 so you can restore later"
              on={replaceWithTokens && maskPersonal}
              onChange={(next) => {
                if (!maskPersonal && next) setMaskPersonal(true)
                setReplaceWithTokens(next)
                if (!next) setRestoredMode(false)
              }}
            />
            <Switch
              label="Strip file metadata"
              sub="Location, author, device"
              on={stripMetadata}
              onChange={setStripMetadata}
            />

            <hr className="hr" />
            <span className="sm b">Format</span>
            <Seg
              options={["ZIP", "PDF bundle", "JSON"]}
              value={format}
              onChange={(val) => setFormat(val as ExportFormat)}
              aria-label="Export format"
            />
          </section>

          <section
            className="glass card col"
            style={{ flex: "1 1 420px", gap: 14 }}
          >
            <div className="row between">
              <h2 className="h2">Preview</h2>
              <Button
                label={copied ? "Copied" : "Copy"}
                variant="ghost"
                size="sm"
                icon={copied ? "check" : "copy"}
                onClick={() => void handleCopy()}
              />
            </div>

            <div className="col" style={{ gap: 6 }}>
              <span className="xs b muted">Before</span>
              <div className="sheet mono" style={{ padding: 14, lineHeight: 1.7 }}>
                {preset.beforeLine1}
                <br />
                {preset.beforeLine2}
              </div>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <span className="xs b muted">
                {restoredMode
                  ? "Restored locally"
                  : format === "JSON"
                    ? "After (JSON)"
                    : "After"}
              </span>
              {format === "JSON" && !restoredMode ? (
                <pre
                  className="sheet mono"
                  style={{
                    padding: 14,
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {previewPlainText}
                </pre>
              ) : (
                <div
                  className="sheet mono"
                  style={{ padding: 14, lineHeight: 1.7 }}
                >
                  {afterLine1}
                  <br />
                  {afterLine2}
                </div>
              )}
            </div>

            {restoredMode ? (
              <div
                className="glass-soft col"
                style={{ borderRadius: 14, padding: 12, gap: 8 }}
              >
                <span className="xs b">
                  Paste an AI reply with tokens to restore locally
                </span>
                <textarea
                  className="input mono"
                  rows={3}
                  style={{ height: "auto", padding: 10, resize: "vertical" }}
                  placeholder={`${preset.tokenizedLine1}\n${preset.tokenizedLine2}`}
                  value={restoreText}
                  onChange={(e) => setRestoreText(e.target.value)}
                  aria-label="Tokenized text to restore"
                />
                <div className="xs muted">
                  Restored output: <span className="mono">{restoredOutput}</span>
                </div>
              </div>
            ) : null}

            <p
              className="xs muted"
              style={{
                margin: 0,
                color: !maskPersonal ? "var(--accent)" : undefined,
              }}
            >
              {summaryMessage}
            </p>

            <div
              className="row wrap"
              style={{ gap: 10, justifyContent: "flex-end" }}
            >
              <Button
                label={
                  restoredMode ? "Back to masked" : "Restore from token map"
                }
                variant="secondary"
                size="md"
                icon="undo"
                onClick={handleToggleRestore}
              />
              <Button
                label="Export safely"
                variant="primary"
                size="md"
                icon="download"
                onClick={handleExport}
              />
            </div>
          </section>
        </div>
      </main>

      {toast ? (
        <div role="status" className="toast" style={{ position: "fixed" }}>
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  )
}
