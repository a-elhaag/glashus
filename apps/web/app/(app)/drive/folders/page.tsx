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
  Switch,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import {
  exposureToUi,
  extractExt,
  formatBytes,
  formatShortDate,
} from "@/lib/format"
import {
  unwrapApi,
  uploadFileToGlashus,
  useFiles,
  useFolders,
  useInvalidateDrive,
} from "@/lib/queries"

type DriveItem = {
  id: string
  name: string
  folder: boolean
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
  | { kind: "sep"; id: string }
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

const SHORTCUT_ROWS: Array<{ label: string; key: string }> = [
  { label: "Move selection", key: "↑ ↓" },
  { label: "Extend selection", key: "⇧ ↑ ↓" },
  { label: "Select all", key: "⌘A" },
  { label: "Share", key: "S" },
  { label: "Move to folder", key: "M" },
  { label: "Move to trash", key: "⌫" },
  { label: "New folder", key: "N" },
  { label: "List or grid", key: "V" },
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
  const foldersQuery = useFolders()
  const filesQuery = useFiles({ trashed: false })
  const invalidateDrive = useInvalidateDrive()

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const moveDialogRef = React.useRef<HTMLDivElement | null>(null)
  const shareDialogRef = React.useRef<HTMLDivElement | null>(null)
  const keysDialogRef = React.useRef<HTMLDivElement | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const newFolderInputId = React.useId()

  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(
    null
  )
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
  const [search, setSearch] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const say = React.useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastMsg(msg)
    timerRef.current = setTimeout(() => setToastMsg(null), 5000)
  }, [])

  const folders = React.useMemo(
    () => foldersQuery.data ?? [],
    [foldersQuery.data]
  )
  const files = React.useMemo(() => filesQuery.data ?? [], [filesQuery.data])

  const folderMap = React.useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders]
  )

  const breadcrumbs = React.useMemo(() => {
    const chain: Array<{ id: string | null; name: string }> = []
    let cursor = currentFolderId
    const seen = new Set<string>()
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor)
      const f = folderMap.get(cursor)
      if (!f) break
      chain.unshift({ id: f.id, name: f.name })
      cursor = f.parentId
    }
    return [{ id: null, name: "Drive" }, ...chain]
  }, [currentFolderId, folderMap])

  const currentFolderName =
    breadcrumbs[breadcrumbs.length - 1]?.name ?? "Drive"

  const allItems = React.useMemo<DriveItem[]>(() => {
    const childCounts = new Map<string, number>()
    for (const f of folders) {
      if (f.parentId) {
        childCounts.set(f.parentId, (childCounts.get(f.parentId) ?? 0) + 1)
      }
    }
    for (const file of files) {
      if (file.folderId) {
        childCounts.set(
          file.folderId,
          (childCounts.get(file.folderId) ?? 0) + 1
        )
      }
    }

    const folderItems: DriveItem[] = folders
      .filter((f) => f.parentId === currentFolderId)
      .map((f) => ({
        id: f.id,
        name: f.name,
        folder: true,
        count: childCounts.get(f.id) ?? 0,
        ext: "DIR",
        tone: f.vault ? 2 : 0,
        vis: f.vault ? "Vault" : f.aiConsent === "allow" ? "AI Allow" : "Private",
        visTone: f.vault ? "accent" : "clear",
        mod: formatShortDate(f.updatedAt),
      }))

    const fileItems: DriveItem[] = files
      .filter((f) => f.folderId === currentFolderId)
      .map((f) => {
        const vis = exposureToUi(f.exposure)
        return {
          id: f.id,
          name: f.name,
          folder: false,
          ext: extractExt(f.name),
          tone: vis.tileTone,
          vis: vis.label,
          visTone: vis.visTone,
          mod: formatShortDate(f.updatedAt),
          size: formatBytes(f.size),
          flag:
            f.findingCount > 0
              ? `${f.findingCount} finding${f.findingCount === 1 ? "" : "s"}`
              : undefined,
        }
      })

    return [...folderItems, ...fileItems]
  }, [folders, files, currentFolderId])

  const visibleItems = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return allItems
    return allItems.filter((x) => {
      const hay = `${x.name} ${x.flag ?? ""} ${x.vis}`.toLowerCase()
      return hay.includes(query)
    })
  }, [allItems, search])

  const selectedItems = React.useMemo(
    () => visibleItems.filter((x) => selected.includes(x.id)),
    [visibleItems, selected]
  )

  const moveTargetFolders = React.useMemo(
    () =>
      folders.filter(
        (f) => f.id !== currentFolderId && !selected.includes(f.id)
      ),
    [folders, currentFolderId, selected]
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

  const openFolder = React.useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId)
    setSelected([])
    setAnchorId(null)
    setMenu(null)
  }, [])

  const trashItems = React.useCallback(
    async (idsToTrash?: string[]) => {
      const ids = idsToTrash ?? selected
      if (ids.length === 0) return
      setMenu(null)
      setBusy(true)
      try {
        for (const id of ids) {
          const item = allItems.find((x) => x.id === id)
          if (!item) continue
          if (item.folder) {
            unwrapApi(
              await glashusApi.DELETE("/v1/folders/{id}", {
                params: { path: { id } },
              })
            )
          } else {
            unwrapApi(
              await glashusApi.PATCH("/v1/files/{id}", {
                params: { path: { id } },
                body: { trashed: true },
              })
            )
          }
        }
        setSelected([])
        invalidateDrive()
        say(
          `Moved ${ids.length} ${ids.length === 1 ? "item" : "items"} out of folder`
        )
      } catch (err) {
        say(err instanceof Error ? err.message : "Delete failed")
      } finally {
        setBusy(false)
      }
    },
    [selected, allItems, invalidateDrive, say]
  )

  const moveItemsTo = React.useCallback(
    async (sourceIds: string[], targetFolderId: string | null) => {
      const ids = sourceIds.filter((id) => id && id !== targetFolderId)
      if (ids.length === 0) return
      setMoveOpen(false)
      setDragId(null)
      setOverId(null)
      setBusy(true)
      try {
        for (const id of ids) {
          const item = allItems.find((x) => x.id === id)
          if (!item) continue
          if (item.folder) {
            unwrapApi(
              await glashusApi.PATCH("/v1/folders/{id}", {
                params: { path: { id } },
                body: { parentId: targetFolderId },
              })
            )
          } else {
            unwrapApi(
              await glashusApi.PATCH("/v1/files/{id}", {
                params: { path: { id } },
                body: { folderId: targetFolderId },
              })
            )
          }
        }
        setSelected([])
        invalidateDrive()
        const targetName = targetFolderId
          ? (folderMap.get(targetFolderId)?.name ?? "folder")
          : "Drive root"
        say(
          `Moved ${ids.length} ${ids.length === 1 ? "item" : "items"} to ${targetName}`
        )
      } catch (err) {
        say(err instanceof Error ? err.message : "Move failed")
      } finally {
        setBusy(false)
      }
    },
    [allItems, folderMap, invalidateDrive, say]
  )

  const handleCreateFolder = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const name = newFolderName.trim() || "Untitled folder"
      setBusy(true)
      try {
        const created = unwrapApi(
          await glashusApi.POST("/v1/folders", {
            body: {
              name,
              parentId: currentFolderId,
              aiConsent: "off",
              vault: false,
            },
          })
        )
        setNewFolderOpen(false)
        setNewFolderName("")
        setSelected([created.id])
        setAnchorId(created.id)
        invalidateDrive()
        say(`Created folder "${created.name}"`)
      } catch (err) {
        say(err instanceof Error ? err.message : "Could not create folder")
      } finally {
        setBusy(false)
      }
    },
    [newFolderName, currentFolderId, invalidateDrive, say]
  )

  const handleDownloadSelected = React.useCallback(
    async (fileId?: string) => {
      const targetId =
        fileId ?? selectedItems.find((item) => !item.folder)?.id
      if (!targetId) return
      setMenu(null)
      try {
        const res = unwrapApi(
          await glashusApi.POST("/v1/files/{id}/download-url", {
            params: { path: { id: targetId } },
          })
        )
        window.open(res.downloadUrl, "_blank", "noopener,noreferrer")
        say(`Download started for ${res.name}`)
      } catch (err) {
        say(err instanceof Error ? err.message : "Download failed")
      }
    },
    [selectedItems, say]
  )

  const handleQuickShare = React.useCallback(async () => {
    const fileItem = selectedItems.find((item) => !item.folder)
    if (!fileItem) {
      say("Select a file to create a share link")
      return
    }
    const expiryDays =
      shareExpiry === "1 day"
        ? 1
        : shareExpiry === "7 days"
          ? 7
          : shareExpiry === "30 days"
            ? 30
            : null
    setBusy(true)
    try {
      const created = unwrapApi(
        await glashusApi.POST("/v1/shares", {
          body: {
            fileId: fileItem.id,
            audience: "anyone",
            expiryDays,
            maxDownloads: 5,
            requirePin: sharePin,
            redacted: Boolean(fileItem.flag),
          },
        })
      )
      setShareOpen(false)
      invalidateDrive()
      const fullUrl = `${window.location.origin}${created.sharePath}`
      try {
        await navigator.clipboard?.writeText(fullUrl)
      } catch {
        // Clipboard optional
      }
      say(
        created.pin
          ? `Link copied · PIN ${created.pin}`
          : "Share link created and copied"
      )
    } catch (err) {
      say(err instanceof Error ? err.message : "Could not create share link")
    } finally {
      setBusy(false)
    }
  }, [selectedItems, shareExpiry, sharePin, invalidateDrive, say])

  const handleDesktopDrop = React.useCallback(
    async (fileList: FileList) => {
      const dropped = Array.from(fileList)
      if (dropped.length === 0) return
      say(`Uploading ${dropped.length} file(s) to quarantine…`)
      let cleanCount = 0
      let blockedCount = 0
      for (const file of dropped) {
        try {
          const res = await uploadFileToGlashus(file, currentFolderId)
          if (res.blockedReason) blockedCount += 1
          else cleanCount += 1
        } catch {
          blockedCount += 1
        }
      }
      invalidateDrive()
      say(
        blockedCount > 0
          ? `Uploaded ${cleanCount} clean · ${blockedCount} blocked`
          : `${cleanCount} file(s) scanned and ready`
      )
    },
    [currentFolderId, invalidateDrive, say]
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
      if (shareOpen || newFolderOpen || moveOpen || keysOpen || menu) return

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
        void trashItems()
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
          router.push(`/viewer?fileId=${encodeURIComponent(single.id)}`)
        } else if (single?.folder) {
          e.preventDefault()
          openFolder(single.id)
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
    openFolder,
    router,
  ])

  const singleSelected = selectedItems[0]
  const menuEntries = React.useMemo<MenuEntry[]>(() => {
    if (!menu) return []
    if (menu.kind === "item" && singleSelected) {
      if (singleSelected.folder) {
        return [
          {
            kind: "btn",
            id: "open-folder",
            label: "Open folder",
            icon: "folder",
            kbd: "↵",
            onSelect: () => openFolder(singleSelected.id),
          },
          {
            kind: "btn",
            id: "move",
            label: "Move to…",
            icon: "folder",
            kbd: "M",
            onSelect: openMoveModal,
          },
          { kind: "sep", id: "sep-folder" },
          {
            kind: "btn",
            id: "delete-folder",
            label: "Delete folder",
            icon: "trash",
            kbd: "⌫",
            danger: true,
            onSelect: () => void trashItems([singleSelected.id]),
          },
        ]
      }
      return [
        {
          kind: "link",
          id: "open",
          label: "Open",
          icon: "eye",
          href: `/viewer?fileId=${encodeURIComponent(singleSelected.id)}`,
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
          id: "download",
          label: "Download",
          icon: "download",
          onSelect: () => void handleDownloadSelected(singleSelected.id),
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
          href: `/sharing/scan?fileId=${encodeURIComponent(singleSelected.id)}`,
        },
        { kind: "sep", id: "sep2" },
        {
          kind: "btn",
          id: "trash",
          label: "Move to trash",
          icon: "trash",
          kbd: "⌫",
          danger: true,
          onSelect: () => void trashItems(),
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
        href: "/drive/upload",
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
    singleSelected,
    view,
    visibleItems,
    openFolder,
    openShareModal,
    openMoveModal,
    openNewFolderModal,
    handleDownloadSelected,
    trashItems,
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
        items[(activeIdx + 1) % items.length]?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        items[(activeIdx - 1 + items.length) % items.length]?.focus()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setMenu(null)
      }
    },
    []
  )

  const shareTitleName =
    selectedItems.length === 1 && singleSelected
      ? singleSelected.name
      : `${selectedItems.length} items`
  const shareHasFlag = selectedItems.some((x) => Boolean(x.flag))
  const singleFile = selectedItems.find((x) => !x.folder)

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
        if (e.shiftKey || isEditableTarget(e.target)) return
        if (
          e.target instanceof Element &&
          e.target.closest("a, nav[aria-label='Primary'], .scrim, .menu, .toast, button")
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
        if (extOpen && e.dataTransfer?.files?.length) {
          e.preventDefault()
          setExtOpen(false)
          void handleDesktopDrop(e.dataTransfer.files)
        }
      }}
    >
      <AppSidebar active="folders" />

      <main className="main">
        <PageHead
          title={currentFolderName}
          sub={breadcrumbs.map((b) => b.name).join(" / ")}
          cta="Upload"
          ctaIcon="upload"
          ctaHref="/drive/upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="row wrap between">
          <nav className="row sm" style={{ gap: 6 }} aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id ?? "root"}>
                {idx > 0 ? <Icon glyph="chevR" size={14} /> : null}
                {idx < breadcrumbs.length - 1 ? (
                  <button
                    type="button"
                    className="muted"
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => openFolder(crumb.id)}
                  >
                    {crumb.name}
                  </button>
                ) : (
                  <span className="m">{crumb.name}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="row wrap" style={{ gap: 10 }}>
            <span className="xs muted">
              Double-click folder to open · press <span className="kbd">?</span>
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

        {foldersQuery.isLoading || filesQuery.isLoading ? (
          <div className="glass col center muted" style={{ borderRadius: 20, padding: 40 }}>
            Loading folders and files…
          </div>
        ) : null}

        {view === "list" && visibleItems.length > 0 ? (
          <div className="glass" style={{ overflowX: "auto", borderRadius: 20 }}>
            <div style={{ minWidth: 720 }}>
              <div
                className="thead"
                style={{ gridTemplateColumns: "2.6fr 1.2fr 1fr 0.8fr 40px" }}
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
                const subText = it.folder
                  ? `${it.count ?? 0} ${it.count === 1 ? "item" : "items"}`
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
                    style={{ gridTemplateColumns: "2.6fr 1.2fr 1fr 0.8fr 40px" }}
                    onClick={(e) => handleItemClick(e, it)}
                    onDoubleClick={() => {
                      if (it.folder) openFolder(it.id)
                      else router.push(`/viewer?fileId=${encodeURIComponent(it.id)}`)
                    }}
                    onContextMenu={(e) => {
                      if (e.shiftKey || isEditableTarget(e.target)) return
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
                        // ignore
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
                        void moveItemsTo(sourceIds, it.id)
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
              const subText = it.folder
                ? `${it.count ?? 0} ${it.count === 1 ? "item" : "items"}`
                : (it.flag ?? it.size ?? "")

              return (
                <div
                  key={it.id}
                  className={["gcard item", isSelected ? "on" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-selected={isSelected}
                  onClick={(e) => handleItemClick(e, it)}
                  onDoubleClick={() => {
                    if (it.folder) openFolder(it.id)
                    else router.push(`/viewer?fileId=${encodeURIComponent(it.id)}`)
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

        {!foldersQuery.isLoading && !filesQuery.isLoading && visibleItems.length === 0 ? (
          <div
            className="glass col center muted"
            style={{ borderRadius: 20, padding: 40, gap: 10 }}
          >
            <span>
              {search.trim()
                ? "No files or folders match your search."
                : "This folder is empty. Drop files here or create a folder."}
            </span>
            {!search.trim() ? (
              <div className="row" style={{ gap: 8 }}>
                <Button
                  label="New folder"
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  onClick={openNewFolderModal}
                />
                <Button
                  label="Upload files"
                  variant="primary"
                  size="sm"
                  icon="upload"
                  href="/drive/upload"
                />
              </div>
            ) : null}
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
            {singleFile ? (
              <Button
                label="Share"
                variant="primary"
                size="sm"
                icon="share"
                onClick={openShareModal}
              />
            ) : null}
            <Button
              label="Move to"
              variant="secondary"
              size="sm"
              icon="folder"
              onClick={openMoveModal}
            />
            {singleFile ? (
              <Button
                label="Download"
                variant="secondary"
                size="sm"
                icon="download"
                onClick={() => void handleDownloadSelected(singleFile.id)}
              />
            ) : null}
            <Button
              label={busy ? "Working…" : "Trash / Delete"}
              variant="danger"
              size="sm"
              icon="trash"
              disabled={busy}
              onClick={() => void trashItems()}
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
            onSubmit={(e) => void handleCreateFolder(e)}
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
                <span className="sm muted">Inside {currentFolderName}</span>
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
              note="Created with AI consent Off by default."
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
                  label={busy ? "Creating…" : "Create folder"}
                  variant="primary"
                  size="md"
                  icon="plus"
                  disabled={busy}
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
                <span className="sm muted">Choose a destination folder</span>
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

            <div className="col" style={{ gap: 6 }}>
              {currentFolderId !== null ? (
                <button
                  type="button"
                  className="glass-soft row between"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onClick={() => void moveItemsTo(selected, null)}
                >
                  <span className="row" style={{ gap: 10 }}>
                    <Icon glyph="drive" size={16} />
                    <span className="sm m">Drive root</span>
                  </span>
                </button>
              ) : null}

              {moveTargetFolders.map((folder) => (
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
                  onClick={() => void moveItemsTo(selected, folder.id)}
                >
                  <span className="row" style={{ gap: 10 }}>
                    <Icon glyph="folder" size={16} />
                    <span className="sm m">{folder.name}</span>
                  </span>
                </button>
              ))}

              {currentFolderId === null && moveTargetFolders.length === 0 ? (
                <div
                  className="glass-soft sm muted"
                  style={{ borderRadius: 14, padding: "14px 16px" }}
                >
                  Create another folder first to move items into it.
                </div>
              ) : null}
            </div>

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

      {shareOpen && singleFile ? (
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
                  Share {singleFile.name}
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
                  <span className="b">Sensitive findings detected.</span> A
                  redacted copy will be shared.
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
                href={`/sharing/share?fileId=${encodeURIComponent(singleFile.id)}`}
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
                  label={busy ? "Creating…" : "Create link"}
                  variant="primary"
                  size="md"
                  icon="link"
                  disabled={busy}
                  onClick={() => void handleQuickShare()}
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
          }}
        >
          <div
            className="tile"
            style={{ width: 56, height: 56, borderRadius: 16 }}
          >
            <Icon glyph="upload" size={24} />
          </div>
          <span className="h2">Drop to upload to {currentFolderName}</span>
          <span className="sm muted">
            Files go to quarantine and are scanned first.
          </span>
        </div>
      ) : null}

      {toastMsg ? (
        <div role="status" aria-live="polite" className="toast">
          <span>{toastMsg}</span>
        </div>
      ) : null}
    </div>
  )
}
