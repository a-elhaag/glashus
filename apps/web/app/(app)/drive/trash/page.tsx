"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  FileTile,
  Icon,
  PageHead,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { daysUntil, extractExt } from "@/lib/format"
import { unwrapApi, useFiles, useInvalidateDrive } from "@/lib/queries"

export default function TrashPage() {
  const filesQuery = useFiles({ trashed: true })
  const invalidateDrive = useInvalidateDrive()

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [search, setSearch] = React.useState("")
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = React.useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastMsg(msg)
    timerRef.current = setTimeout(() => setToastMsg(null), 4000)
  }, [])

  const restoreItem = async (id: string, name: string) => {
    setBusyId(id)
    try {
      unwrapApi(
        await glashusApi.POST("/v1/files/{id}/restore", {
          params: { path: { id } },
        })
      )
      invalidateDrive()
      showToast(`Restored ${name} to Drive`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Restore failed")
    } finally {
      setBusyId(null)
    }
  }

  const deleteForever = async (id: string, name: string) => {
    setBusyId(id)
    try {
      unwrapApi(
        await glashusApi.DELETE("/v1/files/{id}", {
          params: { path: { id } },
        })
      )
      invalidateDrive()
      showToast(`Deleted ${name} forever`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusyId(null)
    }
  }

  const emptyTrash = async () => {
    setBusyId("empty-all")
    try {
      const res = unwrapApi(await glashusApi.POST("/v1/trash/empty"))
      invalidateDrive()
      showToast(`Emptied ${res.deletedCount} item(s) from trash`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to empty trash")
    } finally {
      setBusyId(null)
    }
  }

  const items = filesQuery.data ?? []
  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => item.name.toLowerCase().includes(query))
  }, [items, search])

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="trash" />
      <main className="main">
        <PageHead
          title="Trash"
          sub={`${items.length} ${items.length === 1 ? "item" : "items"} · self-destruct timers`}
          cta="Upload"
          ctaIcon="upload"
          ctaHref="/drive/upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div
          className="glass-soft row wrap"
          style={{ borderRadius: 16, padding: "12px 16px", gap: 12 }}
        >
          <Icon glyph="info" size={16} />
          <span className="sm grow">
            Items are deleted for good after 30 days. Deleting forever frees your storage quota right away.
          </span>
          <Button
            label={busyId === "empty-all" ? "Emptying…" : "Empty trash"}
            variant="danger"
            size="sm"
            disabled={items.length === 0 || busyId !== null}
            onClick={() => void emptyTrash()}
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

            {filesQuery.isLoading ? (
              <div className="col center muted" style={{ padding: "36px 20px" }}>
                <span className="sm">Loading trash…</span>
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const daysLeft = daysUntil(item.purgeAt) ?? 30
                const progress = Math.min(
                  100,
                  Math.max(5, Math.round(((30 - daysLeft) / 30) * 100))
                )
                return (
                  <div
                    key={item.id}
                    className="trow"
                    style={{ gridTemplateColumns: "2.6fr 1fr 1.2fr 100px 150px" }}
                  >
                    <div className="row" style={{ minWidth: 0 }}>
                      <FileTile ext={extractExt(item.name)} tone={0} size={36} />
                      <div className="col" style={{ gap: 1, minWidth: 0 }}>
                        <Link
                          href={`/viewer?fileId=${encodeURIComponent(item.id)}`}
                          className="ell m"
                        >
                          {item.name}
                        </Link>
                      </div>
                    </div>
                    <span className="sm muted">
                      {daysLeft} {daysLeft === 1 ? "day" : "days"}
                    </span>
                    <div className="bar" style={{ width: 120 }}>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <Button
                      label="Restore"
                      variant="secondary"
                      size="sm"
                      icon="undo"
                      disabled={busyId === item.id}
                      onClick={() => void restoreItem(item.id, item.name)}
                    />
                    <Button
                      label="Delete forever"
                      variant="danger"
                      size="sm"
                      icon="trash"
                      disabled={busyId === item.id}
                      onClick={() => void deleteForever(item.id, item.name)}
                    />
                  </div>
                )
              })
            ) : (
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
            )}
          </div>
        </div>

        {toastMsg ? (
          <div role="status" aria-live="polite" className="toast">
            <span>{toastMsg}</span>
          </div>
        ) : null}
      </main>
    </div>
  )
}
