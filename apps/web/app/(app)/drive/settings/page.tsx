"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Button,
  Field,
  Icon,
  PageHead,
  Seg,
  Switch,
} from "@workspace/ui/components/glashus"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/components/providers"
import { glashusApi } from "@/lib/api"
import { formatBytes } from "@/lib/format"
import type { components } from "@workspace/sdk"
import {
  unwrapApi,
  useFolders,
  useInvalidateDrive,
  useMe,
} from "@/lib/queries"

type ConsentLevel = "Off" | "Ask" | "Allow"
type SettingsSectionId =
  | "account"
  | "ai-consent"
  | "notifications"
  | "security"
  | "data"

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

function consentToUi(consent: "off" | "ask" | "allow"): ConsentLevel {
  if (consent === "allow") return "Allow"
  if (consent === "ask") return "Ask"
  return "Off"
}

function uiToConsent(val: string): "off" | "ask" | "allow" | null {
  if (val === "Off") return "off"
  if (val === "Ask") return "ask"
  if (val === "Allow") return "allow"
  return null
}

export default function SettingsPage() {
  const router = useRouter()
  const { signOutUser } = useAuth()
  const meQuery = useMe()
  const foldersQuery = useFolders()
  const invalidateDrive = useInvalidateDrive()

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeNav, setActiveNav] =
    React.useState<SettingsSectionId>("ai-consent")
  const [search, setSearch] = React.useState("")

  const [displayName, setDisplayName] = React.useState("")
  const [alertEmail, setAlertEmail] = React.useState("")
  const [massAlerts, setMassAlerts] = React.useState(true)
  const [canaryAlerts, setCanaryAlerts] = React.useState(true)
  const [weeklySummary, setWeeklySummary] = React.useState(false)
  const [requirePinOnPublic, setRequirePinOnPublic] = React.useState(true)
  const [defaultExpiryDays, setDefaultExpiryDays] = React.useState("7")
  const [vaultHint, setVaultHint] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!meQuery.data) return
    const u = meQuery.data.user
    setDisplayName(u.name)
    setAlertEmail(u.alertEmail || u.email)
    setMassAlerts(u.massAlerts)
    setCanaryAlerts(u.canaryAlerts)
    setWeeklySummary(u.weeklySummary)
    setRequirePinOnPublic(u.requirePinOnPublic)
    setDefaultExpiryDays(String(u.defaultExpiryDays))
    setVaultHint(u.vaultHint)
  }, [meQuery.data])

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

  const patchSettings = async (
    body: components["schemas"]["UpdateMeRequest"],
    successMsg: string
  ) => {
    setSaving(true)
    try {
      unwrapApi(
        await glashusApi.PATCH("/v1/me", {
          body,
        })
      )
      invalidateDrive()
      showToast(successMsg)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const updateFolderConsent = async (
    folderId: string,
    folderName: string,
    nextVal: string
  ) => {
    const mapped = uiToConsent(nextVal)
    if (!mapped) return
    try {
      unwrapApi(
        await glashusApi.PATCH("/v1/folders/{id}", {
          params: { path: { id: folderId } },
          body: { aiConsent: mapped },
        })
      )
      invalidateDrive()
      showToast(`AI consent for ${folderName} set to ${nextVal}`)
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update folder consent"
      )
    }
  }

  const handleExportAll = async () => {
    try {
      const data = unwrapApi(await glashusApi.GET("/v1/export"))
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `glashus-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      showToast("Export downloaded")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed")
    }
  }

  const query = search.trim().toLowerCase()
  const matchesSection = React.useCallback(
    (keywords: string) => !query || keywords.toLowerCase().includes(query),
    [query]
  )

  const folders = foldersQuery.data ?? []
  const user = meQuery.data?.user
  const usage = meQuery.data?.usage
  const storagePct =
    user && user.storageQuotaBytes > 0
      ? Math.min(100, Math.round((user.bytesUsed / user.storageQuotaBytes) * 100))
      : 0
  const downloadPct =
    usage && usage.downloadCapBytes > 0
      ? Math.min(
          100,
          Math.round((usage.downloadBytes / usage.downloadCapBytes) * 100)
        )
      : 0

  const showAiConsent = matchesSection(
    "ai consent gemini folder masking off ask allow"
  )
  const showNotifications = matchesSection(
    "notifications alerts mass-change canary triggers weekly exposure summary"
  )
  const showAccount = matchesSection(
    "account profile display name alert email storage downloads quota"
  )
  const showSecurity = matchesSection(
    "security pin public links default link expiry vault passphrase hint"
  )
  const showData = matchesSection("your data export json sign out")

  const anySectionVisible =
    showAiConsent ||
    showNotifications ||
    showAccount ||
    showSecurity ||
    showData

  return (
    <div className="app" style={{ minHeight: 900 }}>
      <AppSidebar active="settings" />
      <main className="main">
        <PageHead
          title="Settings"
          sub="Account, AI consent, quotas and your data"
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
                <div className="row between wrap" style={{ gap: 8 }}>
                  <h2 className="h2">AI consent</h2>
                  {user ? (
                    <Seg
                      options="Off|Ask|Allow"
                      value={consentToUi(user.aiMode)}
                      onChange={(val) => {
                        const mode = uiToConsent(val)
                        if (mode) {
                          void patchSettings(
                            { aiMode: mode } as never,
                            `Default AI mode set to ${val}`
                          )
                        }
                      }}
                      aria-label="Global AI mode"
                    />
                  ) : null}
                </div>
                <p className="p muted" style={{ margin: "0 0 8px" }}>
                  Choose what Gemini may read, per folder. Masking is always on.
                </p>

                {folders.length === 0 ? (
                  <span className="sm muted" style={{ padding: "8px 0" }}>
                    Create folders in Drive to set per-folder AI consent.
                  </span>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="row wrap"
                      style={{ padding: "10px 0", gap: 12 }}
                    >
                      <Icon glyph="folder" size={16} />
                      <span className="grow sm m">{folder.name}</span>
                      <Seg
                        options="Off|Ask|Allow"
                        value={consentToUi(folder.aiConsent)}
                        onChange={(val) =>
                          void updateFolderConsent(folder.id, folder.name, val)
                        }
                        aria-label={`AI consent for ${folder.name}`}
                      />
                    </div>
                  ))
                )}
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
                  onChange={(next) => {
                    setMassAlerts(next)
                    void patchSettings(
                      { massAlerts: next } as never,
                      `Mass-change alerts turned ${next ? "on" : "off"}`
                    )
                  }}
                />
                <Switch
                  label="Canary triggers"
                  sub="Push and email"
                  on={canaryAlerts}
                  onChange={(next) => {
                    setCanaryAlerts(next)
                    void patchSettings(
                      { canaryAlerts: next } as never,
                      `Canary alerts turned ${next ? "on" : "off"}`
                    )
                  }}
                />
                <Switch
                  label="Weekly exposure summary"
                  sub="Every Monday"
                  on={weeklySummary}
                  onChange={(next) => {
                    setWeeklySummary(next)
                    void patchSettings(
                      { weeklySummary: next } as never,
                      `Weekly summary turned ${next ? "on" : "off"}`
                    )
                  }}
                />
              </section>
            ) : null}

            {showAccount ? (
              <section id="account" className="glass card col" style={{ gap: 14 }}>
                <div className="col" style={{ gap: 2 }}>
                  <h2 className="h2">Account & Quotas</h2>
                  <p className="p muted" style={{ margin: 0 }}>
                    Live storage, monthly download cap, and alert contact details.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div
                    className="glass-soft col"
                    style={{ borderRadius: 14, padding: 14, gap: 8 }}
                  >
                    <div className="row between xs muted">
                      <span>Storage used</span>
                      <span>
                        {user
                          ? `${formatBytes(user.bytesUsed)} / ${formatBytes(user.storageQuotaBytes)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${storagePct}%` }} />
                    </div>
                  </div>

                  <div
                    className="glass-soft col"
                    style={{ borderRadius: 14, padding: 14, gap: 8 }}
                  >
                    <div className="row between xs muted">
                      <span>Downloads ({usage?.month ?? "month"})</span>
                      <span>
                        {usage
                          ? `${formatBytes(usage.downloadBytes)} / ${formatBytes(usage.downloadCapBytes)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="bar acc">
                      <i style={{ width: `${downloadPct}%` }} />
                    </div>
                  </div>
                </div>

                <form
                  className="col"
                  style={{ gap: 14 }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    void patchSettings(
                      {
                        name: displayName.trim() || "Glashus User",
                        alertEmail: alertEmail.trim(),
                      } as never,
                      "Account details saved"
                    )
                  }}
                >
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
                      label={saving ? "Saving…" : "Save account"}
                      variant="secondary"
                      size="sm"
                      icon="check"
                      disabled={saving}
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
                  onChange={(next) => {
                    setRequirePinOnPublic(next)
                    void patchSettings(
                      { requirePinOnPublic: next } as never,
                      `Default public PIN turned ${next ? "on" : "off"}`
                    )
                  }}
                />
                <form
                  className="col"
                  style={{ gap: 14 }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    const parsed = Number.parseInt(defaultExpiryDays, 10)
                    const safeDays =
                      Number.isFinite(parsed) && parsed > 0 ? parsed : 7
                    setDefaultExpiryDays(String(safeDays))
                    void patchSettings(
                      {
                        defaultExpiryDays: safeDays,
                        vaultHint: vaultHint.trim(),
                      } as never,
                      `Security defaults saved (${safeDays} days)`
                    )
                  }}
                >
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
                      label={saving ? "Saving…" : "Update security"}
                      variant="secondary"
                      size="sm"
                      icon="shield"
                      disabled={saving}
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
                    Download your metadata snapshot or sign out of this device.
                  </span>
                </div>
                <div className="row wrap">
                  <Button
                    label="Export all data"
                    variant="secondary"
                    size="md"
                    icon="download"
                    onClick={() => void handleExportAll()}
                  />
                  <Button
                    label="Sign out"
                    variant="danger"
                    size="md"
                    icon="logout"
                    onClick={async () => {
                      await signOutUser()
                      router.replace("/auth")
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

        {toastMsg ? (
          <div role="status" aria-live="polite" className="toast">
            <span>{toastMsg}</span>
          </div>
        ) : null}
      </main>
    </div>
  )
}
