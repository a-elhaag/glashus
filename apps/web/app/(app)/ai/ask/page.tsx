"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Button,
  Chip,
  Icon,
  PageHead,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { extractExt } from "@/lib/format"
import {
  unwrapApi,
  useFolders,
  useInvalidateDrive,
  useMe,
} from "@/lib/queries"

interface AskTurn {
  id: string
  role: "user" | "assistant"
  text: string
  citations?: Array<{
    fileId: string
    fileName: string
    detail: string
    excerpt: string
  }>
  maskedCount?: number
  ignoredCount?: number
  consentBlocked?: boolean
  consentMessage?: string | null
  folderIdUsed?: string | null
}

const PROMPT_SUGGESTIONS = [
  "Summarize my uploaded documents without sensitive values",
  "Which files in my drive contain sensitive findings?",
  "What folders currently permit AI questions?",
]

function AskInner() {
  const params = useSearchParams()
  const initialQuery = params.get("q")?.trim() ?? ""

  const { data: folders = [] } = useFolders()
  const { data: me } = useMe()
  const invalidate = useInvalidateDrive()

  const [folderId, setFolderId] = React.useState<string>("")
  const [draft, setDraft] = React.useState(initialQuery)
  const [messages, setMessages] = React.useState<AskTurn[]>([])
  const [asking, setAsking] = React.useState(false)
  const [allowingFolderId, setAllowingFolderId] = React.useState<string | null>(
    null
  )
  const [toast, setToast] = React.useState<string | null>(null)
  const didAutoAskRef = React.useRef(false)
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

  const submitQuestion = React.useCallback(
    async (rawQuestion: string, targetFolderId: string | null) => {
      const q = rawQuestion.trim()
      if (!q || asking) return
      setDraft("")
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: q },
      ])
      setAsking(true)
      try {
        const res = unwrapApi(
          await glashusApi.POST("/v1/ai/ask", {
            body: { question: q, folderId: targetFolderId },
          })
        )
        invalidate()
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: res.answer,
            citations: res.citations,
            maskedCount: res.maskedCount,
            ignoredCount: res.ignoredCount,
            consentBlocked: res.consentBlocked,
            consentMessage: res.consentMessage,
            folderIdUsed: targetFolderId,
          },
        ])
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text: err instanceof Error ? err.message : "Could not ask files.",
          },
        ])
      } finally {
        setAsking(false)
      }
    },
    [asking, invalidate]
  )

  React.useEffect(() => {
    if (initialQuery && !didAutoAskRef.current) {
      didAutoAskRef.current = true
      void submitQuestion(initialQuery, folderId || null)
    }
  }, [folderId, initialQuery, submitQuestion])

  const allowFolderForAi = async (targetFolderId: string) => {
    setAllowingFolderId(targetFolderId)
    try {
      unwrapApi(
        await glashusApi.PATCH("/v1/folders/{id}", {
          params: { path: { id: targetFolderId } },
          body: { aiConsent: "allow" },
        })
      )
      invalidate()
      notify("Folder AI consent updated to Allow")
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not update folder consent."
      )
    } finally {
      setAllowingFolderId(null)
    }
  }

  const aiMode = me?.user.aiMode ?? "ask"

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="ask" />
      <main className="main">
        <PageHead
          title="Ask my files"
          sub="Consent-gated Gemini Q&A over masked excerpts. Every file read is written to the AI access log."
          cta="AI access log"
          ctaIcon="clock"
          ctaHref="/ai/log"
        />

        {aiMode === "off" ? (
          <div
            className="glass card row wrap between"
            style={{
              padding: "14px 18px",
              gap: 12,
              borderColor: "rgba(217,119,6,0.45)",
            }}
          >
            <div className="row" style={{ gap: 10 }}>
              <Icon glyph="warn" size={18} />
              <span className="sm m">
                Global AI access is paused in Settings. Questions will be blocked
                until resumed.
              </span>
            </div>
            <Button
              label="Open AI settings"
              size="sm"
              variant="primary"
              href="/drive/settings#ai-consent"
            />
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(230px, 280px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <aside className="glass card col" style={{ gap: 10 }}>
            <span className="xs muted">FOLDER CONSENT SCOPE</span>
            <button
              type="button"
              onClick={() => setFolderId("")}
              className="row between"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background:
                  folderId === "" ? "rgba(255,255,255,0.7)" : "transparent",
              }}
            >
              <span className="sm m">All consented folders</span>
              <Chip label={aiMode} tone={aiMode === "off" ? "accent" : "clear"} />
            </button>

            {folders.map((fld) => {
              const selected = folderId === fld.id
              return (
                <button
                  key={fld.id}
                  type="button"
                  onClick={() => setFolderId(fld.id)}
                  className="row between"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    background: selected
                      ? "rgba(255,255,255,0.7)"
                      : "transparent",
                  }}
                >
                  <span className="row" style={{ gap: 8, minWidth: 0 }}>
                    <Icon glyph="folder" size={15} />
                    <span className="sm m ell">{fld.name}</span>
                  </span>
                  <Chip
                    label={fld.aiConsent}
                    tone={fld.aiConsent === "off" ? "neutral" : "clear"}
                  />
                </button>
              )
            })}

            <hr className="hr" />
            <Link
              href="/drive/settings#ai-consent"
              className="xs m"
              style={{ color: "var(--accent)" }}
            >
              Manage folder AI consent in Settings →
            </Link>
          </aside>

          <section className="glass card col" style={{ gap: 14, minHeight: 520 }}>
            <div className="col grow" style={{ gap: 12 }}>
              {messages.length === 0 ? (
                <div className="col" style={{ gap: 12, padding: "20px 6px" }}>
                  <span className="h2">Ask anything across consented folders</span>
                  <p className="p muted" style={{ margin: 0 }}>
                    PII tokens and secrets are masked before leaving Glashus, and
                    prompt-injection strings inside uploaded documents are
                    stripped.
                  </p>
                  <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
                    {PROMPT_SUGGESTIONS.map((s) => (
                      <Button
                        key={s}
                        label={s}
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void submitQuestion(s, folderId || null)
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={m.role === "user" ? "glass-soft col" : "col"}
                    style={{
                      padding: m.role === "user" ? "12px 14px" : "4px 2px",
                      borderRadius: 14,
                      gap: 8,
                    }}
                  >
                    <span className="xs muted">
                      {m.role === "user" ? "YOU" : "GLASHUS AI"}
                    </span>
                    <div className="sm" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </div>

                    {m.role === "assistant" &&
                    (m.maskedCount !== undefined ||
                      m.ignoredCount !== undefined) ? (
                      <div className="row wrap" style={{ gap: 8 }}>
                        <Chip
                          label={`${m.maskedCount ?? 0} values masked`}
                          tone="clear"
                        />
                        {(m.ignoredCount ?? 0) > 0 ? (
                          <Chip
                            label={`${m.ignoredCount} injection cue(s) stripped`}
                            tone="accent"
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {m.consentBlocked ? (
                      <div
                        className="glass-soft row wrap between"
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          gap: 10,
                          borderColor: "rgba(217,119,6,0.4)",
                        }}
                      >
                        <span className="xs muted">
                          {m.consentMessage ??
                            "Consent is currently set to Off for this scope."}
                        </span>
                        <div className="row" style={{ gap: 8 }}>
                          {m.folderIdUsed ? (
                            <Button
                              label={
                                allowingFolderId === m.folderIdUsed
                                  ? "Enabling…"
                                  : "Allow this folder"
                              }
                              size="sm"
                              variant="primary"
                              disabled={allowingFolderId !== null}
                              onClick={() =>
                                void allowFolderForAi(m.folderIdUsed!)
                              }
                            />
                          ) : null}
                          <Button
                            label="Consent settings"
                            size="sm"
                            href="/drive/settings#ai-consent"
                          />
                        </div>
                      </div>
                    ) : null}

                    {m.citations && m.citations.length > 0 ? (
                      <div className="col" style={{ gap: 6, marginTop: 2 }}>
                        <span className="xs muted">SOURCES</span>
                        {m.citations.map((cit, idx) => (
                          <Link
                            key={`${cit.fileId}-${idx}`}
                            href={`/viewer?fileId=${encodeURIComponent(cit.fileId)}`}
                            className="glass-soft row between"
                            style={{
                              padding: "8px 12px",
                              borderRadius: 12,
                              gap: 10,
                            }}
                          >
                            <div className="col" style={{ minWidth: 0, gap: 2 }}>
                              <span className="sm m ell">{cit.fileName}</span>
                              <span className="xs muted ell">{cit.detail}</span>
                            </div>
                            <Chip label={extractExt(cit.fileName)} tone="neutral" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void submitQuestion(draft, folderId || null)
              }}
              className="row"
              style={{
                gap: 8,
                paddingTop: 12,
                borderTop: "1px solid var(--line)",
              }}
            >
              <input
                className="input grow"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  folderId
                    ? "Ask about files in selected folder…"
                    : "Ask across consented folders…"
                }
              />
              <Button
                label={asking ? "Thinking…" : "Ask"}
                icon="send"
                variant="primary"
                type="submit"
                disabled={asking || !draft.trim()}
              />
            </form>
          </section>
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

export default function AskPage() {
  return (
    <React.Suspense
      fallback={
        <div className="app" style={{ minHeight: 900 }}>
          <AppSidebar active="ask" />
          <main className="main">
            <div className="glass card" style={{ padding: 24 }}>
              <span className="sm muted">Loading Ask my files…</span>
            </div>
          </main>
        </div>
      }
    >
      <AskInner />
    </React.Suspense>
  )
}
