"use client"

import * as React from "react"
import {
  Button,
  Field,
  Icon,
  PageHead,
  Seg,
  Sidebar,
  Switch,
} from "@workspace/ui/components/glashus"

type ConsentLevel = "Off" | "Ask" | "Allow"
type SettingsSectionId =
  | "account"
  | "ai-consent"
  | "notifications"
  | "security"
  | "data"

type FolderConsentItem = {
  id: string
  name: string
  value: ConsentLevel
}

type ToastState = {
  msg: string
  undo?: () => void
} | null

const NAV_ITEMS: Array<{
  id: SettingsSectionId
  label: string
  icon: string
}> = [
  { id: "account", label: "Account", icon: "user" },
  { id: "ai-consent", label: "AI consent", icon: "sparkle" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "data", label: "Data and export", icon: "download" },
]

const INITIAL_FOLDERS: FolderConsentItem[] = [
  { id: "personal", name: "Personal", value: "Off" },
  { id: "finance", name: "Finance", value: "Ask" },
  { id: "thesis", name: "Thesis", value: "Allow" },
  { id: "shared", name: "Shared", value: "Ask" },
]

export default function SettingsPage() {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [activeNav, setActiveNav] =
    React.useState<SettingsSectionId>("ai-consent")
  const [search, setSearch] = React.useState("")

  // AI consent per folder
  const [folders, setFolders] =
    React.useState<FolderConsentItem[]>(INITIAL_FOLDERS)

  // Notification switches
  const [massAlerts, setMassAlerts] = React.useState(true)
  const [canaryAlerts, setCanaryAlerts] = React.useState(true)
  const [weeklySummary, setWeeklySummary] = React.useState(false)

  // Account fields
  const [displayName, setDisplayName] = React.useState("Anas Abuelhaag")
  const [alertEmail, setAlertEmail] = React.useState("anas@glashus.dev")

  // Security controls
  const [requirePinOnPublic, setRequirePinOnPublic] = React.useState(true)
  const [defaultExpiryDays, setDefaultExpiryDays] = React.useState("7")
  const [vaultHint, setVaultHint] = React.useState("First lab notebook")

  // Delete account modal
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")

  const [toast, setToast] = React.useState<ToastState>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (!deleteOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleteOpen(false)
        setDeleteConfirmText("")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [deleteOpen])

  const showToast = React.useCallback((msg: string, undo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, undo })
    timerRef.current = setTimeout(() => {
      setToast(null)
    }, 5000)
  }, [])

  const updateFolderConsent = React.useCallback(
    (folderId: string, nextVal: string) => {
      if (nextVal !== "Off" && nextVal !== "Ask" && nextVal !== "Allow") return
      const prev = folders
      const target = prev.find((f) => f.id === folderId)
      if (!target || target.value === nextVal) return
      setFolders(
        prev.map((f) => (f.id === folderId ? { ...f, value: nextVal } : f))
      )
      showToast(`AI consent for ${target.name} set to ${nextVal}`, () => {
        setFolders(prev)
        setToast(null)
      })
    },
    [folders, showToast]
  )

  const toggleSwitch = React.useCallback(
    (
      label: string,
      current: boolean,
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      next: boolean
    ) => {
      setter(next)
      showToast(`${label} turned ${next ? "on" : "off"}`, () => {
        setter(current)
        setToast(null)
      })
    },
    [showToast]
  )

  const handleSaveAccount = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const cleanName = displayName.trim() || "Anas Abuelhaag"
      const cleanEmail = alertEmail.trim() || "anas@glashus.dev"
      setDisplayName(cleanName)
      setAlertEmail(cleanEmail)
      showToast("Account details saved")
    },
    [displayName, alertEmail, showToast]
  )

  const handleSaveSecurity = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const parsed = Number.parseInt(defaultExpiryDays, 10)
      const safeDays =
        Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "7"
      setDefaultExpiryDays(safeDays)
      showToast(`Default link expiry set to ${safeDays} days`)
    },
    [defaultExpiryDays, showToast]
  )

  const query = search.trim().toLowerCase()
  const matchesSection = React.useCallback(
    (keywords: string) => !query || keywords.toLowerCase().includes(query),
    [query]
  )

  const showAiConsent = matchesSection(
    "ai consent gemini folder masking personal finance thesis shared off ask allow"
  )
  const showNotifications = matchesSection(
    "notifications alerts mass-change canary triggers weekly exposure summary email push"
  )
  const showAccount = matchesSection(
    "account profile display name alert email"
  )
  const showSecurity = matchesSection(
    "security pin public links default link expiry vault passphrase hint"
  )
  const showData = matchesSection(
    "your data export all data zip delete account"
  )

  const anySectionVisible =
    showAiConsent ||
    showNotifications ||
    showAccount ||
    showSecurity ||
    showData

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <Sidebar active="settings" />
      <main className="main">
        <PageHead
          title="Settings"
          sub="Account, AI consent, alerts and your data"
          cta="none"
          ctaIcon="upload"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <nav
            className="glass col"
            style={{
              flex: "0 0 220px",
              borderRadius: 20,
              padding: 10,
              gap: 2,
              alignSelf: "flex-start",
            }}
            aria-label="Settings"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`nav${activeNav === item.id ? " on" : ""}`}
                aria-current={activeNav === item.id ? "location" : undefined}
                onClick={() => setActiveNav(item.id)}
              >
                <Icon glyph={item.icon} size={16} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div
            className="col"
            style={{ flex: "1 1 560px", minWidth: 0, gap: 16 }}
          >
            {showAiConsent ? (
              <section
                id="ai-consent"
                className="glass card col"
                style={{ gap: 6 }}
              >
                <h2 className="h2">AI consent</h2>
                <p className="p muted" style={{ margin: "0 0 8px" }}>
                  Choose what Gemini may read, per folder. Masking is always on.
                </p>

                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="row wrap"
                    style={{ padding: "10px 0", gap: 12 }}
                  >
                    <Icon glyph="folder" size={16} />
                    <span className="grow sm m">{folder.name}</span>
                    <Seg
                      options="Off|Ask|Allow"
                      value={folder.value}
                      onChange={(val) => updateFolderConsent(folder.id, val)}
                      aria-label={`AI consent for ${folder.name}`}
                    />
                  </div>
                ))}
              </section>
            ) : null}

            {showNotifications ? (
              <section
                id="notifications"
                className="glass card col"
                style={{ gap: 14 }}
              >
                <h2 className="h2">Notifications</h2>
                <Switch
                  label="Mass-change alerts"
                  sub="Email me when many files change at once"
                  on={massAlerts}
                  onChange={(next) =>
                    toggleSwitch(
                      "Mass-change alerts",
                      massAlerts,
                      setMassAlerts,
                      next
                    )
                  }
                />
                <Switch
                  label="Canary triggers"
                  sub="Push and email"
                  on={canaryAlerts}
                  onChange={(next) =>
                    toggleSwitch(
                      "Canary triggers",
                      canaryAlerts,
                      setCanaryAlerts,
                      next
                    )
                  }
                />
                <Switch
                  label="Weekly exposure summary"
                  sub="Every Monday"
                  on={weeklySummary}
                  onChange={(next) =>
                    toggleSwitch(
                      "Weekly exposure summary",
                      weeklySummary,
                      setWeeklySummary,
                      next
                    )
                  }
                />
              </section>
            ) : null}

            {showAccount ? (
              <section id="account" className="glass card col" style={{ gap: 14 }}>
                <div className="col" style={{ gap: 2 }}>
                  <h2 className="h2">Account</h2>
                  <p className="p muted" style={{ margin: 0 }}>
                    Identity and alert contact details for your Drive.
                  </p>
                </div>
                <form className="col" style={{ gap: 14 }} onSubmit={handleSaveAccount}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="Display name"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                    />
                    <Field
                      label="Alert email"
                      type="email"
                      placeholder="you@example.com"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      autoComplete="email"
                      note="Canary triggers and weekly summaries go here."
                    />
                  </div>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <Button
                      type="submit"
                      label="Save account"
                      variant="secondary"
                      size="sm"
                      icon="check"
                    />
                  </div>
                </form>
              </section>
            ) : null}

            {showSecurity ? (
              <section id="security" className="glass card col" style={{ gap: 14 }}>
                <div className="col" style={{ gap: 2 }}>
                  <h2 className="h2">Security</h2>
                  <p className="p muted" style={{ margin: 0 }}>
                    Link defaults and Vault passphrase reminder.
                  </p>
                </div>
                <Switch
                  label="Require PIN on public links"
                  sub="Adds a 4-digit PIN by default when creating new links"
                  on={requirePinOnPublic}
                  onChange={(next) =>
                    toggleSwitch(
                      "Require PIN on public links",
                      requirePinOnPublic,
                      setRequirePinOnPublic,
                      next
                    )
                  }
                />
                <form className="col" style={{ gap: 14 }} onSubmit={handleSaveSecurity}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="Default link expiry (days)"
                      type="number"
                      inputMode="numeric"
                      value={defaultExpiryDays}
                      onChange={(e) => setDefaultExpiryDays(e.target.value)}
                      note="Applies to new links unless changed in the share sheet."
                    />
                    <Field
                      label="Vault passphrase hint"
                      placeholder="Optional reminder"
                      value={vaultHint}
                      onChange={(e) => setVaultHint(e.target.value)}
                      note="Never write your actual passphrase here."
                    />
                  </div>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <Button
                      type="submit"
                      label="Update security"
                      variant="secondary"
                      size="sm"
                      icon="shield"
                    />
                  </div>
                </form>
              </section>
            ) : null}

            {showData ? (
              <section
                id="data"
                className="glass card row wrap between"
                style={{ gap: 14 }}
              >
                <div className="col" style={{ gap: 2 }}>
                  <h2 className="h2">Your data</h2>
                  <span className="sm muted">
                    Download everything as a ZIP, or delete your account.
                  </span>
                </div>
                <div className="row wrap">
                  <Button
                    label="Export all data"
                    variant="secondary"
                    size="md"
                    icon="download"
                    onClick={() =>
                      showToast("Preparing your encrypted Drive archive…")
                    }
                  />
                  <Button
                    label="Delete account"
                    variant="danger"
                    size="md"
                    icon="trash"
                    onClick={() => {
                      setDeleteConfirmText("")
                      setDeleteOpen(true)
                    }}
                  />
                </div>
              </section>
            ) : null}

            {!anySectionVisible ? (
              <div
                className="glass card col center muted"
                style={{ padding: 40, gap: 6 }}
              >
                <span className="h2">No matching settings.</span>
                <span className="sm muted">
                  Clear the search bar to see all sections.
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {deleteOpen ? (
          <div
            className="scrim"
            onClick={() => {
              setDeleteOpen(false)
              setDeleteConfirmText("")
            }}
          >
            <form
              className="glass modal col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return
                setDeleteOpen(false)
                setDeleteConfirmText("")
                showToast(
                  "Account deletion scheduled (30-day grace period)",
                  () => {
                    setToast(null)
                  }
                )
              }}
              style={{
                width: 460,
                maxWidth: "100%",
                borderRadius: 24,
                padding: 24,
                gap: 16,
                background: "rgba(255,255,255,0.84)",
              }}
            >
              <div className="row between">
                <h2 id="delete-account-title" className="h2">
                  Delete account?
                </h2>
                <Button
                  label="Close"
                  variant="ghost"
                  size="sm"
                  icon="x"
                  iconOnly
                  onClick={() => {
                    setDeleteOpen(false)
                    setDeleteConfirmText("")
                  }}
                />
              </div>
              <p className="p">
                Deleting your account destroys your wrapped Cloud KMS data key,
                making every stored chunk unreadable after the 30-day grace
                period.
              </p>
              <Field
                label="Type DELETE to confirm"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setDeleteOpen(false)
                    setDeleteConfirmText("")
                  }}
                />
                <Button
                  type="submit"
                  label="Schedule deletion"
                  variant="danger"
                  size="md"
                  icon="trash"
                  disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                />
              </div>
            </form>
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
      </main>
    </div>
  )
}
