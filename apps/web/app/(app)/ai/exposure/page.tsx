"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Icon,
  PageHead,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { glashusApi } from "@/lib/api"
import { formatBytes } from "@/lib/format"
import {
  unwrapApi,
  useAiLog,
  useExposure,
  useFiles,
  useInvalidateDrive,
  useMe,
  useShares,
} from "@/lib/queries"

interface NodeItem {
  id: string
  label: string
  sub: string
  x: number
  y: number
  kind: "you" | "file" | "target"
  exposed: boolean
  fileId?: string
  shareIds: string[]
}

export default function ExposureMapPage() {
  const { data: me } = useMe()
  const { data: exposure } = useExposure()
  const { data: files = [], isLoading } = useFiles({ trashed: false })
  const { data: shares = [] } = useShares()
  const { data: aiLog } = useAiLog()
  const invalidate = useInvalidateDrive()

  const [selectedId, setSelectedId] = React.useState<string>("you")
  const [revoking, setRevoking] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)
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

  const activeShares = React.useMemo(
    () => shares.filter((s) => !s.revokedAt),
    [shares]
  )

  const reads = React.useMemo(() => aiLog?.reads ?? [], [aiLog])

  const graph = React.useMemo(() => {
    const rankedFiles = [...files]
      .sort((a, b) => {
        const scoreA =
          (a.exposure === "public" ? 4 : a.exposure === "private" ? 0 : 2) +
          (a.findingCount > 0 ? 1 : 0)
        const scoreB =
          (b.exposure === "public" ? 4 : b.exposure === "private" ? 0 : 2) +
          (b.findingCount > 0 ? 1 : 0)
        if (scoreB !== scoreA) return scoreB - scoreA
        return b.updatedAt.localeCompare(a.updatedAt)
      })
      .slice(0, 6)

    const nodes: NodeItem[] = [
      {
        id: "you",
        label: me?.user.name || me?.user.email || "You",
        sub: `${files.length} files · score ${exposure?.score ?? 100}/100`,
        x: 130,
        y: 260,
        kind: "you",
        exposed: false,
        shareIds: [],
      },
    ]

    const edges: Array<{
      id: string
      from: string
      to: string
      exposed: boolean
    }> = []

    const hasPublic = activeShares.some((s) => s.audience === "anyone")
    const hasPeople = activeShares.some(
      (s) => s.audience === "specific_people"
    )
    const hasAi = reads.length > 0

    rankedFiles.forEach((f, idx) => {
      const y = 75 + idx * 80
      const fShares = activeShares.filter((s) => s.fileId === f.id)
      const fReads = reads.filter((r) => r.fileId === f.id)
      const isPublic = fShares.some((s) => s.audience === "anyone")
      const isPeople = fShares.some((s) => s.audience === "specific_people")
      const exposed = isPublic || (fShares.length > 0 && f.findingCount > 0)

      const nodeId = `file-${f.id}`
      nodes.push({
        id: nodeId,
        label: f.name,
        sub: `${formatBytes(f.size)} · ${f.exposure} · ${f.findingCount} findings`,
        x: 410,
        y,
        kind: "file",
        exposed,
        fileId: f.id,
        shareIds: fShares.map((s) => s.id),
      })

      edges.push({
        id: `e-you-${f.id}`,
        from: "you",
        to: nodeId,
        exposed,
      })

      if (isPublic) {
        edges.push({
          id: `e-${f.id}-public`,
          from: nodeId,
          to: "target-public",
          exposed: true,
        })
      }
      if (isPeople) {
        edges.push({
          id: `e-${f.id}-people`,
          from: nodeId,
          to: "target-people",
          exposed: f.findingCount > 0,
        })
      }
      if (fReads.length > 0) {
        edges.push({
          id: `e-${f.id}-ai`,
          from: nodeId,
          to: "target-ai",
          exposed: false,
        })
      }
    })

    if (hasPublic) {
      nodes.push({
        id: "target-public",
        label: "Public web links",
        sub: `${activeShares.filter((s) => s.audience === "anyone").length} link(s)`,
        x: 700,
        y: 120,
        kind: "target",
        exposed: true,
        shareIds: activeShares
          .filter((s) => s.audience === "anyone")
          .map((s) => s.id),
      })
    }
    if (hasPeople) {
      nodes.push({
        id: "target-people",
        label: "Invited recipients",
        sub: `${activeShares.filter((s) => s.audience === "specific_people").length} share(s)`,
        x: 700,
        y: 260,
        kind: "target",
        exposed: false,
        shareIds: activeShares
          .filter((s) => s.audience === "specific_people")
          .map((s) => s.id),
      })
    }
    if (hasAi) {
      nodes.push({
        id: "target-ai",
        label: "Gemini AI",
        sub: `${reads.length} masked read(s)`,
        x: 700,
        y: 400,
        kind: "target",
        exposed: false,
        shareIds: [],
      })
    }

    return { nodes, edges }
  }, [activeShares, exposure?.score, files, me, reads])

  const selectedNode =
    graph.nodes.find((n) => n.id === selectedId) ?? graph.nodes[0]

  const revokeSelectedShares = async () => {
    if (!selectedNode || selectedNode.shareIds.length === 0) return
    setRevoking(true)
    try {
      for (const shareId of selectedNode.shareIds) {
        unwrapApi(
          await glashusApi.DELETE("/v1/shares/{id}", {
            params: { path: { id: shareId } },
          })
        )
      }
      invalidate()
      notify(
        `Revoked ${selectedNode.shareIds.length} link${selectedNode.shareIds.length === 1 ? "" : "s"}`
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not revoke shares.")
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="exposure" />
      <main className="main">
        <PageHead
          title="Exposure map"
          sub="Live relationship graph between your Drive, external share links, and AI access."
          cta="All shares"
          ctaIcon="link"
          ctaHref="/sharing"
        />

        {isLoading ? (
          <div className="glass card" style={{ padding: 24 }}>
            <span className="sm muted">Building exposure graph…</span>
          </div>
        ) : files.length === 0 ? (
          <div className="glass card col center" style={{ padding: 36, gap: 10 }}>
            <span className="h2">Nothing mapped yet</span>
            <span className="sm muted">
              Upload files or share links to visualize your live exposure graph.
            </span>
            <Button
              label="Upload file"
              variant="primary"
              icon="upload"
              href="/drive/upload"
            />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.8fr) minmax(270px, 330px)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <section
              className="glass card"
              style={{ padding: 14, overflowX: "auto" }}
            >
              <svg
                viewBox="0 0 840 540"
                style={{ width: "100%", height: "auto", minWidth: 580 }}
                role="img"
                aria-label="Live file exposure graph"
              >
                {graph.edges.map((e) => {
                  const from = graph.nodes.find((n) => n.id === e.from)
                  const to = graph.nodes.find((n) => n.id === e.to)
                  if (!from || !to) return null
                  return (
                    <line
                      key={e.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={
                        e.exposed
                          ? "var(--accent, #D97706)"
                          : "rgba(17,17,17,0.22)"
                      }
                      strokeWidth={e.exposed ? 2.4 : 1.5}
                      strokeDasharray={e.exposed ? undefined : "5 5"}
                    />
                  )
                })}

                {graph.nodes.map((node) => {
                  const active = node.id === selectedNode?.id
                  const r = node.kind === "you" ? 28 : 22
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelectedId(node.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        r={r}
                        fill={
                          node.exposed
                            ? "rgba(217, 119, 6, 0.16)"
                            : "rgba(255, 255, 255, 0.88)"
                        }
                        stroke={
                          active
                            ? "#111"
                            : node.exposed
                              ? "var(--accent, #D97706)"
                              : "rgba(17,17,17,0.2)"
                        }
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                      <text
                        y={r + 16}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight={active ? 600 : 500}
                        fill="#111"
                      >
                        {node.label.length > 22
                          ? `${node.label.slice(0, 20)}…`
                          : node.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </section>

            <aside className="glass card col" style={{ gap: 12 }}>
              <span className="xs muted">INSPECTOR</span>
              {selectedNode ? (
                <>
                  <span className="h2 ell">{selectedNode.label}</span>
                  <span className="sm muted">{selectedNode.sub}</span>
                  <Chip
                    label={
                      selectedNode.exposed
                        ? "Externally exposed"
                        : selectedNode.kind === "target"
                          ? "Destination"
                          : "Controlled"
                    }
                    tone={selectedNode.exposed ? "accent" : "clear"}
                  />

                  <hr className="hr" />
                  <div className="col" style={{ gap: 8 }}>
                    {selectedNode.fileId ? (
                      <Button
                        label="Open file viewer"
                        variant="secondary"
                        icon="eye"
                        href={`/viewer?fileId=${encodeURIComponent(selectedNode.fileId)}`}
                      />
                    ) : null}
                    {selectedNode.shareIds.length > 0 ? (
                      <Button
                        label={
                          revoking
                            ? "Revoking…"
                            : `Revoke ${selectedNode.shareIds.length} link(s)`
                        }
                        variant="danger"
                        icon="x"
                        disabled={revoking}
                        onClick={() => void revokeSelectedShares()}
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
            </aside>
          </div>
        )}

        {toast ? (
          <div className="toast">
            <Icon glyph="check" size={14} /> {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}
