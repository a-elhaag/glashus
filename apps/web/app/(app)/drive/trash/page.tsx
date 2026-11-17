"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  FileTile,
  Icon,
  PageHead,
  Sidebar,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

type TrashItem = {
  id: string
  name: string
  ext: string
  daysLeft: string
  progress: number
}

type ToastState = {
  msg: string
  undo?: () => void
} | null

const INITIAL_TRASH: TrashItem[] = [
  {
    id: "trash-contract",
    name: "old-contract.pdf",
    ext: "PDF",
    daysLeft: "26 days",
    progress: 13,
  },
  {
    id: "trash-screenshot",
    name: "screenshot-2026-10-02.png",
    ext: "PNG",
    daysLeft: "19 days",
    progress: 37,
  },
  {
    id: "trash-draft",
    name: "draft-final-FINAL.docx",
    ext: "DOC",
    daysLeft: "11 days",
    progress: 63,
  },
  {
    id: "trash-backup",
    name: "backup-2025.zip",
    ext: "ZIP",
    daysLeft: "3 days",
    progress: 90,
  },
]

export default function TrashPage() {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [items, setItems] = React.useState<TrashItem[]>(INITIAL_TRASH)
  const [search, setSearch] = React.useState("")
  const [toast, setToast] = React.useState<ToastState>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = React.useCallback((msg: string, undo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, undo })
    timerRef.current = setTimeout(() => {
      setToast(null)
    }, 5000)
  }, [])

  const restoreItem = React.useCallback(
    (id: string) => {
      const prev = items
      const target = prev.find((x) => x.id === id)
      if (!target) return
      setItems(prev.filter((x) => x.id !== id))
      showToast(`Restored ${target.name} to Drive`, () => {
        setItems(prev)
        setToast(null)
      })
    },
    [items, showToast]
  )

  const deleteForever = React.useCallback(
    (id: string) => {
      const prev = items
      const target = prev.find((x) => x.id === id)
      if (!target) return
      setItems(prev.filter((x) => x.id !== id))
      showToast(`Deleted ${target.name} forever`, () => {
        setItems(prev)
        setToast(null)
      })
    },
    [items, showToast]
  )

  const emptyTrash = React.useCallback(() => {
    if (items.length === 0) return
    const prev = items
    setItems([])
    showToast(
      `Emptied ${prev.length} ${prev.length === 1 ? "item" : "items"} from trash`,
      () => {
        setItems(prev)
        setToast(null)
      }
    )
  }, [items, showToast])

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => item.name.toLowerCase().includes(query))
  }, [items, search])

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <Sidebar active="trash" />
      <main className="main">
        <PageHead
          title="Trash"
          sub={`${items.length} ${items.length === 1 ? "item" : "items"} · self-destruct timers`}
          cta="Upload"
          ctaIcon="upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div
          className="glass-soft row wrap"
          style={{ borderRadius: 16, padding: "12px 16px", gap: 12 }}
        >
          <Icon glyph="info" size={16} />
          <span className="sm grow">
            Items are deleted for good after 30 days. Nothing here counts toward
            exposure.
          </span>
          <Button
            label="Empty trash"
            variant="danger"
            size="sm"
            disabled={items.length === 0}
            onClick={emptyTrash}
          />
        </div>

        <div
          className="glass"
          style={{ overflowX: "auto", borderRadius: 20 }}
        >
          <div style={{ minWidth: 760 }}>
            <div
              className="thead"
              style={{ gridTemplateColumns: "2.6fr 1fr 1.2fr 100px 150px" }}
            >
              <span>Name</span>
              <span>Time left</span>
              <span>Countdown</span>
              <span />
              <span />
            </div>

            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="trow"
                style={{ gridTemplateColumns: "2.6fr 1fr 1.2fr 100px 150px" }}
              >
                <div className="row" style={{ minWidth: 0 }}>
                  <FileTile ext={item.ext} tone={0} size={36} />
                  <div className="col" style={{ gap: 1, minWidth: 0 }}>
                    <Link
                      href={resolveBoardHref("Viewer.dc.html")}
                      className="ell m"
                    >
                      {item.name}
                    </Link>
                  </div>
                </div>
                <span className="sm muted">{item.daysLeft}</span>
                <div className="bar" style={{ width: 120 }}>
                  <i style={{ width: `${item.progress}%` }} />
                </div>
                <Button
                  label="Restore"
                  variant="secondary"
                  size="sm"
                  icon="undo"
                  onClick={() => restoreItem(item.id)}
                />
                <Button
                  label="Delete forever"
                  variant="danger"
                  size="sm"
                  icon="trash"
                  onClick={() => deleteForever(item.id)}
                />
              </div>
            ))}

            {filteredItems.length === 0 ? (
              <div
                className="col center"
                style={{ padding: "48px 20px", gap: 6 }}
              >
                <span className="h2">
                  {items.length === 0
                    ? "Trash is empty."
                    : "No matching items in trash."}
                </span>
                <span className="sm muted">
                  {items.length === 0
                    ? "Deleted files stay here for 30 days before permanent removal."
                    : "Clear the search filter to see all trashed files."}
                </span>
              </div>
            ) : null}
          </div>
        </div>

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
      </main>
    </div>
  )
}
