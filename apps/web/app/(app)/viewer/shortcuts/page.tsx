import { Icon } from "@workspace/ui/components/glashus"

interface ShortcutEntry {
  label: string
  keys: readonly string[]
}

const SHORTCUT_GROUPS: readonly {
  title: string
  items: readonly ShortcutEntry[]
}[] = [
  {
    title: "Navigate",
    items: [
      { label: "Search and commands", keys: ["⌘", "K"] },
      { label: "Move selection", keys: ["↑", "↓"] },
      { label: "Extend selection", keys: ["⇧", "↑ ↓"] },
      { label: "Select all", keys: ["⌘", "A"] },
      { label: "Open", keys: ["↵"] },
      { label: "Quick look", keys: ["Space"] },
      { label: "Go to Drive", keys: ["G", "D"] },
      { label: "Go to Shared by me", keys: ["G", "S"] },
    ],
  },
  {
    title: "Act on files",
    items: [
      { label: "Share", keys: ["S"] },
      { label: "Rename", keys: ["F2"] },
      { label: "Move to trash", keys: ["⌫"] },
      { label: "Undo last action", keys: ["⌘", "Z"] },
      { label: "New folder", keys: ["N"] },
      { label: "Upload", keys: ["U"] },
      { label: "Copy link", keys: ["⌘", "⇧", "C"] },
    ],
  },
  {
    title: "View",
    items: [
      { label: "List or grid", keys: ["V"] },
      { label: "Toggle details panel", keys: ["I"] },
      { label: "Show shortcuts", keys: ["?"] },
      { label: "Close menu or dialog", keys: ["esc"] },
    ],
  },
]

const RULE_SECTIONS: readonly {
  title: string
  rules: readonly string[]
}[] = [
  {
    title: "Right-click rules",
    rules: [
      "Our menu opens on files, folders and empty drive space only.",
      "Text fields, selected text and links keep the browser menu.",
      "Shift + right-click always opens the browser menu.",
      "The same menu opens from the ⋯ button and from long-press on touch.",
      "Right-clicking an unselected file selects it first. A selected group stays selected.",
      "Destructive items sit last, after a divider, in the accent color.",
    ],
  },
  {
    title: "Drag and drop rules",
    rules: [
      "Drag files onto a folder, a breadcrumb or a sidebar item to move them.",
      "Drag from the desktop onto any drive page to upload. The whole page becomes the target.",
      "Dragging a selected file drags the whole selection, with a count badge.",
      "Every move shows a toast with Undo for 5 seconds.",
      "Dropping onto Trash asks nothing. Undo is the safety net.",
      "Everything draggable also has a menu command, for keyboard and touch users.",
    ],
  },
]

export default function ShortcutsPage() {
  return (
    <div
      className="plain col"
      style={{ minHeight: "100vh", padding: 40, gap: 24 }}
    >
      <div className="col" style={{ gap: 4 }}>
        <h1 className="h1">Keyboard, right-click and drag</h1>
        <p className="p muted" style={{ margin: 0, maxWidth: 680 }}>
          Single letters act on the selection. Browser shortcuts are never taken
          over. Every shortcut is also shown next to its command in the
          right-click menu.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        {SHORTCUT_GROUPS.map((group) => (
          <section
            key={group.title}
            className="glass card col"
            style={{ gap: 4 }}
          >
            <h2 className="h2" style={{ marginBottom: 8 }}>
              {group.title}
            </h2>
            {group.items.map((item) => (
              <div
                key={item.label}
                className="row between sm"
                style={{
                  padding: "9px 0",
                  borderTop: "1px solid rgba(17,17,17,0.07)",
                }}
              >
                <span>{item.label}</span>
                <span className="row" style={{ gap: 4 }}>
                  {item.keys.map((keyLabel) => (
                    <span key={keyLabel} className="kbd">
                      {keyLabel}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {RULE_SECTIONS.map((section) => (
          <section
            key={section.title}
            className="glass card col"
            style={{ gap: 10 }}
          >
            <h2 className="h2">{section.title}</h2>
            {section.rules.map((rule) => (
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
        ))}
      </div>
    </div>
  )
}
