"use client"

import * as React from "react"
import { resolveBoardHref } from "@workspace/ui/lib/routes"

const ICON_PATHS: Record<string, string> = {
  drive: "M3 7l9-4 9 4-9 4-9-4z|M3 12l9 4 9-4|M3 17l9 4 9-4",
  link: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1|M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
  graph:
    "M3 12a2 2 0 104 0 2 2 0 10-4 0M17 5a2 2 0 104 0 2 2 0 10-4 0M17 19a2 2 0 104 0 2 2 0 10-4 0|M7 11l10-5M7 13l10 5",
  clock: "M3 12a9 9 0 1018 0 9 9 0 10-18 0|M12 7v5l3 2",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  search: "M4 11a7 7 0 1014 0 7 7 0 10-14 0|M20 20l-3.5-3.5",
  share: "M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7|M16 6l-4-4-4 4M12 2v13",
  warn: "M12 9v4M12 17h.01|M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  check: "M5 12l5 5 9-11",
  x: "M6 6l12 12M18 6L6 18",
  chevR: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  chevL: "M15 6l-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z|M9 12a3 3 0 106 0 3 3 0 10-6 0",
  lock: "M6 11h12v9H6z|M8 11V8a4 4 0 018 0v3",
  sparkle: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z",
  chat: "M4 5h16v11H9l-5 4z",
  file: "M6 3h8l4 4v14H6z|M14 3v4h4",
  folder: "M3 6h6l2 2h10v11H3z",
  sliders: "M4 7h10M18 7h2M4 17h2M10 17h10|M14 7a2 2 0 104 0 2 2 0 10-4 0M6 17a2 2 0 104 0 2 2 0 10-4 0",
  bell: "M6 16V11a6 6 0 0112 0v5l2 2H4z|M10 20a2 2 0 004 0",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M4 6h16M4 12h16M4 18h16",
  zoomIn: "M4 11a7 7 0 1014 0 7 7 0 10-14 0|M20 20l-3.5-3.5M11 8v6M8 11h6",
  zoomOut: "M4 11a7 7 0 1014 0 7 7 0 10-14 0|M20 20l-3.5-3.5M8 11h6",
  undo: "M9 14L4 9l5-5|M4 9h10a6 6 0 010 12h-3",
  copy: "M8 8h12v12H8z|M4 16V4h12",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  send: "M4 12l16-8-6 16-3-7z",
  user: "M5 20a7 7 0 0114 0|M8 8a4 4 0 108 0 4 4 0 10-8 0",
  users: "M3 19a6 6 0 0112 0|M6 8a3 3 0 106 0 3 3 0 10-6 0M16 5a3 3 0 010 6M18 19a5 5 0 00-3-4.5",
  play: "M7 4l13 8-13 8z",
  pause: "M8 4v16M16 4v16",
  flag: "M5 21V4h12l-2 4 2 4H5",
  filter: "M4 6h16M7 12h10M10 18h4",
  key: "M15 8a4 4 0 11-3 3.5L4 20h3v-3h3v-3|M16 7h.01",
  mail: "M3 6h18v12H3z|M3 7l9 7 9-7",
  image: "M3 5h18v14H3z|M3 16l5-5 4 4 3-3 6 6|M15 9a1 1 0 102 0 1 1 0 10-2 0",
  table: "M3 5h18v14H3z|M3 10h18M9 5v14",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
  archive: "M4 7h16v4H4z|M5 11v9h14v-9M10 15h4",
  music: "M9 18V6l10-2v12|M5 18a2 2 0 104 0 2 2 0 10-4 0M15 16a2 2 0 104 0 2 2 0 10-4 0",
  doc: "M6 3h12v18H6z|M9 8h6M9 12h6M9 16h4",
  rotate: "M20 11a8 8 0 10-2 6|M20 4v7h-7",
  maximize: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  globe: "M3 12a9 9 0 1018 0 9 9 0 10-18 0|M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  info: "M3 12a9 9 0 1018 0 9 9 0 10-18 0|M12 11v5M12 8h.01",
  logout: "M9 4H5v16h4|M16 8l4 4-4 4M20 12H9",
  redact: "M4 6h16v4H4z|M4 14h10v4H4z",
  video: "M3 6h13v12H3z|M16 10l5-3v10l-5-3",
  cloud: "M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0116 18z",
  edit: "M4 20h4L19 9l-4-4L4 16z",
  pin: "M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
}

export interface IconProps {
  glyph?: string
  size?: number | string
  className?: string
}

export function Icon({ glyph = "file", size = 24, className }: IconProps) {
  const px = Number(size) || 24
  const paths = (ICON_PATHS[glyph] || ICON_PATHS.file || "").split("|")
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flex: "none", display: "block" }}
    >
      {paths.map((d, idx) => (d ? <path key={idx} d={d} /> : null))}
    </svg>
  )
}

export interface GlashusButtonProps {
  label?: string
  variant?: "primary" | "dark" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  icon?: string
  href?: string
  iconOnly?: boolean | string
  onClick?: React.MouseEventHandler<HTMLElement>
  className?: string
  children?: React.ReactNode
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  style?: React.CSSProperties
  "aria-label"?: string
}

export function GlashusButton({
  label = "Button",
  variant = "secondary",
  size = "md",
  icon,
  href,
  iconOnly = false,
  onClick,
  className,
  children,
  type = "button",
  disabled,
  style,
  "aria-label": ariaLabel,
}: GlashusButtonProps) {
  const only = iconOnly === true || iconOnly === "true"
  const iconSize = size === "lg" ? 18 : size === "sm" ? 14 : 16
  const cls = [
    "btn",
    `btn-${size}`,
    `btn-${variant}`,
    only ? "btn-icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ")

  const content = (
    <>
      {icon ? <Icon glyph={icon} size={iconSize} /> : null}
      {!only ? (children ?? <span>{label}</span>) : null}
    </>
  )

  if (href) {
    return (
      <a
        href={resolveBoardHref(href)}
        className={cls}
        aria-label={ariaLabel ?? (only ? label : undefined)}
        onClick={onClick}
        style={style}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type={type}
      className={cls}
      aria-label={ariaLabel ?? (only ? label : undefined)}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {content}
    </button>
  )
}

export { GlashusButton as Button }

export interface ChipProps {
  label?: string
  tone?: "neutral" | "accent" | "dark" | "clear"
  icon?: string
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}

export function Chip({
  label = "Label",
  tone = "neutral",
  icon,
  className,
  children,
  style,
}: ChipProps) {
  const cls = ["chip", `chip-${tone}`, className ?? ""].filter(Boolean).join(" ")
  return (
    <span className={cls} style={style}>
      {icon ? <Icon glyph={icon} size={12} /> : <span className="dot" aria-hidden="true" />}
      {children ?? label}
    </span>
  )
}

export interface FileTileProps {
  ext?: string
  tone?: 0 | 1 | 2 | "0" | "1" | "2" | number
  size?: number | string
  className?: string
  style?: React.CSSProperties
}

export function FileTile({
  ext = "PDF",
  tone = 0,
  size = 36,
  className,
  style,
}: FileTileProps) {
  const px = Number(size) || 36
  const cls = ["ftile", `ft-${tone}`, className ?? ""].filter(Boolean).join(" ")
  return (
    <div className={cls} style={{ width: px, height: px, ...style }}>
      {ext}
    </div>
  )
}

export interface SegProps {
  options?: string | string[]
  value?: string
  defaultValue?: string
  onChange?: (val: string) => void
  className?: string
  "aria-label"?: string
  style?: React.CSSProperties
}

export function Seg({
  options = "One|Two|Three",
  value,
  defaultValue,
  onChange,
  className,
  "aria-label": ariaLabel = "Options",
  style,
}: SegProps) {
  const opts = React.useMemo(
    () => (Array.isArray(options) ? options : options.split("|")),
    [options]
  )
  const [internal, setInternal] = React.useState<string>(
    defaultValue ?? value ?? opts[0] ?? ""
  )
  const isControlled = value !== undefined && onChange !== undefined
  const current = isControlled ? value : internal

  return (
    <div
      className={["seg", className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
      style={style}
    >
      {opts.map((opt) => {
        const active = opt === current
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            className={active ? "on" : undefined}
            onClick={() => {
              if (!isControlled) setInternal(opt)
              onChange?.(opt)
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export interface GlashusSwitchProps {
  label?: string
  sub?: string
  on?: boolean | string
  defaultOn?: boolean | string
  onChange?: (on: boolean) => void
  className?: string
  style?: React.CSSProperties
}

export function GlashusSwitch({
  label = "Setting",
  sub = "",
  on,
  defaultOn,
  onChange,
  className,
  style,
}: GlashusSwitchProps) {
  const labelId = React.useId()
  const subId = React.useId()
  const init =
    on === true || on === "true" || defaultOn === true || defaultOn === "true"
  const [internalOn, setInternalOn] = React.useState<boolean>(init)
  const isControlled = typeof on === "boolean" && onChange !== undefined
  const checked = isControlled ? on : internalOn

  return (
    <div
      className={["row", className ?? ""].filter(Boolean).join(" ")}
      style={style}
    >
      <div className="grow">
        <div id={labelId} className="sm m">
          {label}
        </div>
        {sub ? (
          <div id={subId} className="xs muted">
            {sub}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={sub ? subId : undefined}
        className={`sw${checked ? " on" : ""}`}
        onClick={() => {
          const next = !checked
          if (!isControlled) setInternalOn(next)
          onChange?.(next)
        }}
      />
    </div>
  )
}

export { GlashusSwitch as Switch }

export interface FieldProps {
  label?: string
  placeholder?: string
  value?: string
  defaultValue?: string
  type?: string
  note?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  className?: string
  id?: string
  name?: string
  autoComplete?: string
  required?: boolean
  spellCheck?: boolean
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>["enterKeyHint"]
  minLength?: number
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  maxLength?: number
  "aria-invalid"?: boolean
  style?: React.CSSProperties
}

export function Field({
  label = "Label",
  placeholder = "",
  value,
  defaultValue,
  type = "text",
  note = "",
  onChange,
  className,
  id,
  name,
  autoComplete,
  required,
  spellCheck,
  enterKeyHint,
  minLength,
  inputMode,
  maxLength,
  "aria-invalid": ariaInvalid,
  style,
}: FieldProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const noteId = `${inputId}-note`
  const isControlled = value !== undefined && onChange !== undefined

  return (
    <div
      className={["field", className ?? ""].filter(Boolean).join(" ")}
      style={style}
    >
      <label htmlFor={inputId} className="xs b">
        {label}
      </label>
      <input
        id={inputId}
        name={name ?? inputId}
        className="input"
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        spellCheck={spellCheck}
        enterKeyHint={enterKeyHint}
        minLength={minLength}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={ariaInvalid}
        aria-describedby={note ? noteId : undefined}
        {...(isControlled
          ? { value, onChange }
          : { defaultValue: value ?? defaultValue ?? "", onChange })}
      />
      {note ? (
        <span id={noteId} className="xs muted">
          {note}
        </span>
      ) : null}
    </div>
  )
}

type SidebarItem =
  | { t: "label"; label: string }
  | {
      t?: undefined
      k: string
      g: string
      label: string
      href: string
      count?: string
    }

const SIDEBAR_ITEMS: SidebarItem[] = [
  { t: "label", label: "Library" },
  { k: "drive", g: "drive", label: "Drive", href: "Main.dc.html" },
  { k: "folders", g: "folder", label: "Folders", href: "Folder.dc.html" },
  { k: "cleanup", g: "archive", label: "Cleanup", href: "Cleanup.dc.html" },
  { k: "trash", g: "trash", label: "Trash", href: "Trash.dc.html" },
  { t: "label", label: "Exposure" },
  {
    k: "shared",
    g: "link",
    label: "Shared by me",
    href: "Shared.dc.html",
  },
  { k: "exposure", g: "graph", label: "Exposure map", href: "Exposure.dc.html" },
  { k: "scan", g: "shield", label: "Scan report", href: "Scan.dc.html" },
  { k: "canaries", g: "flag", label: "Canaries", href: "Canaries.dc.html" },
  { k: "activity", g: "pulse", label: "Activity", href: "Activity.dc.html" },
  { t: "label", label: "AI" },
  { k: "ask", g: "sparkle", label: "Ask my files", href: "Ask.dc.html" },
  { k: "ailog", g: "clock", label: "AI access log", href: "AILog.dc.html" },
  { k: "export", g: "copy", label: "AI-safe export", href: "Export.dc.html" },
]

export interface SidebarProps {
  active?: string
  className?: string
  storageText?: string
  storagePercent?: number
  sharedCount?: number
  userEmail?: string | null
  onSignOut?: () => void
}

export function Sidebar({
  active = "drive",
  className,
  storageText = "0 B of 10 GB",
  storagePercent = 0,
  sharedCount,
  userEmail,
  onSignOut,
}: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      className={["glass", className ?? ""].filter(Boolean).join(" ")}
      style={{
        width: 248,
        minHeight: 868,
        borderRadius: 22,
        padding: "22px 12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <a
        href={resolveBoardHref("Main.dc.html")}
        className="row"
        style={{ padding: "0 10px 14px", gap: 10 }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.35))",
            border: "1px solid rgba(17,17,17,0.12)",
            boxShadow: "inset 0 -6px 10px rgba(17,17,17,0.06)",
            position: "relative",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              right: 4,
              bottom: 4,
              width: 7,
              height: 7,
              borderRadius: 7,
              background: "var(--accent)",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Glashus
        </span>
      </a>

      {SIDEBAR_ITEMS.map((item, idx) =>
        item.t === "label" ? (
          <div key={`lbl-${idx}`} className="navlabel">
            {item.label}
          </div>
        ) : (
          <a
            key={item.k}
            href={resolveBoardHref(item.href)}
            className={`nav${item.k === active ? " on" : ""}`}
            aria-current={item.k === active ? "page" : undefined}
          >
            <Icon glyph={item.g} size={16} />
            <span className="grow">{item.label}</span>
            {item.k === "shared" && sharedCount !== undefined && sharedCount > 0 ? (
              <span className="xs muted">{sharedCount}</span>
            ) : item.count ? (
              <span className="xs muted">{item.count}</span>
            ) : null}
          </a>
        )
      )}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 12,
        }}
      >
        <a
          href={resolveBoardHref("Settings.dc.html")}
          className={`nav${active === "settings" ? " on" : ""}`}
          aria-current={active === "settings" ? "page" : undefined}
        >
          <Icon glyph="sliders" size={16} />
          <span className="grow">Settings</span>
        </a>
        {onSignOut ? (
          <button
            type="button"
            className="nav"
            onClick={onSignOut}
            style={{
              border: 0,
              background: "transparent",
              textAlign: "left",
              width: "100%",
              cursor: "pointer",
            }}
          >
            <Icon glyph="logout" size={16} />
            <span className="grow ell">{userEmail || "Sign out"}</span>
          </button>
        ) : null}
        <div
          className="glass-soft"
          style={{
            borderRadius: 14,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="row between xs muted">
            <span>Storage</span>
            <span>{storageText}</span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.min(100, Math.max(0, storagePercent))}%` }} />
          </div>
        </div>
      </div>
    </nav>
  )
}

export interface PageHeadProps {
  title?: string
  sub?: string
  cta?: string
  ctaIcon?: string
  ctaHref?: string
  onCtaClick?: React.MouseEventHandler<HTMLElement>
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export function PageHead({
  title = "Title",
  sub = "",
  cta = "Upload",
  ctaIcon = "upload",
  ctaHref,
  onCtaClick,
  searchValue,
  onSearchChange,
}: PageHeadProps) {
  const searchId = React.useId()
  const hasCta = cta !== "none"
  const resolvedCtaHref =
    ctaHref ??
    (onCtaClick
      ? undefined
      : cta === "Upload"
        ? "Upload.dc.html"
        : cta === "New link"
          ? "Share.dc.html"
          : undefined)

  return (
    <header className="row wrap between" style={{ gap: 16 }}>
      <div className="col" style={{ gap: 4 }}>
        <h1 className="h1">{title}</h1>
        {sub ? (
          <p className="p muted" style={{ margin: 0 }}>
            {sub}
          </p>
        ) : null}
      </div>
      <div className="row">
        <label
          htmlFor={searchId}
          className="glass row"
          style={{
            width: 300,
            maxWidth: "100%",
            height: 40,
            padding: "0 12px",
            borderRadius: 10,
            color: "var(--ink3)",
            fontSize: 14,
            gap: 8,
          }}
        >
          <Icon glyph="search" size={15} />
          <span className="visually-hidden">Search or run a command</span>
          <input
            id={searchId}
            type="text"
            placeholder="Search or run a command"
            {...(onSearchChange
              ? {
                  value: searchValue ?? "",
                  onChange: (e) => onSearchChange(e.target.value),
                }
              : { defaultValue: searchValue ?? "" })}
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--ink)",
            }}
          />
          <span className="kbd" aria-hidden="true">
            ⌘K
          </span>
        </label>
        {hasCta ? (
          <GlashusButton
            label={cta}
            variant="dark"
            size="md"
            icon={ctaIcon}
            href={resolvedCtaHref}
            onClick={onCtaClick}
          />
        ) : null}
      </div>
    </header>
  )
}

export { resolveBoardHref }
