"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, resolveBoardHref } from "@workspace/ui/components/glashus"

interface PaletteItem {
  id: string
  section: "Files" | "Commands" | "AI"
  icon: string
  label: string
  meta?: string
  shortcut?: string
  href: string
  keywords?: string
}

const FILE_ITEMS: readonly PaletteItem[] = [
  {
    id: "file-tax-return",
    section: "Files",
    icon: "file",
    label: "tax-return-2025.pdf",
    meta: " · Public",
    href: "Viewer.dc.html",
    keywords: "pdf public tax return 2025",
  },
  {
    id: "file-tax-notes",
    section: "Files",
    icon: "file",
    label: "tax-notes.md",
    meta: " · Private",
    href: "Viewer.dc.html",
    keywords: "markdown private tax notes",
  },
  {
    id: "file-api-config",
    section: "Files",
    icon: "file",
    label: "api-config.env",
    meta: " · Private",
    href: "Viewer.dc.html",
    keywords: "env secret masked config",
  },
  {
    id: "file-customers",
    section: "Files",
    icon: "file",
    label: "customers.xlsx",
    meta: " · Shared",
    href: "Viewer.dc.html",
    keywords: "excel spreadsheet customers",
  },
  {
    id: "file-site-plan",
    section: "Files",
    icon: "image",
    label: "site-plan.png",
    meta: " · Private",
    href: "Viewer.dc.html",
    keywords: "png image design plan",
  },
]

const COMMAND_ITEMS: readonly PaletteItem[] = [
  {
    id: "cmd-share",
    section: "Commands",
    icon: "share",
    label: "Share a file…",
    shortcut: "S",
    href: "Share.dc.html",
    keywords: "share link public permission",
  },
  {
    id: "cmd-scan",
    section: "Commands",
    icon: "shield",
    label: "Open scan report",
    shortcut: "G R",
    href: "Scan.dc.html",
    keywords: "scan report dlp sensitive findings",
  },
  {
    id: "cmd-drive",
    section: "Commands",
    icon: "drive",
    label: "Go to Drive",
    shortcut: "G D",
    href: "Main.dc.html",
    keywords: "drive home files",
  },
  {
    id: "cmd-shared",
    section: "Commands",
    icon: "link",
    label: "Go to Shared by me",
    shortcut: "G S",
    href: "Shared.dc.html",
    keywords: "shared links exposure",
  },
  {
    id: "cmd-upload",
    section: "Commands",
    icon: "upload",
    label: "Upload files",
    shortcut: "U",
    href: "Upload.dc.html",
    keywords: "upload add files",
  },
  {
    id: "cmd-exposure",
    section: "Commands",
    icon: "graph",
    label: "Open exposure map",
    href: "Exposure.dc.html",
    keywords: "exposure map graph",
  },
  {
    id: "cmd-ailog",
    section: "Commands",
    icon: "clock",
    label: "Open AI access log",
    href: "AILog.dc.html",
    keywords: "ai log gemini audit",
  },
  {
    id: "cmd-shortcuts",
    section: "Commands",
    icon: "info",
    label: "Keyboard shortcuts",
    shortcut: "?",
    href: "Shortcuts.dc.html",
    keywords: "keyboard shortcuts help",
  },
]

const DEFAULT_QUICK_COMMANDS = COMMAND_ITEMS.slice(0, 2)

function matchesQuery(item: PaletteItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  const haystack =
    `${item.label} ${item.meta ?? ""} ${item.keywords ?? ""}`.toLowerCase()
  return haystack.includes(normalizedQuery)
}

export default function PalettePage() {
  const router = useRouter()
  const [query, setQuery] = React.useState("tax")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const itemRefs = React.useRef<Array<HTMLAnchorElement | null>>([])

  const normalizedQuery = query.trim().toLowerCase()

  const files = React.useMemo(() => {
    if (!normalizedQuery) return FILE_ITEMS.slice(0, 3)
    return FILE_ITEMS.filter((item) => matchesQuery(item, normalizedQuery))
  }, [normalizedQuery])

  const commands = React.useMemo(() => {
    if (!normalizedQuery) return COMMAND_ITEMS.slice(0, 4)
    const matched = COMMAND_ITEMS.filter((item) =>
      matchesQuery(item, normalizedQuery)
    )
    if (matched.length > 0) return matched
    if (files.length > 0) return DEFAULT_QUICK_COMMANDS
    return []
  }, [normalizedQuery, files.length])

  const aiItem = React.useMemo<PaletteItem>(() => {
    const trimmed = query.trim()
    return {
      id: "ai-ask",
      section: "AI",
      icon: "sparkle",
      label: trimmed ? `Ask my files: “${trimmed}”` : "Ask my files…",
      shortcut: "↵",
      href: trimmed
        ? `${resolveBoardHref("Ask.dc.html")}?q=${encodeURIComponent(trimmed)}`
        : resolveBoardHref("Ask.dc.html"),
    }
  }, [query])

  const visibleItems = React.useMemo(
    () => [...files, ...commands, aiItem],
    [files, commands, aiItem]
  )

  const safeIndex =
    visibleItems.length > 0
      ? Math.min(activeIndex, visibleItems.length - 1)
      : 0

  const commandOffset = files.length
  const aiIndex = files.length + commands.length

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    itemRefs.current[safeIndex]?.scrollIntoView({ block: "nearest" })
  }, [safeIndex])

  const handleEscape = React.useCallback(() => {
    if (query.length > 0) {
      setQuery("")
      setActiveIndex(0)
      inputRef.current?.focus()
      return
    }
    router.push(resolveBoardHref("Main.dc.html"))
  }, [query.length, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (visibleItems.length === 0) return
      setActiveIndex((prev) => (prev + 1) % visibleItems.length)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (visibleItems.length === 0) return
      setActiveIndex(
        (prev) => (prev - 1 + visibleItems.length) % visibleItems.length
      )
      return
    }
    if (e.key === "Enter") {
      if (e.target instanceof HTMLButtonElement) return
      const selected = visibleItems[safeIndex]
      if (!selected) return
      e.preventDefault()
      router.push(resolveBoardHref(selected.href))
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      handleEscape()
    }
  }

  return (
    <div
      className="plain"
      style={{
        minHeight: "100vh",
        padding: 40,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="glass col"
        style={{
          width: 640,
          maxWidth: "100%",
          borderRadius: 22,
          padding: 10,
          gap: 4,
          alignSelf: "flex-start",
        }}
        onKeyDown={handleKeyDown}
      >
        <div
          className="row"
          style={{ padding: "0 12px", height: 52, gap: 10 }}
        >
          <Icon glyph="search" size={18} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="palette-listbox"
            aria-activedescendant={visibleItems[safeIndex]?.id}
            className="grow"
            style={{
              border: 0,
              outline: "none",
              background: "transparent",
              fontSize: 16,
              color: "var(--ink)",
            }}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search or run a command"
            aria-label="Search or run a command"
          />
          <button
            type="button"
            className="kbd"
            onClick={handleEscape}
            style={{ cursor: "pointer" }}
            aria-label={query ? "Clear search" : "Close command palette"}
          >
            esc
          </button>
        </div>

        <hr className="hr" />

        <div
          id="palette-listbox"
          role="listbox"
          aria-label="Search results"
          className="col"
          style={{ gap: 4 }}
        >
          {files.length > 0 ? (
            <>
              <span className="navlabel">Files</span>
              {files.map((item, i) => {
                const idx = i
                const selected = idx === safeIndex
                return (
                  <Link
                    key={item.id}
                    id={item.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el
                    }}
                    href={resolveBoardHref(item.href)}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`row${selected ? " sel" : ""}`}
                    style={{
                      gap: 12,
                      padding: "0 12px",
                      height: 44,
                      borderRadius: 10,
                    }}
                  >
                    <Icon glyph={item.icon} size={16} />
                    <span className="grow sm m ell">
                      {item.label}
                      {item.meta ? (
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {item.meta}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </>
          ) : null}

          {commands.length > 0 ? (
            <>
              <span className="navlabel">Commands</span>
              {commands.map((item, i) => {
                const idx = commandOffset + i
                const selected = idx === safeIndex
                return (
                  <Link
                    key={item.id}
                    id={item.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el
                    }}
                    href={resolveBoardHref(item.href)}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`row${selected ? " sel" : ""}`}
                    style={{
                      gap: 12,
                      padding: "0 12px",
                      height: 44,
                      borderRadius: 10,
                    }}
                  >
                    <Icon glyph={item.icon} size={16} />
                    <span className="grow sm m ell">{item.label}</span>
                    {item.shortcut ? (
                      <span className="kbd">{item.shortcut}</span>
                    ) : null}
                  </Link>
                )
              })}
            </>
          ) : null}

          {files.length === 0 && commands.length === 0 && normalizedQuery ? (
            <div className="sm muted" style={{ padding: "10px 12px 4px" }}>
              No matching files or commands for “{query.trim()}”.
            </div>
          ) : null}

          <span className="navlabel">AI</span>
          <Link
            key={aiItem.id}
            id={aiItem.id}
            ref={(el) => {
              itemRefs.current[aiIndex] = el
            }}
            href={aiItem.href}
            role="option"
            aria-selected={aiIndex === safeIndex}
            onMouseEnter={() => setActiveIndex(aiIndex)}
            className={`row${aiIndex === safeIndex ? " sel" : ""}`}
            style={{
              gap: 12,
              padding: "0 12px",
              height: 44,
              borderRadius: 10,
            }}
          >
            <Icon glyph={aiItem.icon} size={16} />
            <span className="grow sm m ell">{aiItem.label}</span>
            {aiItem.shortcut ? (
              <span className="kbd">{aiItem.shortcut}</span>
            ) : null}
          </Link>
        </div>
      </div>
    </div>
  )
}
