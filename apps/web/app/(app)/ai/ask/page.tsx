"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  Chip,
  FileTile,
  Icon,
  PageHead,
  Sidebar,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

interface SourceItem {
  id: string
  citNum?: number
  ext: string
  tone: 0 | 1 | 2
  fileName: string
  detail: string
  href: string
}

interface TextSegment {
  text: string
  citation?: number
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  segments?: TextSegment[]
  sources?: SourceItem[]
  bannerText?: string
  injectionNote?: string
}

type FolderKey = "All folders" | "Personal" | "Thesis" | "Finance" | "Vault"

interface FolderScope {
  key: FolderKey
  consent: string
  filesSeen: number
  maskedCount: number
  ignoredCount: number
  blocked?: boolean
}

const DEFAULT_SCOPE: FolderScope = {
  key: "All folders",
  consent: "Ask each time · 3 consented",
  filesSeen: 3,
  maskedCount: 2,
  ignoredCount: 1,
}

const FOLDER_SCOPES: FolderScope[] = [
  DEFAULT_SCOPE,
  {
    key: "Personal",
    consent: "Ask each time · 2 files",
    filesSeen: 2,
    maskedCount: 1,
    ignoredCount: 1,
  },
  {
    key: "Thesis",
    consent: "Allowed · 3 files",
    filesSeen: 3,
    maskedCount: 4,
    ignoredCount: 0,
  },
  {
    key: "Finance",
    consent: "Ask each time · 1 file",
    filesSeen: 1,
    maskedCount: 2,
    ignoredCount: 0,
  },
  {
    key: "Vault",
    consent: "Encrypted in browser · AI off",
    filesSeen: 0,
    maskedCount: 0,
    ignoredCount: 0,
    blocked: true,
  },
]

const INITIAL_SOURCES: SourceItem[] = [
  {
    id: "src-lease-4",
    citNum: 1,
    ext: "PDF",
    tone: 0,
    fileName: "lease-agreement.pdf",
    detail: "Page 4 · End date",
    href: "Viewer.dc.html",
  },
  {
    id: "src-lease-7",
    citNum: 2,
    ext: "PDF",
    tone: 0,
    fileName: "lease-agreement.pdf",
    detail: "Page 7 · Notice clause",
    href: "Viewer.dc.html",
  },
  {
    id: "src-landlord",
    ext: "DOC",
    tone: 1,
    fileName: "landlord-letter.docx",
    detail: "Not used",
    href: "Viewer.dc.html",
  },
]

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-user-1",
    role: "user",
    text: "When does my lease end and who do I notify?",
  },
  {
    id: "msg-ai-1",
    role: "assistant",
    text: "Your lease ends on August 31, 2027 [1]. The notice period is 60 days, so write to the landlord by July 2, 2027 [2].",
    segments: [
      { text: "Your lease ends on August 31, 2027 ", citation: 1 },
      {
        text: ". The notice period is 60 days, so write to the landlord by July 2, 2027 ",
        citation: 2,
      },
      { text: "." },
    ],
    sources: INITIAL_SOURCES,
    bannerText:
      "Gemini sees 3 files. 2 sensitive values were masked. 1 instruction inside a file was ignored.",
    injectionNote:
      "Injection screen: vendor-invoice.pdf contained text telling the AI to ignore its rules. It was stripped.",
  },
]

const PROMPT_SUGGESTIONS = [
  "What values were masked in my tax return?",
  "Summarize changes in thesis-draft-v4.docx",
  "Which shared files have public links?",
]

function buildAssistantReply(prompt: string, scope: FolderScope): ChatMessage {
  const q = prompt.toLowerCase()
  const id = `msg-ai-${Date.now()}`

  if (q.includes("tax") || q.includes("masked") || scope.key === "Finance") {
    return {
      id,
      role: "assistant",
      text: "Two sensitive values were masked before Gemini saw tax-return-2025.pdf: your national ID token [1] and your IBAN [2]. Your filing year (2025) and deductible total remained visible.",
      segments: [
        {
          text: "Two sensitive values were masked before Gemini saw tax-return-2025.pdf: your national ID token ",
          citation: 1,
        },
        { text: " and your IBAN ", citation: 2 },
        {
          text: ". Your filing year (2025) and deductible total remained visible.",
        },
      ],
      sources: [
        {
          id: `${id}-1`,
          citNum: 1,
          ext: "PDF",
          tone: 2,
          fileName: "tax-return-2025.pdf",
          detail: "Page 1 · National ID masked",
          href: "Viewer.dc.html",
        },
        {
          id: `${id}-2`,
          citNum: 2,
          ext: "PDF",
          tone: 2,
          fileName: "tax-return-2025.pdf",
          detail: "Page 3 · IBAN masked",
          href: "Viewer.dc.html",
        },
      ],
      bannerText:
        "Gemini sees 1 file. 2 sensitive values were masked. 0 instructions ignored.",
      injectionNote:
        "Masking check: ID and IBAN tokens stayed on-server and never reached Gemini.",
    }
  }

  if (q.includes("thesis") || q.includes("draft") || scope.key === "Thesis") {
    return {
      id,
      role: "assistant",
      text: "thesis-draft-v4.docx expands the methodology section with survey response counts [1], while 4 contact values in survey-data.csv stayed masked as tokens [2].",
      segments: [
        {
          text: "thesis-draft-v4.docx expands the methodology section with survey response counts ",
          citation: 1,
        },
        {
          text: ", while 4 contact values in survey-data.csv stayed masked as tokens ",
          citation: 2,
        },
        { text: "." },
      ],
      sources: [
        {
          id: `${id}-1`,
          citNum: 1,
          ext: "DOC",
          tone: 0,
          fileName: "thesis-draft-v4.docx",
          detail: "Section 3 · Version diff vs v3",
          href: "Viewer.dc.html",
        },
        {
          id: `${id}-2`,
          citNum: 2,
          ext: "CSV",
          tone: 2,
          fileName: "survey-data.csv",
          detail: "Columns only · 4 emails masked",
          href: "Viewer.dc.html",
        },
      ],
      bannerText:
        "Gemini sees 2 files in Thesis. 4 sensitive values were masked. 0 instructions ignored.",
      injectionNote:
        "Consent check: Thesis folder is set to Allowed; this read was recorded in AI access log.",
    }
  }

  if (q.includes("link") || q.includes("public") || q.includes("shared")) {
    return {
      id,
      role: "assistant",
      text: "Two active public links match your files: tax-return-2025.pdf has an unpinned public link [1], and survey-data.csv is publicly readable [2].",
      segments: [
        {
          text: "Two active public links match your files: tax-return-2025.pdf has an unpinned public link ",
          citation: 1,
        },
        { text: ", and survey-data.csv is publicly readable ", citation: 2 },
        { text: "." },
      ],
      sources: [
        {
          id: `${id}-1`,
          citNum: 1,
          ext: "PDF",
          tone: 2,
          fileName: "tax-return-2025.pdf",
          detail: "Public link · ID, IBAN flagged",
          href: "Scan.dc.html",
        },
        {
          id: `${id}-2`,
          citNum: 2,
          ext: "CSV",
          tone: 2,
          fileName: "survey-data.csv",
          detail: "Public link · Email addresses",
          href: "Shared.dc.html",
        },
      ],
      bannerText:
        "Gemini checked metadata across consented folders. 2 sensitive findings referenced as masked labels.",
      injectionNote:
        "Prompt screen: no hidden instructions found in indexed metadata.",
    }
  }

  return {
    id,
    role: "assistant",
    text: `Checked ${scope.filesSeen} consented ${scope.filesSeen === 1 ? "file" : "files"} in ${scope.key}. Found a matching clause in lease-agreement.pdf [1] and logged the read with ${scope.maskedCount} sensitive values masked [2].`,
    segments: [
      {
        text: `Checked ${scope.filesSeen} consented ${scope.filesSeen === 1 ? "file" : "files"} in ${scope.key}. Found a matching clause in lease-agreement.pdf `,
        citation: 1,
      },
      {
        text: ` and logged the read with ${scope.maskedCount} sensitive values masked `,
        citation: 2,
      },
      { text: "." },
    ],
    sources: [
      {
        id: `${id}-1`,
        citNum: 1,
        ext: "PDF",
        tone: 0,
        fileName: "lease-agreement.pdf",
        detail: "Page 4 · Matched passage",
        href: "Viewer.dc.html",
      },
      {
        id: `${id}-2`,
        citNum: 2,
        ext: "DOC",
        tone: 1,
        fileName: "landlord-letter.docx",
        detail: "Supporting context",
        href: "Viewer.dc.html",
      },
    ],
    bannerText: `Gemini sees ${scope.filesSeen} files. ${scope.maskedCount} sensitive values were masked. ${scope.ignoredCount} instruction inside a file was ignored.`,
    injectionNote:
      "Injection screen: vendor-invoice.pdf contained text telling the AI to ignore its rules. It was stripped.",
  }
}

export default function AskPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = React.useState("")
  const [folderKey, setFolderKey] = React.useState<FolderKey>("All folders")
  const [folderMenuOpen, setFolderMenuOpen] = React.useState(false)
  const [activeAiMsgId, setActiveAiMsgId] = React.useState<string>("msg-ai-1")
  const [highlightedCits, setHighlightedCits] = React.useState<number[]>([])
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const currentScope =
    FOLDER_SCOPES.find((f) => f.key === folderKey) ?? DEFAULT_SCOPE

  const activeAiMessage =
    messages.find((m) => m.id === activeAiMsgId && m.role === "assistant") ??
    [...messages].reverse().find((m) => m.role === "assistant")

  const sources = activeAiMessage?.sources ?? INITIAL_SOURCES
  const bannerText =
    activeAiMessage?.bannerText ??
    `Gemini sees ${currentScope.filesSeen} files. ${currentScope.maskedCount} sensitive values were masked. ${currentScope.ignoredCount} instruction inside a file was ignored.`
  const injectionNote =
    activeAiMessage?.injectionNote ??
    "Injection screen: vendor-invoice.pdf contained text telling the AI to ignore its rules. It was stripped."

  function showToast(msg: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(msg)
    timerRef.current = setTimeout(() => setToast(null), 4000)
  }

  function submitQuestion(rawText: string) {
    const trimmed = rawText.trim()
    if (!trimmed || currentScope.blocked) return

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      text: trimmed,
    }
    const aiMsg = buildAssistantReply(trimmed, currentScope)

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setActiveAiMsgId(aiMsg.id)
    setHighlightedCits([])
    setInput("")
    setFolderMenuOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitQuestion(input)
  }

  function handleCitationClick(msgId: string, citNum: number) {
    setActiveAiMsgId(msgId)
    setHighlightedCits((prev) =>
      prev.length === 1 && prev[0] === citNum && activeAiMsgId === msgId
        ? []
        : [citNum]
    )
  }

  function handleOpenSources(msg: ChatMessage) {
    setActiveAiMsgId(msg.id)
    const citNums = (msg.sources ?? [])
      .map((s) => s.citNum)
      .filter((n): n is number => typeof n === "number")
    setHighlightedCits(citNums)
    showToast(
      `Highlighted ${citNums.length || (msg.sources?.length ?? 0)} cited sources`
    )
  }

  async function handleCopyAnswer(msg: ChatMessage) {
    try {
      await navigator.clipboard?.writeText(msg.text)
    } catch {
      // Clipboard may be unavailable in non-HTTPS contexts
    }
    setCopiedId(msg.id)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    showToast("Answer copied")
  }

  return (
    <div
      className="app"
      style={{ minHeight: 900, position: "relative" }}
      onClick={() => {
        if (folderMenuOpen) setFolderMenuOpen(false)
      }}
    >
      <Sidebar active="ask" />
      <main className="main">
        <PageHead
          title="Ask my files"
          sub="Answers come with sources. Sensitive values never leave."
          cta="none"
          ctaIcon="upload"
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <section
            className="glass col"
            style={{
              flex: "1 1 620px",
              minWidth: 0,
              borderRadius: 22,
              padding: 20,
              gap: 16,
              minHeight: 700,
            }}
          >
            <div
              className="glass-soft row"
              style={{ borderRadius: 12, padding: "10px 14px", gap: 10 }}
            >
              <Icon glyph="shield" size={16} />
              <span className="xs muted grow">
                {currentScope.blocked
                  ? "Vault is encrypted in your browser. Gemini cannot read files in Vault."
                  : bannerText}
              </span>
              <Button
                label="Details"
                variant="ghost"
                size="sm"
                href="AILog.dc.html"
              />
            </div>

            <div className="col" style={{ gap: 14, flex: 1 }}>
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: "flex-end",
                      maxWidth: "70%",
                      padding: "12px 14px",
                      borderRadius: "16px 16px 4px 16px",
                      background: "var(--ink)",
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.text}
                  </div>
                ) : (
                  <div
                    key={msg.id}
                    className="glass-soft col"
                    style={{
                      maxWidth: "80%",
                      padding: "14px 16px",
                      borderRadius: "16px 16px 16px 4px",
                      gap: 10,
                    }}
                  >
                    <p className="p" style={{ margin: 0 }}>
                      {msg.segments
                        ? msg.segments.map((seg, idx) => {
                            const cit = seg.citation
                            return (
                              <React.Fragment key={idx}>
                                {seg.text}
                                {cit !== undefined ? (
                                  <button
                                    type="button"
                                    className="chip chip-accent"
                                    onClick={() =>
                                      handleCitationClick(msg.id, cit)
                                    }
                                    aria-label={`Highlight source ${cit}`}
                                    style={{
                                      height: 20,
                                      padding: "0 7px",
                                      cursor: "pointer",
                                      verticalAlign: "baseline",
                                    }}
                                  >
                                    {cit}
                                  </button>
                                ) : null}
                              </React.Fragment>
                            )
                          })
                        : msg.text}
                    </p>
                    <div className="row" style={{ gap: 8 }}>
                      <Button
                        label={copiedId === msg.id ? "Copied" : "Copy"}
                        variant="ghost"
                        size="sm"
                        icon={copiedId === msg.id ? "check" : "copy"}
                        onClick={() => void handleCopyAnswer(msg)}
                      />
                      <Button
                        label="Open sources"
                        variant="ghost"
                        size="sm"
                        icon="file"
                        onClick={() => handleOpenSources(msg)}
                      />
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="col" style={{ gap: 10 }}>
              <div className="row wrap" style={{ gap: 8 }}>
                {PROMPT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={currentScope.blocked}
                    onClick={() => submitQuestion(suggestion)}
                    style={{ fontSize: 12 }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {currentScope.blocked ? (
                <div
                  className="glass-soft row wrap between"
                  style={{
                    borderRadius: 12,
                    padding: "10px 14px",
                    gap: 10,
                  }}
                >
                  <span className="xs muted">
                    Switch to a consented folder to ask Gemini a question.
                  </span>
                  <Button
                    label="Use All folders"
                    variant="secondary"
                    size="sm"
                    onClick={() => setFolderKey("All folders")}
                  />
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className="row"
                style={{ gap: 10, position: "relative" }}
              >
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={folderMenuOpen}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFolderMenuOpen((open) => !open)
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                      display: "inline-flex",
                    }}
                  >
                    <Chip
                      label={folderKey}
                      tone={currentScope.blocked ? "accent" : "neutral"}
                      icon={currentScope.blocked ? "lock" : "folder"}
                    />
                  </button>

                  {folderMenuOpen ? (
                    <div
                      className="menu pop"
                      role="menu"
                      aria-label="Folder consent scope"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        bottom: 34,
                        left: 0,
                        width: 272,
                        transformOrigin: "bottom left",
                      }}
                    >
                      {FOLDER_SCOPES.map((scope) => (
                        <button
                          key={scope.key}
                          type="button"
                          role="menuitemradio"
                          aria-checked={scope.key === folderKey}
                          className={`mi${scope.blocked ? " dg" : ""}`}
                          onClick={() => {
                            setFolderKey(scope.key)
                            setFolderMenuOpen(false)
                          }}
                          style={{ height: 42 }}
                        >
                          <Icon
                            glyph={scope.blocked ? "lock" : "folder"}
                            size={15}
                          />
                          <div className="grow col" style={{ gap: 1 }}>
                            <span className="sm m">{scope.key}</span>
                            <span className="xs muted">{scope.consent}</span>
                          </div>
                          {scope.key === folderKey ? (
                            <Icon glyph="check" size={14} />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <input
                  className="input"
                  style={{ height: 48, borderRadius: 12 }}
                  placeholder={
                    currentScope.blocked
                      ? "AI consent is off for Vault"
                      : "Ask across your files"
                  }
                  aria-label="Ask across your files"
                  value={input}
                  disabled={currentScope.blocked}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button
                  type="submit"
                  label="Send"
                  variant="primary"
                  size="lg"
                  icon="send"
                  iconOnly
                  disabled={currentScope.blocked || !input.trim()}
                />
              </form>
            </div>
          </section>

          <aside
            className="col"
            style={{ flex: "0 0 320px", gap: 10, alignSelf: "flex-start" }}
          >
            <span className="sm b">Sources</span>
            {sources.map((src) => {
              const isHighlighted =
                src.citNum !== undefined &&
                highlightedCits.includes(src.citNum)
              return (
                <div
                  key={src.id}
                  className={`glass-soft row${isHighlighted ? " item on" : ""}`}
                  style={{ borderRadius: 14, padding: "10px 12px", gap: 12 }}
                >
                  <FileTile ext={src.ext} tone={src.tone} size={32} />
                  <div className="grow col" style={{ gap: 1, minWidth: 0 }}>
                    <Link
                      href={resolveBoardHref(src.href)}
                      className="sm m ell"
                    >
                      {src.fileName}
                    </Link>
                    <span className="xs muted">{src.detail}</span>
                  </div>
                  {src.citNum !== undefined ? (
                    <span
                      className={`chip ${isHighlighted ? "chip-accent" : "chip-neutral"}`}
                      style={{ height: 20, padding: "0 7px" }}
                    >
                      {src.citNum}
                    </span>
                  ) : null}
                </div>
              )
            })}

            <div
              className="glass-soft row"
              style={{
                borderRadius: 14,
                padding: 12,
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: "var(--accent)" }}>
                <Icon glyph="warn" size={16} />
              </span>
              <span className="xs muted" style={{ lineHeight: 1.5 }}>
                {injectionNote}
              </span>
            </div>
          </aside>
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
