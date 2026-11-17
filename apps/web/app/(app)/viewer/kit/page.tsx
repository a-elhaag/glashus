"use client"

import * as React from "react"
import {
  Button,
  Chip,
  Field,
  FileTile,
  Seg,
  Switch,
} from "@workspace/ui/components/glashus"

const BUTTON_VARIANTS = [
  "primary",
  "dark",
  "secondary",
  "ghost",
  "danger",
] as const

const CHIPS: readonly {
  label: string
  tone: "clear" | "neutral" | "accent" | "dark"
  icon?: string
}[] = [
  { label: "Private", tone: "clear" },
  { label: "Shared", tone: "neutral" },
  { label: "Public", tone: "accent" },
  { label: "Redacted copy", tone: "accent", icon: "shield" },
  { label: "Current", tone: "dark" },
]

const FILE_TILES = [
  { ext: "PDF", tone: 0 },
  { ext: "DOC", tone: 1 },
  { ext: "ZIP", tone: 2 },
  { ext: "PNG", tone: 0 },
] as const

export default function KitPage() {
  const [period, setPeriod] = React.useState("Week")
  const [switchOn, setSwitchOn] = React.useState(true)
  const [fieldValue, setFieldValue] = React.useState("")

  return (
    <div
      className="plain col"
      style={{ minHeight: "100vh", padding: 40, gap: 28 }}
    >
      <div className="col" style={{ gap: 4 }}>
        <h1 className="h1">Glashus components</h1>
        <p className="p muted" style={{ margin: 0 }}>
          Built once, reused on every screen. Button heights follow the 8-point
          grid: 32, 40, 48. One accent color, set in one place.
        </p>
      </div>

      <section className="glass card col" style={{ gap: 16 }}>
        <h2 className="h2">Button</h2>
        {BUTTON_VARIANTS.map((variant) => (
          <div key={variant} className="row wrap" style={{ gap: 12 }}>
            <span className="xs b muted" style={{ width: 90 }}>
              {variant}
            </span>
            <Button label="Small" variant={variant} size="sm" icon="plus" />
            <Button label="Medium" variant={variant} size="md" icon="plus" />
            <Button label="Large" variant={variant} size="lg" icon="plus" />
            <Button
              label="Icon"
              variant={variant}
              size="md"
              icon="share"
              iconOnly
            />
          </div>
        ))}
        <div className="row wrap" style={{ gap: 12 }}>
          <span className="xs b muted" style={{ width: 90 }}>
            Icon only
          </span>
          <Button
            label="Small"
            variant="secondary"
            size="sm"
            icon="share"
            iconOnly
          />
          <Button
            label="Medium"
            variant="secondary"
            size="md"
            icon="share"
            iconOnly
          />
          <Button
            label="Large"
            variant="secondary"
            size="lg"
            icon="share"
            iconOnly
          />
        </div>
        <p className="xs muted" style={{ margin: 0 }}>
          Small 32 for tables and toolbars. Medium 40 is the default. Large 48
          for hero and mobile actions. Icon buttons are square at the same
          sizes.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="glass card col" style={{ gap: 14 }}>
          <h2 className="h2">Chip and file tile</h2>
          <div className="row wrap" style={{ gap: 10 }}>
            {CHIPS.map((chip) => (
              <Chip
                key={chip.label}
                label={chip.label}
                tone={chip.tone}
                icon={chip.icon}
              />
            ))}
          </div>
          <div className="row" style={{ gap: 12 }}>
            {FILE_TILES.map((tile) => (
              <FileTile
                key={tile.ext}
                ext={tile.ext}
                tone={tile.tone}
                size={44}
              />
            ))}
          </div>
        </section>

        <section className="glass card col" style={{ gap: 14 }}>
          <h2 className="h2">Tabs, switch, field</h2>
          <Seg
            options="Day|Week|Month"
            value={period}
            onChange={setPeriod}
            aria-label="Timeframe"
          />
          <Switch
            label="Switch"
            sub="Off or on, 40 by 24"
            on={switchOn}
            onChange={setSwitchOn}
          />
          <Field
            label="Field"
            placeholder="Placeholder"
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            type="text"
            note="Helper text sits under the input"
          />
        </section>
      </div>
    </div>
  )
}
