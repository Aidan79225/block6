# Intro Dialog — Design Spec

## Overview

A single-screen "About" dialog that explains The Block 6's idea in a "less is more" style: minimal copy, one screen, no carousel.

The dialog auto-opens once on a user's first visit, and is reachable any time afterward by clicking the "The Block 6" title in the header.

## Goals

- New users immediately understand the four block types and the daily-rhythm idea
- Returning users can re-open the dialog without hunting for it (title doubles as the trigger)
- The dialog itself embodies "less is more" — one screen, short copy, single dismissal action

## Out of Scope

- i18n / Chinese version (English copy only for this iteration)
- Content versioning (re-show on content updates)
- Animations beyond a simple backdrop fade
- A separate "?" / Help button in the header

---

## Trigger

- The header title `The Block 6` becomes an interactive element (button styled to look like the existing `<h1>`).
  - On hover: cursor changes to pointer.
  - On click: `setIntroOpen(true)`.
- On mount, the dashboard reads `localStorage.getItem("block6:hasSeenIntro")`. If absent or not `"true"`, set `introOpen = true`.
- When the dialog closes (any path), the dashboard writes `localStorage.setItem("block6:hasSeenIntro", "true")`. The first-visit auto-open will not fire again on subsequent loads.

The localStorage key is per-browser and not tied to the user account. Switching accounts or clearing storage will re-trigger the auto-open. This is acceptable — the dialog is informational, not session state.

---

## Dialog Content

```
The Block 6 — Less is More

Each day = 6 blocks of ~2 hours.

● Core    — must do
● Rest    — recover & recharge
● Buffer  — flex: work or rest
● General — everyday tasks

A day naturally has highs and lows.
Naming the rhythm helps you focus.

                                    [ Got it ]
```

The four bullets use the existing block-type accent colors:

| Type    | Color variable / fallback |
|---------|---------------------------|
| Core    | green (`#3fb950` in dark) |
| Rest    | yellow (`#d29922`)        |
| Buffer  | red (`#f85149`)           |
| General | default text color        |

Reuse whatever color helper the rest of the app already uses for block-type swatches (e.g., the same map used in `WeekGrid` cells). Do not hardcode if a helper exists.

---

## Behavior

- Modal overlay: full-viewport translucent backdrop (`rgba(0,0,0,0.5)`), dialog centered, max-width ~480px.
- Close paths (all set `introOpen = false` and persist `hasSeenIntro = "true"`):
  - Click the "Got it" button
  - Click the backdrop (outside the dialog box)
  - Press `Escape`
- The dialog has no close ("X") icon. The single primary action keeps it minimal.
- No animation requirements beyond browser defaults; if a fade is trivial it's fine, but not required.
- Body scroll is not locked — the dialog is short enough that scrolling the page underneath while it's open is harmless.

---

## Components & State

### New: `src/presentation/components/intro-dialog/intro-dialog.tsx`

```tsx
interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
}

export function IntroDialog({ open, onClose }: IntroDialogProps): JSX.Element | null;
```

- Renders `null` when `open` is false.
- Renders a backdrop `<div>` and the dialog box.
- Wires Escape key listener (only while open) and backdrop click to `onClose`.
- Pure presentational; no localStorage access inside.

### Modify: `src/presentation/components/header/header.tsx`

- Add a new prop `onTitleClick: () => void`.
- Replace the static `<h1>` with a `<button>` that:
  - Is styled to match the current `<h1>` (same font, color, weight, no border, transparent background).
  - Has `cursor: pointer` and a focus outline that uses `--color-accent`.
  - Calls `onTitleClick` on click.
- Keep accessibility: the button still reads as "The Block 6" for screen readers.

### Modify: `src/app/page.tsx`

- Add state: `const [introOpen, setIntroOpen] = useState(false);`
- Add a one-shot effect on mount:

```tsx
useEffect(() => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("block6:hasSeenIntro") !== "true") {
    setIntroOpen(true);
  }
}, []);
```

- Define a single close handler:

```tsx
const closeIntro = () => {
  setIntroOpen(false);
  if (typeof window !== "undefined") {
    localStorage.setItem("block6:hasSeenIntro", "true");
  }
};
```

- Pass `onTitleClick={() => setIntroOpen(true)}` to `<Header />`.
- Mount `<IntroDialog open={introOpen} onClose={closeIntro} />` near the top of the dashboard JSX.

The localStorage key is a string constant defined locally in `page.tsx` (or a small `const` near the top) — no separate constants module needed.

---

## Affected Files

| File | Change |
|------|--------|
| `src/presentation/components/intro-dialog/intro-dialog.tsx` | New — the dialog UI |
| `src/presentation/components/header/header.tsx` | Replace `<h1>` with a button, add `onTitleClick` prop |
| `src/app/page.tsx` | `introOpen` state, mount-effect, close handler, render `<IntroDialog />`, pass `onTitleClick` to `<Header />` |

No DB changes. No new dependencies. No new tests required (small presentational component + plumbing); if patterns in the repo include component tests for similar dialogs, follow that convention, otherwise rely on manual verification.

---

## Manual Verification

- Clear localStorage. Reload the dashboard. → IntroDialog opens automatically.
- Click "Got it". → Closes. Reload. → Does not re-open.
- Click the "The Block 6" title in the header. → Opens.
- Press Escape while open. → Closes.
- Click outside the dialog box. → Closes.
- All four bullets show their block-type accent colors.

---

## Branch

`feature/intro-dialog` (already created).
