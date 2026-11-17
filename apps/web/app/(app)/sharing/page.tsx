"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  FileTile,
  Icon,
  PageHead,
  Seg,
  Sidebar,
  resolveBoardHref,
} from "@workspace/ui/components/glashus"

type SegmentOption = "All" | "Public" | "People" | "Expiring"
type ExtraFilter = "all" | "pin" | "never"

interface ShareLinkRow {
  id: string
  name: string
  ext: string
  tone: 0 | 1 | 2
  audienceType: "public" | "people"
  sharedWith: string
  expires: string
  expiring: boolean
  downloads: string
  hasPin: boolean
}

const SHARE_LINKS: ShareLinkRow[] = [
  {
    id: "tax-return-2025",
    name: "tax-return-2025.pdf",
    ext: "PDF",
    tone: 2,
    audienceType: "public",
    sharedWith: "Public link",
    expires: "Never",
    expiring: false,
    downloads: "7 / ∞",
    hasPin: false,
  },
  {
    id: "api-config",
    name: "api-config.env",
    ext: "ENV",
    tone: 1,
    audienceType: "people",
    sharedWith: "sara@studio.dev",
    expires: "Never",
    expiring: false,
    downloads: "1 / 1",
    hasPin: false,
  },
  {
    id: "q3-pitch-deck",
    name: "q3-pitch-deck.pdf",
    ext: "PDF",
    tone: 1,
    audienceType: "public",
    sharedWith: "Public link",
    expires: "2 days",
    expiring: true,
    downloads: "12 / 25",
    hasPin: true,
  },
  {
    id: "team-photos",
    name: "team-photos.zip",
    ext: "ZIP",
    tone: 1,
    audienceType: "people",
    sharedWith: "4 people",
    expires: "14 days",
    expiring: true,
    downloads: "31 / ∞",
    hasPin: false,
  },
  {
    id: "thesis-draft-v4",
    name: "thesis-draft-v4.docx",
    ext: "DOC",
    tone: 0,
    audienceType: "people",
    sharedWith: "Prof. Haddad",
    expires: "5 days",
    expiring: true,
    downloads: "3 / 5",
    hasPin: true,
  },
  {
    id: "site-plan",
    name: "site-plan.png",
    ext: "PNG",
    tone: 1,
    audienceType: "public",
    sharedWith: "Public link",
    expires: "Never",
    expiring: false,
    downloads: "44 / ∞",
    hasPin: false,
  },
]

const EXTRA_FILTERS: Array<{ id: ExtraFilter; label: string }> = [
  { id: "all", label: "All rules" },
  { id: "pin", label: "PIN required" },
  { id: "never", label: "Never expires" },
]

interface ToastState {
  msg: string
  prevRevoked: string[] | null
}

export default function SharingPage() {
  const [segment, setSegment] = React.useState<SegmentOption>("All")
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [extraFilter, setExtraFilter] = React.useState<ExtraFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [revokedIds, setRevokedIds] = React.useState<string[]>([])
  const [toast, setToast] = React.useState<ToastState | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = React.useCallback(
    (msg: string, prevRevoked: string[] | null) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setToast({ msg, prevRevoked })
      timerRef.current = setTimeout(() => {
        setToast(null)
        timerRef.current = null
      }, 5000)
    },
    []
  )

  const handleRevoke = (item: ShareLinkRow) => {
    const prev = revokedIds
    setRevokedIds((curr) => (curr.includes(item.id) ? curr : [...curr, item.id]))
    showToast(`Revoked link for ${item.name}`, prev)
  }

  const handleRevokeAllPublic = () => {
    const activePublic = SHARE_LINKS.filter(
      (item) => item.audienceType === "public" && !revokedIds.includes(item.id)
    )
    if (activePublic.length === 0) {
      showToast("No active public links remaining", null)
      return
    }
    const prev = revokedIds
    const next = Array.from(
      new Set([...prev, ...activePublic.map((item) => item.id)])
    )
    setRevokedIds(next)
    showToast(
      `Revoked ${activePublic.length} public ${activePublic.length === 1 ? "link" : "links"}`,
      prev
    )
  }

  const handleUndo = () => {
    if (!toast?.prevRevoked) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setRevokedIds(toast.prevRevoked)
    setToast(null)
  }

  const revokedItems = React.useMemo(
    () => SHARE_LINKS.filter((item) => revokedIds.includes(item.id)),
    [revokedIds]
  )

  const visibleLinks = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return SHARE_LINKS.filter((item) => {
      if (revokedIds.includes(item.id)) return false
      if (segment === "Public" && item.audienceType !== "public") return false
      if (segment === "People" && item.audienceType !== "people") return false
      if (segment === "Expiring" && !item.expiring) return false
      if (extraFilter === "pin" && !item.hasPin) return false
      if (extraFilter === "never" && item.expires !== "Never") return false
      if (
        query &&
        !item.name.toLowerCase().includes(query) &&
        !item.sharedWith.toLowerCase().includes(query)
      ) {
        return false
      }
      return true
    })
  }, [revokedIds, segment, extraFilter, searchQuery])

  const activeLinksCount = Math.max(0, 9 - revokedItems.length)
  const expire48hCount = Math.max(
    0,
    3 - revokedItems.filter((item) => item.expires === "2 days").length
  )
  const neverExpireCount = Math.max(
    0,
    4 - revokedItems.filter((item) => item.expires === "Never").length
  )

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <Sidebar active="shared" />
      <main className="main">
        <PageHead
          title="Shared by me"
          sub="Every link, who has it, and when it ends"
          cta="New link"
          ctaIcon="link"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <div className="glass card col" style={{ gap: 4, padding: "18px 20px" }}>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>
              {activeLinksCount}
            </span>
            <span className="sm muted">Active links</span>
          </div>
          <div className="glass card col" style={{ gap: 4, padding: "18px 20px" }}>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>
              {expire48hCount}
            </span>
            <span className="sm muted">Expire within 48 hours</span>
          </div>
          <div className="glass card col" style={{ gap: 4, padding: "18px 20px" }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "var(--accent)",
              }}
            >
              {neverExpireCount}
            </span>
            <span className="sm muted">Never expire</span>
          </div>
          <div className="glass card col" style={{ gap: 4, padding: "18px 20px" }}>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>
              12
            </span>
            <span className="sm muted">Downloads today</span>
          </div>
        </div>

        <div className="col" style={{ gap: 10 }}>
          <div className="row wrap between">
            <Seg
              options="All|Public|People|Expiring"
              value={segment}
              onChange={(val) => setSegment(val as SegmentOption)}
              aria-label="Filter shared links"
            />
            <div className="row">
              <Button
                label="Filter"
                variant={filterOpen || extraFilter !== "all" ? "secondary" : "ghost"}
                size="md"
                icon="filter"
                onClick={() => setFilterOpen((open) => !open)}
              />
              <Button
                label="Revoke all public"
                variant="danger"
                size="md"
                onClick={handleRevokeAllPublic}
              />
            </div>
          </div>

          {filterOpen ? (
            <div
              className="glass-soft row wrap between"
              style={{ borderRadius: 14, padding: "10px 14px", gap: 10 }}
            >
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="xs b muted">Link rules</span>
                {EXTRA_FILTERS.map((opt) => (
                  <Button
                    key={opt.id}
                    label={opt.label}
                    variant={extraFilter === opt.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setExtraFilter(opt.id)}
                  />
                ))}
              </div>
              {extraFilter !== "all" || searchQuery ? (
                <Button
                  label="Reset filters"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExtraFilter("all")
                    setSearchQuery("")
                    setSegment("All")
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="glass" style={{ overflowX: "auto", borderRadius: 20 }}>
          <div style={{ minWidth: 760 }}>
            <div
              className="thead"
              style={{ gridTemplateColumns: "2.4fr 1.4fr 1fr 0.8fr 0.5fr 110px" }}
            >
              <span>File</span>
              <span>Shared with</span>
              <span>Expires</span>
              <span>Downloads</span>
              <span>PIN</span>
              <span />
            </div>

            {visibleLinks.length > 0 ? (
              visibleLinks.map((item) => (
                <div
                  key={item.id}
                  className="trow"
                  style={{ gridTemplateColumns: "2.4fr 1.4fr 1fr 0.8fr 0.5fr 110px" }}
                >
                  <div className="row" style={{ minWidth: 0 }}>
                    <FileTile ext={item.ext} tone={item.tone} size={36} />
                    <div className="col" style={{ gap: 1, minWidth: 0 }}>
                      <Link href={resolveBoardHref("Viewer.dc.html")} className="ell m">
                        {item.name}
                      </Link>
                    </div>
                  </div>
                  <span className="row sm" style={{ gap: 8 }}>
                    <Icon
                      glyph={item.audienceType === "public" ? "globe" : "user"}
                      size={14}
                    />
                    {item.sharedWith}
                  </span>
                  <span className={item.expires === "Never" ? "sm m" : "sm muted"}>
                    {item.expires}
                  </span>
                  <span className="sm muted">{item.downloads}</span>
                  {item.hasPin ? (
                    <Icon glyph="lock" size={16} />
                  ) : (
                    <span className="sm muted">—</span>
                  )}
                  <Button
                    label="Revoke"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevoke(item)}
                  />
                </div>
              ))
            ) : (
              <div className="col center" style={{ padding: "40px 20px", gap: 10 }}>
                <span className="m">No matching links</span>
                <span className="sm muted">
                  {revokedItems.length > 0
                    ? "Revoked links stop working immediately."
                    : "Adjust your filter to see other shared links."}
                </span>
                {revokedItems.length > 0 ? (
                  <Button
                    label="Restore revoked links"
                    variant="secondary"
                    size="sm"
                    icon="undo"
                    onClick={() => setRevokedIds([])}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        {toast ? (
          <div role="status" className="toast" style={{ position: "fixed" }}>
            <span>{toast.msg}</span>
            {toast.prevRevoked ? (
              <Button label="Undo" variant="secondary" size="sm" onClick={handleUndo} />
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
