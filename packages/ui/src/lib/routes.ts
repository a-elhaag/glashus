export const BOARD_ROUTES: Record<string, string> = {
  "Landing.dc.html": "/",
  "Auth.dc.html": "/auth",
  "Onboarding.dc.html": "/onboarding",
  "Terms.dc.html": "/terms",
  "Privacy.dc.html": "/privacy",
  "NotFound.dc.html": "/not-found-preview",
  "Main.dc.html": "/drive",
  "Folder.dc.html": "/drive/folders",
  "Upload.dc.html": "/drive/upload",
  "Trash.dc.html": "/drive/trash",
  "Settings.dc.html": "/drive/settings",
  "Viewer.dc.html": "/viewer",
  "Palette.dc.html": "/viewer/palette",
  "Kit.dc.html": "/viewer/kit",
  "Motion.dc.html": "/viewer/motion",
  "Shortcuts.dc.html": "/viewer/shortcuts",
  "Shared.dc.html": "/sharing",
  "Share.dc.html": "/sharing/share",
  "Recipient.dc.html": "/sharing/recipient",
  "Scan.dc.html": "/sharing/scan",
  "Ask.dc.html": "/ai/ask",
  "AILog.dc.html": "/ai/log",
  "Export.dc.html": "/ai/export",
  "Cleanup.dc.html": "/ai/cleanup",
  "Exposure.dc.html": "/ai/exposure",
  "Canaries.dc.html": "/ai/canaries",
  "Activity.dc.html": "/ai/activity",
  "States.dc.html": "/ai/states",
}

export function resolveBoardHref(href?: string): string {
  if (!href) return "#"
  const trimmed = href.trim()
  if (!trimmed) return "#"
  if (trimmed.startsWith("#") || trimmed.startsWith("http") || trimmed.startsWith("mailto:")) {
    return trimmed
  }

  const [rawPath, hash] = trimmed.split("#")
  const fileName = rawPath?.replace(/^\.\//, "") ?? ""
  const mapped = BOARD_ROUTES[fileName]
  if (mapped) {
    return hash ? `${mapped}#${hash}` : mapped
  }

  return trimmed
}
