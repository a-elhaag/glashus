"use client"

import * as React from "react"
import { Button, Icon } from "@workspace/ui/components/glashus"

const MOTION_TOKENS = [
  {
    token: "--d-fast",
    value: "120ms",
    usage: "Hover, press, row highlight, switch",
  },
  {
    token: "--d-base",
    value: "180ms",
    usage: "Menus, chips, card lift, toast",
  },
  {
    token: "--d-slow",
    value: "260ms",
    usage: "Modal, page enter, score bar",
  },
  {
    token: "--e-out",
    value: "cubic-bezier(.2,.8,.2,1)",
    usage: "Anything entering the screen",
  },
  {
    token: "--e-move",
    value: "cubic-bezier(.4,0,.2,1)",
    usage: "Things that move and stay on screen",
  },
] as const

const MOTION_RULES = [
  "Enter with ease-out. Exit faster than you enter, about 70% of the time.",
  "Menus grow from the cursor. Modals rise from the centre.",
  "Stagger lists by 40ms per item, five items at most.",
  "The press state moves 1px down. No scale on buttons.",
  "A drag lifts the item to 40% opacity. The drop target gets a 2px accent ring.",
  "With reduced motion on, everything becomes an instant cut.",
] as const

export default function MotionPage() {
  const [show, setShow] = React.useState(true)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const replay = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
    timerRef.current = setTimeout(() => {
      setShow(true)
      timerRef.current = null
    }, 60)
  }, [])

  return (
    <div
      className="plain col"
      style={{ minHeight: "100vh", padding: 40, gap: 24 }}
    >
      <div className="row wrap between" style={{ alignItems: "flex-end" }}>
        <div className="col" style={{ gap: 4 }}>
          <h1 className="h1">Glashus motion</h1>
          <p className="p muted" style={{ margin: 0, maxWidth: 640 }}>
            Motion explains where things came from. Nothing runs longer than
            280ms, nothing bounces, and only opacity and transform are animated.
          </p>
        </div>
        <Button
          label="Replay all"
          variant="primary"
          size="md"
          icon="rotate"
          onClick={replay}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="glass card col" style={{ gap: 6 }}>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            Tokens
          </h2>
          {MOTION_TOKENS.map((row) => (
            <div
              key={row.token}
              className="row"
              style={{
                gap: 14,
                padding: "11px 0",
                borderTop: "1px solid rgba(17,17,17,0.07)",
              }}
            >
              <span className="mono" style={{ flex: "0 0 110px" }}>
                {row.token}
              </span>
              <span className="sm b" style={{ flex: "0 0 190px" }}>
                {row.value}
              </span>
              <span className="sm muted">{row.usage}</span>
            </div>
          ))}
        </section>

        <section className="glass card col" style={{ gap: 10 }}>
          <h2 className="h2">Rules</h2>
          {MOTION_RULES.map((rule) => (
            <div
              key={rule}
              className="row sm"
              style={{ gap: 10, alignItems: "flex-start" }}
            >
              <span style={{ color: "var(--accent)", marginTop: 2 }}>
                <Icon glyph="check" size={16} />
              </span>
              <span>{rule}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="glass card col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="m">Page enter</span>
            <span className="xs muted">
              Fade and 8px rise · 260ms · 40ms stagger
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 150,
              borderRadius: 14,
              background: "rgba(17,17,17,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {show ? (
              <div className="col" style={{ gap: 8, width: "70%" }}>
                <div
                  className="glass rise"
                  style={{ height: 26, borderRadius: 8 }}
                />
                <div
                  className="glass rise"
                  style={{ height: 26, borderRadius: 8, animationDelay: "40ms" }}
                />
                <div
                  className="glass rise"
                  style={{ height: 26, borderRadius: 8, animationDelay: "80ms" }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass card col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="m">Context menu</span>
            <span className="xs muted">Scale 0.96 from cursor · 140ms</span>
          </div>
          <div
            style={{
              position: "relative",
              height: 150,
              borderRadius: 14,
              background: "rgba(17,17,17,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {show ? (
              <div
                className="menu pop"
                style={{ position: "static", width: 190 }}
              >
                <div className="mi">
                  <Icon glyph="share" size={16} />
                  Share…
                </div>
                <div className="mi">
                  <Icon glyph="download" size={16} />
                  Download
                </div>
                <div className="mi dg">
                  <Icon glyph="trash" size={16} />
                  Move to trash
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass card col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="m">Modal over blur</span>
            <span className="xs muted">
              Scrim blur 9px in 200ms · sheet rises 14px in 260ms
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 150,
              borderRadius: 14,
              background: "rgba(17,17,17,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {show ? (
              <>
                <div
                  className="row"
                  style={{
                    gap: 6,
                    position: "absolute",
                    inset: 0,
                    padding: 14,
                    flexWrap: "wrap",
                    alignContent: "flex-start",
                  }}
                >
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="line"
                      style={{ width: "30%", height: 22 }}
                    />
                  ))}
                </div>
                <div className="scrim" style={{ padding: 0 }}>
                  <div
                    className="glass modal col"
                    style={{
                      borderRadius: 14,
                      padding: "14px 18px",
                      gap: 4,
                      background: "rgba(255,255,255,0.8)",
                    }}
                  >
                    <span className="sm b">Share file</span>
                    <span className="xs muted">
                      Background stays visible, out of focus
                    </span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="glass card col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="m">Toast with undo</span>
            <span className="xs muted">
              Slides up 12px · 200ms · leaves after 5s
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 150,
              borderRadius: 14,
              background: "rgba(17,17,17,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {show ? (
              <div className="toast" style={{ bottom: 20 }}>
                <span>Moved to trash</span>
                <span className="btn btn-sm btn-secondary">Undo</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass card col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="m">Loading skeleton</span>
            <span className="xs muted">Shimmer loop · 1.2s linear</span>
          </div>
          <div
            style={{
              position: "relative",
              height: 150,
              borderRadius: 14,
              background: "rgba(17,17,17,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {show ? (
              <div className="col" style={{ gap: 8, width: "70%" }}>
                <div
                  className="skel"
                  style={{ height: 14, borderRadius: 6 }}
                />
                <div
                  className="skel"
                  style={{ height: 14, borderRadius: 6, width: "80%" }}
                />
                <div
                  className="skel"
                  style={{ height: 14, borderRadius: 6, width: "55%" }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass card col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="m">Hover lift</span>
            <span className="xs muted">
              2px up · shadow deepens · 180ms
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 150,
              borderRadius: 14,
              background: "rgba(17,17,17,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {show ? (
              <div
                className="glass lift col center"
                style={{ width: "60%", height: 80, borderRadius: 14 }}
              >
                <span className="sm muted">Hover me</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
