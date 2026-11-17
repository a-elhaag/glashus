# Glashus design reference

Live canvas (click Play on interactive boards): https://claude.ai/artifact/FkgK3Ks6ySZHFcwDET2pPu

## What is here

- `tokens.css` — the design tokens as Tailwind v4 `@theme` plus `glass`, `glass-soft`, `glass-menu`, `scrim` and `bg-glashus` utilities. Paste into `packages/ui/src/styles/globals.css`.
- `boards/*.dc.html` — the source of every screen (26 screens + Kit, Motion, Shortcuts).
- `boards/components/*.dc.html` — the shared components: Icon, Button, Chip, FileTile, Seg, Switch, Field, Sidebar, PageHead.

## How to use the boards when coding

These files are reference, not app code. They only render inside the canvas, so open the live link to see them.

1. Open the board for your screen and read its markup between `<x-dc>` and `</x-dc>`.
2. Copy the layout and the inline styles, then convert them to Tailwind classes.
3. Replace each `<dc-import name="Button" …>` with the real component from `packages/ui`.
4. The logic in the `<script type="text/x-dc">` block (state, handlers) shows the intended behaviour, such as Folder's right-click, list/grid, drag and drop and shortcuts.

| Board | Owner |
| --- | --- |
| Main, Folder, Upload, Trash, Settings | Part A |
| Kit, components/*, Viewer, Palette, Motion, Shortcuts | Part B |
| Share, Recipient, Scan, Shared | Part C |
| Auth, Onboarding, Landing, NotFound, Terms, Privacy, Ask, AILog, Activity, Exposure, Export, Cleanup, States | Part D |

## Rules that must survive into code

- One accent (teal `#0F766E`), used only for exposure, sensitive findings and the single primary action per view.
- Button heights 32 / 40 / 48. Icon buttons square at the same heights.
- Motion under 280 ms, no bounce, only opacity and transform; respect reduced motion.
- Every destructive or moving action shows a toast with Undo.
- Right-click menu only on files, folders and empty drive space; Shift + right-click keeps the browser menu.
