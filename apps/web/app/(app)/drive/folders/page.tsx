"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Button,
  Chip,
  Field,
  FileTile,
  Icon,
  PageHead,
  Seg,
  Sidebar,
  Switch,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

type DriveItem = {
  id: string
  name: string
  folder?: boolean
  count?: number
  ext: string
  tone: 0 | 1 | 2
  vis: string
  visTone: "clear" | "neutral" | "accent"
  mod: string
  size?: string
  flag?: string
}

type MenuEntry =
  | {
      kind: "sep"
      id: string
    }
  | {
      kind: "link"
      id: string
      label: string
      icon: string
      href: string
      kbd?: string
    }
  | {
      kind: "btn"
      id: string
      label: string
      icon: string
      kbd?: string
      danger?: boolean
      onSelect: () => void
    }

type MenuState = {
  x: number
  y: number
  kind: "item" | "bg"
} | null

type ToastState = {
  msg: string
  undo?: () => void
} | null

const BASE_ITEMS: DriveItem[] = [
  {
    id: "notes",
    name: "Research notes",
    folder: true,
    count: 12,
    ext: "DIR",
    tone: 0,
    vis: "Private",
    visTone: "clear",
    mod: "Nov 12",
  },
  {
    id: "sources",
    name: "Sources",
    folder: true,
    count: 8,
    ext: "DIR",
    tone: 1,
    vis: "Shared",
    visTone: "neutral",
    mod: "Oct 30",
  },
  {
    id: "draft",
    name: "thesis-draft-v4.docx",
    ext: "DOC",
    tone: 0,
    vis: "Private",
    visTone: "clear",
    mod: "Nov 12",
    size: "640 KB",
  },
  {
    id: "fig",
    name: "figure-3-results.png",
    ext: "PNG",
    tone: 1,
    vis: "Shared",
    visTone: "neutral",
    mod: "Nov 11",
    size: "412 KB",
  },
  {
    id: "survey",
    name: "survey-data.csv",
    ext: "CSV",
    tone: 2,
    vis: "Public",
    visTone: "accent",
    mod: "Nov 4",
    size: "82 KB",
    flag: "Email addresses found",
  },
  {
    id: "refs",
    name: "references.pdf",
    ext: "PDF",
    tone: 0,
    vis: "Private",
    visTone: "clear",
    mod: "Oct 21",
    size: "2.4 MB",
  },
  {
    id: "slides",
    name: "defense-slides.pdf",
    ext: "PDF",
    tone: 0,
    vis: "Private",
    visTone: "clear",
    mod: "Oct 15",
    size: "6.1 MB",
  },
  {
    id: "audio",
    name: "interview-01.m4a",
    ext: "M4A",
    tone: 0,
    vis: "Private",
    visTone: "clear",
    mod: "Oct 8",
    size: "18 MB",
  },
]

const SHORTCUT_ROWS: Array<{ label: string; key: string }> = [
  { label: "Move selection", key: "↑ ↓" },
  { label: "Extend selection", key: "⇧ ↑ ↓" },
  { label: "Select all", key: "⌘A" },
  { label: "Share", key: "S" },
  { label: "Move to folder", key: "M" },
  { label: "Move to trash", key: "⌫" },
  { label: "New folder", key: "N" },
  { label: "List or grid", key: "V" },
  { label: "Search and commands", key: "⌘K" },
  { label: "This sheet", key: "?" },
  { label: "Close or clear", key: "esc" },
]

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  )
}

function hasTextSelectionOutsideItems(target: EventTarget | null): boolean {
  if (typeof window === "undefined") return false
  if (target instanceof Element && target.closest(".item")) return false
  const text = window.getSelection()?.toString() ?? ""
  return text.trim().length > 0
}

export default function FolderPage() {
  const router = useRouter()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const moveDialogRef = React.useRef<HTMLDivElement | null>(null)
  const shareDialogRef = React.useRef<HTMLDivElement | null>(null)
  const keysDialogRef = React.useRef<HTMLDivElement | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const newFolderInputId = React.useId()

  const [view, setView] = React.useState<"list" | "grid">("list")
  const [selected, setSelected] = React.useState<string[]>([])
  const [anchorId, setAnchorId] = React.useState<string | null>(null)
  const [menu, setMenu] = React.useState<MenuState>(null)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [shareExpiry, setShareExpiry] = React.useState("7 days")
  const [sharePin, setSharePin] = React.useState(true)
  const [newFolderOpen, setNewFolderOpen] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState("")
  const [moveOpen, setMoveOpen] = React.useState(false)
  const [keysOpen, setKeysOpen] = React.useState(false)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)
  const [extOpen, setExtOpen] = React.useState(false)
  const [moved, setMoved] = React.useState<Record<string, string>>({})
  const [trashed, setTrashed] = React.useState<string[]>([])
  const [customFolders, setCustomFolders] = React.useState<
    Array<{ id: string; name: string }>
  >([])
  const [search, setSearch] = React.useState("")
  const [toast, setToast] = React.useState<ToastState>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const say = React.useCallback((msg: string, undo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, undo })
    timerRef.current = setTimeout(() => {
      setToast(null)
    }, 5000)
  }, [])

  const allItems = React.useMemo<DriveItem[]>(() => {
    const next = [...BASE_ITEMS]
    const created: DriveItem[] = customFolders.map((f) => ({
      id: f.id,
      name: f.name,
      folder: true,
      count: 0,
      ext: "DIR",
      tone: 0,
      vis: "Private",
      visTone: "clear",
      mod: "Just now",
    }))
    next.splice(2, 0, ...created)
    return next
  }, [customFolders])

  const visibleItems = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return allItems.filter((x) => {
      if (moved[x.id] || trashed.includes(x.id)) return false
      if (query) {
        const hay = `${x.name} ${x.flag ?? ""} ${x.vis}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })
  }, [allItems, moved, trashed, search])

  const folderCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [itemId, targetId] of Object.entries(moved)) {
      if (!trashed.includes(itemId)) {
        counts[targetId] = (counts[targetId] ?? 0) + 1
      }
    }
    return counts
  }, [moved, trashed])

  const selectedItems = React.useMemo(
    () => visibleItems.filter((x) => selected.includes(x.id)),
    [visibleItems, selected]
  )

  const moveTargetFolders = React.useMemo(
    () =>
      visibleItems.filter(
        (x) => x.folder === true && !selected.includes(x.id)
      ),
    [visibleItems, selected]
  )

  const computeMenuPoint = React.useCallback(
    (clientX: number, clientY: number, offsetX = 0, offsetY = 0) => {
      const root = rootRef.current
      if (!root) return { x: 8, y: 8 }
      const rect = root.getBoundingClientRect()
      const scale = rect.width / (root.offsetWidth || 1) || 1
      const rawX = (clientX - rect.left) / scale + offsetX
      const rawY = (clientY - rect.top) / scale + offsetY
      const maxX = Math.max(8, root.offsetWidth - 264)
      const maxY = Math.max(8, root.offsetHeight - 360)
      return {
        x: Math.round(Math.max(8, Math.min(rawX, maxX))),
        y: Math.round(Math.max(8, Math.min(rawY, maxY))),
      }
    },
    []
  )

  const closeAllOverlays = React.useCallback(() => {
    setMenu(null)
    setShareOpen(false)
    setNewFolderOpen(false)
    setMoveOpen(false)
    setKeysOpen(false)
  }, [])

  const openNewFolderModal = React.useCallback(() => {
    setMenu(null)
    setNewFolderName("")
    setNewFolderOpen(true)
  }, [])

  const openShareModal = React.useCallback(() => {
    setMenu(null)
    setShareOpen(true)
  }, [])

  const openMoveModal = React.useCallback(() => {
    setMenu(null)
    setMoveOpen(true)
  }, [])

  const trashItems = React.useCallback(
    (idsToTrash?: string[]) => {
      const ids = idsToTrash ?? selected
      if (ids.length === 0) return
      const prev = trashed
      setTrashed((cur) => [...cur, ...ids.filter((id) => !cur.includes(id))])
      setSelected([])
      setMenu(null)
      say(
        `${ids.length} ${ids.length === 1 ? "item" : "items"} moved to trash`,
        () => {
          setTrashed(prev)
          setToast(null)
        }
      )
    },
    [selected, trashed, say]
  )

  const moveItemsTo = React.useCallback(
    (sourceIds: string[], targetId: string) => {
      const ids = sourceIds.filter((id) => id && id !== targetId)
      if (ids.length === 0) return
      const targetFolder = allItems.find((x) => x.id === targetId)
      if (!targetFolder) return
      const prev = moved
      const next = { ...prev }
      for (const id of ids) {
        next[id] = targetId
      }
      setMoved(next)
      setSelected([])
      setDragId(null)
      setOverId(null)
      setMoveOpen(false)
      say(
        `Moved ${ids.length} ${ids.length === 1 ? "item" : "items"} to ${targetFolder.name}`,
        () => {
          setMoved(prev)
          setToast(null)
        }
      )
    },
    [allItems, moved, say]
  )

  const handleCreateFolder = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = newFolderName.trim()
      const baseTitle = trimmed || "Untitled folder"
      const existingNames = new Set(allItems.map((x) => x.name.toLowerCase()))
      let finalName = baseTitle
      let suffix = 2
      while (existingNames.has(finalName.toLowerCase())) {
        finalName = `${baseTitle} ${suffix}`
        suffix += 1
      }
      const newId = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const prevFolders = customFolders
      setCustomFolders((prev) => [...prev, { id: newId, name: finalName }])
      setNewFolderOpen(false)
      setNewFolderName("")
      setSelected([newId])
      setAnchorId(newId)
      say(`Created folder "${finalName}"`, () => {
        setCustomFolders(prevFolders)
        setSelected((cur) => cur.filter((id) => id !== newId))
        setToast(null)
      })
    },
    [newFolderName, allItems, customFolders, say]
  )

  const handleItemClick = React.useCallback(
    (e: React.MouseEvent, item: DriveItem) => {
      e.stopPropagation()
      setMenu(null)
      if (e.metaKey || e.ctrlKey) {
        setSelected((prev) =>
          prev.includes(item.id)
            ? prev.filter((id) => id !== item.id)
            : [...prev, item.id]
        )
        setAnchorId(item.id)
        return
      }
      if (e.shiftKey) {
        const ids = visibleItems.map((x) => x.id)
        const targetIdx = ids.indexOf(item.id)
        const anchorIdx = anchorId ? ids.indexOf(anchorId) : -1
        if (targetIdx >= 0 && anchorIdx >= 0) {
          const start = Math.min(anchorIdx, targetIdx)
          const end = Math.max(anchorIdx, targetIdx)
          setSelected(ids.slice(start, end + 1))
        } else {
          setSelected((prev) =>
            prev.includes(item.id) ? prev : [...prev, item.id]
          )
          setAnchorId(item.id)
        }
        return
      }
      setSelected([item.id])
      setAnchorId(item.id)
    },
    [visibleItems, anchorId]
  )

  // Focus first menu item whenever context menu opens
  React.useEffect(() => {
    if (!menu) return
    const frame = requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector<HTMLElement>(
        '[role="menuitem"]'
      )
      first?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [menu])

  // Focus folder name input when New Folder dialog opens
  React.useEffect(() => {
    if (!newFolderOpen) return
    const frame = requestAnimationFrame(() => {
      const input = document.getElementById(
        newFolderInputId
      ) as HTMLInputElement | null
      input?.focus()
      input?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [newFolderOpen, newFolderInputId])

  // Focus dialog containers when modal opens without an input field
  React.useEffect(() => {
    if (!moveOpen) return
    const frame = requestAnimationFrame(() => moveDialogRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [moveOpen])

  React.useEffect(() => {
    if (!shareOpen) return
    const frame = requestAnimationFrame(() => shareDialogRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [shareOpen])

  React.useEffect(() => {
    if (!keysOpen) return
    const frame = requestAnimationFrame(() => keysDialogRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [keysOpen])

  // Global keyboard shortcuts
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key
      if (key === "Escape") {
        if (menu || shareOpen || newFolderOpen || moveOpen || keysOpen) {
          e.preventDefault()
          closeAllOverlays()
        } else if (selected.length > 0) {
          setSelected([])
        }
        return
      }

      if (isEditableTarget(e.target)) return

      if (key === "?") {
        e.preventDefault()
        setMenu(null)
        setKeysOpen((cur) => !cur)
        return
      }

      if (shareOpen || newFolderOpen || moveOpen || keysOpen || menu) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && key.toLowerCase() === "a") {
        e.preventDefault()
        setSelected(visibleItems.map((x) => x.id))
        return
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (key === "v" || key === "V") {
        e.preventDefault()
        setView((cur) => (cur === "list" ? "grid" : "list"))
        return
      }

      if (key === "n" || key === "N") {
        e.preventDefault()
        openNewFolderModal()
        return
      }

      if ((key === "s" || key === "S") && selected.length > 0) {
        e.preventDefault()
        openShareModal()
        return
      }

      if ((key === "m" || key === "M") && selected.length > 0) {
        e.preventDefault()
        openMoveModal()
        return
      }

      if ((key === "Delete" || key === "Backspace") && selected.length > 0) {
        e.preventDefault()
        trashItems()
        return
      }

      if (
        key === "Enter" &&
        selected.length === 1 &&
        !(
          e.target instanceof Element &&
          e.target.closest("button, a, input, textarea, select")
        )
      ) {
        const single = visibleItems.find((x) => x.id === selected[0])
        if (single && !single.folder) {
          e.preventDefault()
          router.push(resolveBoardHref("Viewer.dc.html"))
        } else if (single?.folder) {
          e.preventDefault()
          say(`Opened folder "${single.name}"`)
        }
        return
      }

      if (
        key === "ArrowDown" ||
        key === "ArrowUp" ||
        key === "ArrowRight" ||
        key === "ArrowLeft"
      ) {
        const ids = visibleItems.map((x) => x.id)
        if (ids.length === 0) return
        e.preventDefault()
        const lastId = selected[selected.length - 1]
        const curIdx = lastId ? ids.indexOf(lastId) : -1
        const delta = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1
        const nextIdx =
          curIdx < 0
            ? 0
            : Math.max(0, Math.min(ids.length - 1, curIdx + delta))
        const nextId = ids[nextIdx]
        if (!nextId) return
        setSelected((prev) =>
          e.shiftKey
            ? [...prev.filter((id) => id !== nextId), nextId]
            : [nextId]
        )
        setAnchorId(nextId)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    menu,
    shareOpen,
    newFolderOpen,
    moveOpen,
    keysOpen,
    selected,
    visibleItems,
    closeAllOverlays,
    openNewFolderModal,
    openShareModal,
    openMoveModal,
    trashItems,
    router,
    say,
  ])

  const menuEntries = React.useMemo<MenuEntry[]>(() => {
    if (!menu) return []
    if (menu.kind === "item") {
      return [
        {
          kind: "link",
          id: "open",
          label: "Open",
          icon: "eye",
          href: resolveBoardHref("Viewer.dc.html"),
          kbd: "↵",
        },
        {
          kind: "btn",
          id: "share",
          label: "Share…",
          icon: "share",
          kbd: "S",
          onSelect: openShareModal,
        },
        {
          kind: "btn",
          id: "copy",
          label: "Copy link",
          icon: "link",
          onSelect: () => {
            setMenu(null)
            say("Link copied")
          },
        },
        { kind: "sep", id: "sep1" },
        {
          kind: "btn",
          id: "download",
          label: "Download",
          icon: "download",
          onSelect: () => {
            setMenu(null)
            say("Download started")
          },
        },
        {
          kind: "btn",
          id: "move",
          label: "Move to…",
          icon: "folder",
          kbd: "M",
          onSelect: openMoveModal,
        },
        {
          kind: "link",
          id: "scan",
          label: "Scan report",
          icon: "shield",
          href: resolveBoardHref("Scan.dc.html"),
        },
        { kind: "sep", id: "sep2" },
        {
          kind: "btn",
          id: "trash",
          label: "Move to trash",
          icon: "trash",
          kbd: "⌫",
          danger: true,
          onSelect: () => trashItems(),
        },
      ]
    }
    return [
      {
        kind: "btn",
        id: "new-folder",
        label: "New folder",
        icon: "folder",
        kbd: "N",
        onSelect: openNewFolderModal,
      },
      {
        kind: "link",
        id: "upload",
        label: "Upload files",
        icon: "upload",
        href: resolveBoardHref("Upload.dc.html"),
      },
      { kind: "sep", id: "sep-bg-1" },
      {
        kind: "btn",
        id: "view-toggle",
        label: view === "list" ? "View as grid" : "View as list",
        icon: view === "list" ? "grid" : "list",
        kbd: "V",
        onSelect: () => {
          setView((cur) => (cur === "list" ? "grid" : "list"))
          setMenu(null)
        },
      },
      {
        kind: "btn",
        id: "select-all",
        label: "Select all",
        icon: "check",
        kbd: "⌘A",
        onSelect: () => {
          setSelected(visibleItems.map((x) => x.id))
          setMenu(null)
        },
      },
      { kind: "sep", id: "sep-bg-2" },
      {
        kind: "btn",
        id: "shortcuts",
        label: "Keyboard shortcuts",
        icon: "info",
        kbd: "?",
        onSelect: () => {
          setMenu(null)
          setKeysOpen(true)
        },
      },
    ]
  }, [
    menu,
    view,
    visibleItems,
    openShareModal,
    openMoveModal,
    openNewFolderModal,
    trashItems,
    say,
  ])

  const handleMenuKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const container = menuRef.current
      if (!container) return
      const items = Array.from(
        container.querySelectorAll<HTMLElement>('[role="menuitem"]')
      )
      if (items.length === 0) return
      const activeIdx = items.findIndex((el) => el === document.activeElement)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        e.stopPropagation()
        const next = items[(activeIdx + 1) % items.length]
        next?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        e.stopPropagation()
        const prev = items[(activeIdx - 1 + items.length) % items.length]
        prev?.focus()
      } else if (e.key === "Home") {
        e.preventDefault()
        e.stopPropagation()
        items[0]?.focus()
      } else if (e.key === "End") {
        e.preventDefault()
        e.stopPropagation()
        items[items.length - 1]?.focus()
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        setMenu(null)
      } else if (e.key === "Tab") {
        setMenu(null)
      }
    },
    []
  )

  const singleSelected = selectedItems[0]
  const shareTitleName =
    selectedItems.length === 1 && singleSelected
      ? singleSelected.name
      : `${selectedItems.length} items`
  const shareHasFlag = selectedItems.some((x) => Boolean(x.flag))

  return (
    <div
      ref={rootRef}
      className="app"
      style={{ minHeight: 900, position: "relative", outline: "none" }}
      onClick={(e) => {
        const target = e.target
        if (
          target instanceof Element &&
          (target.classList.contains("main") || target.classList.contains("app"))
        ) {
          setMenu(null)
          setSelected([])
        } else if (menu) {
          setMenu(null)
        }
      }}
      onContextMenu={(e) => {
        if (e.shiftKey) return
        if (isEditableTarget(e.target)) return
        if (
          e.target instanceof Element &&
          e.target.closest(
            "a, nav[aria-label='Primary'], .scrim, .menu, .toast, button"
          )
        ) {
          return
        }
        if (hasTextSelectionOutsideItems(e.target)) return
        e.preventDefault()
        const point = computeMenuPoint(e.clientX, e.clientY)
        setMenu({ x: point.x, y: point.y, kind: "bg" })
      }}
      onDragOver={(e) => {
        const types = e.dataTransfer?.types
        if (types && Array.from(types).includes("Files")) {
          e.preventDefault()
          if (!extOpen) setExtOpen(true)
        }
      }}
      onDragLeave={(e) => {
        if (
          extOpen &&
          !e.currentTarget.contains(e.relatedTarget as Node | null)
        ) {
          setExtOpen(false)
        }
      }}
      onDrop={(e) => {
        if (extOpen) {
          e.preventDefault()
          const count = e.dataTransfer?.files?.length || 1
          setExtOpen(false)
          say(
            `${count} ${count === 1 ? "file" : "files"} sent to quarantine for scanning`
          )
        }
      }}
    >
      <Sidebar active="folders" />

      <main className="main">
        <PageHead
          title="Thesis"
          sub="Projects / Thesis"
          cta="Upload"
          ctaIcon="upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="row wrap between">
          <nav className="row sm" style={{ gap: 6 }} aria-label="Breadcrumb">
            <Link href={resolveBoardHref("Main.dc.html")} className="muted">
              Drive
            </Link>
            <Icon glyph="chevR" size={14} />
            <Link href={resolveBoardHref("Folder.dc.html")} className="muted">
              Projects
            </Link>
            <Icon glyph="chevR" size={14} />
            <span className="m">Thesis</span>
          </nav>

          <div className="row wrap" style={{ gap: 10 }}>
            <span className="xs muted">
              Right-click a file · drag onto a folder · press{" "}
              <span className="kbd">?</span>
            </span>
            <div className="seg" role="group" aria-label="View">
              <button
                type="button"
                className={view === "list" ? "on" : undefined}
                aria-pressed={view === "list"}
                aria-label="List view"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setView("list")
                }}
              >
                <Icon glyph="list" size={14} />
                List
              </button>
              <button
                type="button"
                className={view === "grid" ? "on" : undefined}
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setView("grid")
                }}
              >
                <Icon glyph="grid" size={14} />
                Grid
              </button>
            </div>
            <Button
              label="New folder"
              variant="secondary"
              size="md"
              icon="plus"
              onClick={openNewFolderModal}
            />
          </div>
        </div>

        {view === "list" && visibleItems.length > 0 ? (
          <div
            className="glass"
            style={{ overflowX: "auto", borderRadius: 20 }}
          >
            <div style={{ minWidth: 720 }}>
              <div
                className="thead"
                style={{
                  gridTemplateColumns: "2.6fr 1.2fr 1fr 0.8fr 40px",
                }}
              >
                <span>Name</span>
                <span>Visibility</span>
                <span>Modified</span>
                <span>Size</span>
                <span />
              </div>

              {visibleItems.map((it) => {
                const isSelected = selected.includes(it.id)
                const isDragging =
                  Boolean(dragId) &&
                  (dragId === it.id ||
                    (isSelected && Boolean(dragId && selected.includes(dragId))))
                const isOver = overId === it.id
                const count = (it.count ?? 0) + (folderCounts[it.id] ?? 0)
                const subText = it.folder
                  ? `${count} ${count === 1 ? "item" : "items"}`
                  : (it.flag ?? it.size ?? "")

                return (
                  <div
                    key={it.id}
                    className={[
                      "trow item",
                      isSelected ? "on" : "",
                      isOver ? "over" : "",
                      isDragging ? "drag" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    draggable
                    aria-selected={isSelected}
                    style={{
                      gridTemplateColumns: "2.6fr 1.2fr 1fr 0.8fr 40px",
                    }}
                    onClick={(e) => handleItemClick(e, it)}
                    onContextMenu={(e) => {
                      if (e.shiftKey) return
                      if (isEditableTarget(e.target)) return
                      e.preventDefault()
                      e.stopPropagation()
                      const point = computeMenuPoint(e.clientX, e.clientY)
                      if (!isSelected) {
                        setSelected([it.id])
                        setAnchorId(it.id)
                      }
                      setMenu({ x: point.x, y: point.y, kind: "item" })
                    }}
                    onDragStart={(e) => {
                      try {
                        e.dataTransfer.setData("text/plain", it.id)
                        e.dataTransfer.effectAllowed = "move"
                      } catch {
                        // Ignore restricted dataTransfer environments
                      }
                      setTimeout(() => {
                        setDragId(it.id)
                        setMenu(null)
                      }, 0)
                    }}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverId(null)
                    }}
                    onDragOver={(e) => {
                      if (
                        it.folder &&
                        dragId &&
                        dragId !== it.id &&
                        !selected.includes(it.id)
                      ) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (overId !== it.id) setOverId(it.id)
                      }
                    }}
                    onDragLeave={(e) => {
                      if (
                        overId === it.id &&
                        !e.currentTarget.contains(
                          e.relatedTarget as Node | null
                        )
                      ) {
                        setOverId(null)
                      }
                    }}
                    onDrop={(e) => {
                      if (it.folder && dragId) {
                        e.preventDefault()
                        e.stopPropagation()
                        const sourceIds = selected.includes(dragId)
                          ? selected
                          : [dragId]
                        moveItemsTo(sourceIds, it.id)
                      }
                    }}
                  >
                    <div className="row" style={{ minWidth: 0 }}>
                      <FileTile ext={it.ext} tone={it.tone} size={36} />
                      <div className="col" style={{ gap: 1, minWidth: 0 }}>
                        <span className="ell m">{it.name}</span>
                        <span className="xs muted ell">{subText}</span>
                      </div>
                    </div>
                    <div>
                      <Chip label={it.vis} tone={it.visTone} />
                    </div>
                    <span className="sm muted">{it.mod}</span>
                    <span className="sm muted">
                      {it.folder ? "—" : (it.size ?? "—")}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon"
                      aria-label={`More actions for ${it.name}`}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const point = computeMenuPoint(
                          rect.right,
                          rect.bottom,
                          -248,
                          6
                        )
                        setSelected([it.id])
                        setAnchorId(it.id)
                        setMenu({ x: point.x, y: point.y, kind: "item" })
                      }}
                    >
                      <Icon glyph="more" size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {view === "grid" && visibleItems.length > 0 ? (
          <div
            className="glass"
            style={{
              borderRadius: 20,
              padding: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
              gap: 8,
            }}
          >
            {visibleItems.map((it) => {
              const isSelected = selected.includes(it.id)
              const isDragging =
                Boolean(dragId) &&
                (dragId === it.id ||
                  (isSelected && Boolean(dragId && selected.includes(dragId))))
              const isOver = overId === it.id
              const count = (it.count ?? 0) + (folderCounts[it.id] ?? 0)
              const subText = it.folder
                ? `${count} ${count === 1 ? "item" : "items"}`
                : (it.flag ?? it.size ?? "")

              return (
                <div
                  key={it.id}
                  className={[
                    "gcard item",
                    isSelected ? "on" : "",
                    isOver ? "over" : "",
                    isDragging ? "drag" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  draggable
                  aria-selected={isSelected}
                  onClick={(e) => handleItemClick(e, it)}
                  onContextMenu={(e) => {
                    if (e.shiftKey) return
                    if (isEditableTarget(e.target)) return
                    e.preventDefault()
                    e.stopPropagation()
                    const point = computeMenuPoint(e.clientX, e.clientY)
                    if (!isSelected) {
                      setSelected([it.id])
                      setAnchorId(it.id)
                    }
                    setMenu({ x: point.x, y: point.y, kind: "item" })
                  }}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setData("text/plain", it.id)
                      e.dataTransfer.effectAllowed = "move"
                    } catch {
                      // Ignore restricted dataTransfer environments
                    }
                    setTimeout(() => {
                      setDragId(it.id)
                      setMenu(null)
                    }, 0)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverId(null)
                  }}
                  onDragOver={(e) => {
                    if (
                      it.folder &&
                      dragId &&
                      dragId !== it.id &&
                      !selected.includes(it.id)
                    ) {
                      e.preventDefault()
                      e.stopPropagation()
                      if (overId !== it.id) setOverId(it.id)
                    }
                  }}
                  onDragLeave={(e) => {
                    if (
                      overId === it.id &&
                      !e.currentTarget.contains(
                        e.relatedTarget as Node | null
                      )
                    ) {
                      setOverId(null)
                    }
                  }}
                  onDrop={(e) => {
                    if (it.folder && dragId) {
                      e.preventDefault()
                      e.stopPropagation()
                      const sourceIds = selected.includes(dragId)
                        ? selected
                        : [dragId]
                      moveItemsTo(sourceIds, it.id)
                    }
                  }}
                >
                  <FileTile ext={it.ext} tone={it.tone} size={64} />
                  <span className="sm m ell" style={{ maxWidth: "100%" }}>
                    {it.name}
                  </span>
                  <span className="xs muted ell" style={{ maxWidth: "100%" }}>
                    {subText}
                  </span>
                  <Chip label={it.vis} tone={it.visTone} />
                </div>
              )
            })}
          </div>
        ) : null}

        {visibleItems.length === 0 ? (
          <div className="glass col center muted" style={{ borderRadius: 20, padding: 40 }}>
            {search.trim()
              ? "No files or folders match your search."
              : "This folder is empty. Drop files here."}
          </div>
        ) : null}

        {selectedItems.length > 0 ? (
          <div
            className="glass row wrap pop"
            style={{
              position: "sticky",
              bottom: 16,
              alignSelf: "center",
              gap: 10,
              padding: "8px 8px 8px 18px",
              borderRadius: 14,
              transformOrigin: "bottom center",
            }}
          >
            <span className="sm m">{selectedItems.length} selected</span>
            <Button
              label="Share"
              variant="primary"
              size="sm"
              icon="share"
              onClick={openShareModal}
            />
            <Button
              label="Move to"
              variant="secondary"
              size="sm"
              icon="folder"
              onClick={openMoveModal}
            />
            <Button
              label="Download"
              variant="secondary"
              size="sm"
              icon="download"
              onClick={() => say("Download started")}
            />
            <Button
              label="Move to trash"
              variant="danger"
              size="sm"
              icon="trash"
              onClick={() => trashItems()}
            />
          </div>
        ) : null}
      </main>

      {menu ? (
        <div
          ref={menuRef}
          className="menu pop"
          role="menu"
          aria-label={menu.kind === "item" ? "Item actions" : "Folder actions"}
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleMenuKeyDown}
        >
          {menuEntries.map((entry) => {
            if (entry.kind === "sep") {
              return (
                <hr
                  key={entry.id}
                  className="hr"
                  style={{ margin: "4px 6px" }}
                />
              )
            }
            if (entry.kind === "link") {
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  className="mi"
                  role="menuitem"
                  onClick={() => setMenu(null)}
                >
                  <Icon glyph={entry.icon} size={16} />
                  <span className="grow">{entry.label}</span>
                  {entry.kbd ? <span className="kbd">{entry.kbd}</span> : null}
                </Link>
              )
            }
            return (
              <button
                key={entry.id}
                type="button"
                className={entry.danger ? "mi dg" : "mi"}
                role="menuitem"
                onClick={entry.onSelect}
              >
                <Icon glyph={entry.icon} size={16} />
                <span className="grow">{entry.label}</span>
                {entry.kbd ? <span className="kbd">{entry.kbd}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {newFolderOpen ? (
        <div className="scrim" onClick={closeAllOverlays}>
          <form
            className="glass modal col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-folder-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateFolder}
            style={{
              width: 420,
              maxWidth: "100%",
              borderRadius: 24,
              padding: 24,
              gap: 18,
              background: "rgba(255,255,255,0.82)",
            }}
          >
            <div className="row between">
              <div className="col" style={{ gap: 2 }}>
                <h2 id="new-folder-title" className="h2">
                  New folder
                </h2>
                <span className="sm muted">Inside Projects / Thesis</span>
              </div>
              <Button
                label="Close"
                variant="ghost"
                size="md"
                icon="x"
                iconOnly
                onClick={closeAllOverlays}
              />
            </div>

            <Field
              id={newFolderInputId}
              label="Folder name"
              placeholder="Untitled folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              note="Inherits Private visibility and folder AI consent."
            />

            <div className="row between">
              <span className="xs muted">
                Press <span className="kbd">esc</span> to cancel
              </span>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  size="md"
                  onClick={closeAllOverlays}
                />
                <Button
                  type="submit"
                  label="Create folder"
                  variant="primary"
                  size="md"
                  icon="plus"
                />
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {moveOpen && selectedItems.length > 0 ? (
        <div className="scrim" onClick={closeAllOverlays}>
          <div
            ref={moveDialogRef}
            tabIndex={-1}
            className="glass modal col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 440,
              maxWidth: "100%",
              borderRadius: 24,
              padding: 24,
              gap: 16,
              background: "rgba(255,255,255,0.82)",
              outline: "none",
            }}
          >
            <div className="row between">
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <h2 id="move-dialog-title" className="h2 ell">
                  Move {shareTitleName}
                </h2>
                <span className="sm muted">
                  Choose a destination folder in Thesis
                </span>
              </div>
              <Button
                label="Close"
                variant="ghost"
                size="md"
                icon="x"
                iconOnly
                onClick={closeAllOverlays}
              />
            </div>

            {moveTargetFolders.length > 0 ? (
              <div className="col" style={{ gap: 6 }}>
                {moveTargetFolders.map((folder) => {
                  const count =
                    (folder.count ?? 0) + (folderCounts[folder.id] ?? 0)
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      className="glass-soft row between"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 14,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onClick={() => moveItemsTo(selected, folder.id)}
                    >
                      <span className="row" style={{ gap: 10 }}>
                        <Icon glyph="folder" size={16} />
                        <span className="sm m">{folder.name}</span>
                      </span>
                      <span className="xs muted">
                        {count} {count === 1 ? "item" : "items"}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div
                className="glass-soft sm muted"
                style={{ borderRadius: 14, padding: "14px 16px" }}
              >
                No other folders available here. Create a new folder first.
              </div>
            )}

            <div className="row between">
              <Button
                label="New folder"
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={() => {
                  setMoveOpen(false)
                  openNewFolderModal()
                }}
              />
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onClick={closeAllOverlays}
              />
            </div>
          </div>
        </div>
      ) : null}

      {shareOpen && selectedItems.length > 0 ? (
        <div className="scrim" onClick={closeAllOverlays}>
          <div
            ref={shareDialogRef}
            tabIndex={-1}
            className="glass modal col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480,
              maxWidth: "100%",
              borderRadius: 24,
              padding: 24,
              gap: 18,
              background: "rgba(255,255,255,0.78)",
              outline: "none",
            }}
          >
            <div className="row between">
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <h2 id="share-dialog-title" className="h2 ell">
                  Share {shareTitleName}
                </h2>
                <span className="sm muted">Checked before the link exists</span>
              </div>
              <Button
                label="Close"
                variant="ghost"
                size="md"
                icon="x"
                iconOnly
                onClick={closeAllOverlays}
              />
            </div>

            {shareHasFlag ? (
              <div
                className="glass-soft row"
                style={{ borderRadius: 14, padding: "12px 14px", gap: 10 }}
              >
                <span
                  className="tile"
                  style={{ width: 28, height: 28, borderRadius: 8 }}
                >
                  <Icon glyph="warn" size={16} />
                </span>
                <span className="sm">
                  <span className="b">Email addresses found.</span> A redacted
                  copy will be shared.
                </span>
              </div>
            ) : null}

            <div className="col" style={{ gap: 8 }}>
              <span className="sm b">Link expires</span>
              <Seg
                options="1 day|7 days|30 days|Never"
                value={shareExpiry}
                onChange={setShareExpiry}
                aria-label="Link expires"
              />
            </div>

            <Switch
              label="Require a PIN"
              sub="Recipient enters 4 digits to open"
              on={sharePin}
              onChange={setSharePin}
            />

            <div className="row between">
              <Link
                href={resolveBoardHref("Share.dc.html")}
                className="sm muted"
              >
                More options
              </Link>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  size="md"
                  onClick={closeAllOverlays}
                />
                <Button
                  label="Create link"
                  variant="primary"
                  size="md"
                  icon="link"
                  onClick={() => {
                    setShareOpen(false)
                    const expiryMsg =
                      shareExpiry === "Never"
                        ? "Link created. Does not expire."
                        : `Link created. Ends in ${shareExpiry}.`
                    say(expiryMsg, () => setToast(null))
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {keysOpen ? (
        <div className="scrim" onClick={closeAllOverlays}>
          <div
            ref={keysDialogRef}
            tabIndex={-1}
            className="glass modal col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxWidth: "100%",
              borderRadius: 24,
              padding: 24,
              gap: 14,
              background: "rgba(255,255,255,0.78)",
              outline: "none",
            }}
          >
            <div className="row between">
              <h2 id="shortcuts-dialog-title" className="h2">
                Keyboard shortcuts
              </h2>
              <div className="row" style={{ gap: 8 }}>
                <span className="kbd">esc</span>
                <Button
                  label="Close"
                  variant="ghost"
                  size="sm"
                  icon="x"
                  iconOnly
                  onClick={closeAllOverlays}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px 28px",
              }}
            >
              {SHORTCUT_ROWS.map((row) => (
                <div key={row.label} className="row between sm">
                  <span>{row.label}</span>
                  <span className="kbd">{row.key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {extOpen ? (
        <div
          style={{
            position: "absolute",
            inset: 12,
            zIndex: 25,
            pointerEvents: "none",
            borderRadius: 24,
            border: "2px dashed var(--accent)",
            background: "rgba(238,239,242,0.55)",
            WebkitBackdropFilter: "blur(8px)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            animation: "gl-fade 160ms ease-out backwards",
          }}
        >
          <div
            className="tile"
            style={{ width: 56, height: 56, borderRadius: 16 }}
          >
            <Icon glyph="upload" size={24} />
          </div>
          <span className="h2">Drop to upload to Thesis</span>
          <span className="sm muted">
            Files go to quarantine and are scanned first.
          </span>
        </div>
      ) : null}

      {toast ? (
        <div role="status" aria-live="polite" className="toast">
          <span>{toast.msg}</span>
          {toast.undo ? (
            <Button
              label="Undo"
              variant="secondary"
              size="sm"
              onClick={toast.undo}
            />
          ) : (
            <span style={{ width: 8 }} />
          )}
        </div>
      ) : null}
    </div>
  )
}
