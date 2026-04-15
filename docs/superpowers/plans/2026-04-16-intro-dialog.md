# Intro Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-screen "About" dialog explaining The Block 6's idea, auto-shown on first visit and reachable any time via the header title.

**Architecture:** A new presentational `IntroDialog` component handles rendering and dismissal (Esc / backdrop / button). The dashboard page (`src/app/page.tsx`) owns the `introOpen` state, runs a one-shot mount effect that opens the dialog when `localStorage["block6:hasSeenIntro"]` is not `"true"`, and persists the flag on close. The `Header` component's `<h1>` becomes a button wired to a new `onTitleClick` prop.

**Tech Stack:** TypeScript, React, Next.js (App Router). No new dependencies, no DB changes.

---

## File Structure

```
src/
  app/
    page.tsx                                                              (modify)
  presentation/
    components/
      header/
        header.tsx                                                        (modify)
      intro-dialog/
        intro-dialog.tsx                                                  (create)
docs/
  superpowers/
    specs/
      2026-04-16-intro-dialog-design.md                                   (already exists)
```

No tests are added — the dialog is a small presentational component and the surrounding logic (one localStorage read + one write) is best verified manually. The repo's existing convention is to skip unit tests for presentational components without complex logic.

---

## Task 1: Create the IntroDialog Component

**Files:**
- Create: `src/presentation/components/intro-dialog/intro-dialog.tsx`

- [ ] **Step 1: Create the file with the full component**

Create `src/presentation/components/intro-dialog/intro-dialog.tsx` with this exact content:

```tsx
"use client";

import { useEffect } from "react";

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_ROWS: { color: string; label: string; desc: string }[] = [
  { color: "var(--color-block-core)", label: "Core", desc: "must do" },
  { color: "var(--color-block-rest)", label: "Rest", desc: "recover & recharge" },
  { color: "var(--color-block-buffer)", label: "Buffer", desc: "flex: work or rest" },
  { color: "var(--color-block-general)", label: "General", desc: "everyday tasks" },
];

export function IntroDialog({ open, onClose }: IntroDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-dialog-title"
        style={{
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg, 12px)",
          padding: "24px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h2
          id="intro-dialog-title"
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
            marginBottom: "16px",
          }}
        >
          The Block 6 — Less is More
        </h2>

        <p style={{ marginBottom: "16px", lineHeight: 1.5 }}>
          Each day = 6 blocks of ~2 hours.
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {TYPE_ROWS.map((row) => (
            <li
              key={row.label}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: row.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, minWidth: "72px" }}>
                {row.label}
              </span>
              <span style={{ color: "var(--color-text-secondary)" }}>
                — {row.desc}
              </span>
            </li>
          ))}
        </ul>

        <p
          style={{
            marginBottom: "20px",
            lineHeight: 1.5,
            color: "var(--color-text-secondary)",
          }}
        >
          A day naturally has highs and lows. Naming the rhythm helps you focus.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-accent)",
              color: "var(--color-bg-primary)",
              border: "none",
              borderRadius: "var(--radius-md, 8px)",
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file lints and type-checks in isolation**

```bash
pnpm lint && pnpm type-check
```

Expected: no errors related to `intro-dialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/intro-dialog/intro-dialog.tsx
git commit -m "feat: add IntroDialog component"
```

---

## Task 2: Make the Header Title a Button

**Files:**
- Modify: `src/presentation/components/header/header.tsx`

- [ ] **Step 1: Add `onTitleClick` to `HeaderProps`**

In `src/presentation/components/header/header.tsx`, add a new prop to the `HeaderProps` interface (after `onSignOut?`):

Replace:

```tsx
interface HeaderProps {
  weekStart: Date;
  theme: Theme;
  userEmail: string | null;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToggleTheme: () => void;
  onSignOut?: () => void;
}
```

With:

```tsx
interface HeaderProps {
  weekStart: Date;
  theme: Theme;
  userEmail: string | null;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToggleTheme: () => void;
  onSignOut?: () => void;
  onTitleClick: () => void;
}
```

- [ ] **Step 2: Destructure `onTitleClick` in the function signature**

Replace:

```tsx
export function Header({
  weekStart,
  theme,
  userEmail,
  onPreviousWeek,
  onNextWeek,
  onToggleTheme,
  onSignOut,
}: HeaderProps) {
```

With:

```tsx
export function Header({
  weekStart,
  theme,
  userEmail,
  onPreviousWeek,
  onNextWeek,
  onToggleTheme,
  onSignOut,
  onTitleClick,
}: HeaderProps) {
```

- [ ] **Step 3: Replace the `<h1>` with a `<button>` styled identically**

Find this block:

```tsx
      <h1
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-accent)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        The Block 6
      </h1>
```

Replace with:

```tsx
      <button
        type="button"
        onClick={onTitleClick}
        aria-label="About The Block 6"
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-accent)",
          whiteSpace: "nowrap",
          flexShrink: 0,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "inherit",
        }}
      >
        The Block 6
      </button>
```

(The redundant `fontSize`/`fontWeight` are kept after `font: "inherit"` because they explicitly override inherited values to match the previous `<h1>`.)

- [ ] **Step 4: Run lint and type-check**

```bash
pnpm lint && pnpm type-check
```

Expected: type-check fails because callers of `<Header />` don't pass `onTitleClick` yet. That's intentional — Task 3 fixes it. **Do not commit yet.**

---

## Task 3: Wire Up Dialog State in the Dashboard

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the import for `IntroDialog`**

In `src/app/page.tsx`, add this import after the other component imports (just below the `CopyLastWeekBanner` import on line 17):

```tsx
import { IntroDialog } from "@/presentation/components/intro-dialog/intro-dialog";
```

- [ ] **Step 2: Add the `INTRO_STORAGE_KEY` constant**

Above the `formatDateKey` function (around line 23, just below the `Selection` type), add:

```tsx
const INTRO_STORAGE_KEY = "block6:hasSeenIntro";
```

- [ ] **Step 3: Add `introOpen` state and the mount effect**

Inside `DashboardPage`, after the existing `useState` declarations (around line 94, after `const [isCopying, setIsCopying] = useState(false);`), add:

```tsx
  const [introOpen, setIntroOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(INTRO_STORAGE_KEY) !== "true") {
      setIntroOpen(true);
    }
  }, []);

  const closeIntro = () => {
    setIntroOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(INTRO_STORAGE_KEY, "true");
    }
  };
```

- [ ] **Step 4: Pass `onTitleClick` to `<Header />`**

Find the `<Header ... />` block (around lines 215–223) and add the `onTitleClick` prop. Replace:

```tsx
      <Header
        weekStart={weekStart}
        theme={theme}
        userEmail={user?.email ?? null}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
      />
```

With:

```tsx
      <Header
        weekStart={weekStart}
        theme={theme}
        userEmail={user?.email ?? null}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
        onTitleClick={() => setIntroOpen(true)}
      />
```

- [ ] **Step 5: Mount `<IntroDialog />` in the JSX tree**

The `<IntroDialog />` should be rendered inside the outermost `<div>` so it overlays everything. The cleanest spot is right after the closing `</div>` of the floating-checklist block, just before the final `</div>` that closes the page wrapper.

Find the very end of the return statement:

```tsx
      {user && (
        <div className="desktop-only">
          <FloatingChecklistButton
            tasks={weeklyTasks}
            completedIds={weeklyCompletions[weekKey] ?? new Set()}
            onAdd={addWeeklyTask}
            onEdit={editWeeklyTask}
            onToggle={(id) => toggleWeeklyTaskCompletion(id, weekKey)}
            onDisable={disableWeeklyTask}
            onReorder={reorderWeeklyTasks}
            rightOffset={selection ? "336px" : "16px"}
          />
        </div>
      )}
    </div>
  );
}
```

Replace with:

```tsx
      {user && (
        <div className="desktop-only">
          <FloatingChecklistButton
            tasks={weeklyTasks}
            completedIds={weeklyCompletions[weekKey] ?? new Set()}
            onAdd={addWeeklyTask}
            onEdit={editWeeklyTask}
            onToggle={(id) => toggleWeeklyTaskCompletion(id, weekKey)}
            onDisable={disableWeeklyTask}
            onReorder={reorderWeeklyTasks}
            rightOffset={selection ? "336px" : "16px"}
          />
        </div>
      )}
      <IntroDialog open={introOpen} onClose={closeIntro} />
    </div>
  );
}
```

- [ ] **Step 6: Run all checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 7: Manual verification**

```bash
pnpm dev
```

Then in the browser:

1. Open DevTools → Application → Local Storage → delete `block6:hasSeenIntro` if present.
2. Reload `http://localhost:3000`. → IntroDialog opens automatically.
3. Click "Got it". → Dialog closes. Reload. → Dialog does NOT re-open.
4. Click the "The Block 6" title in the header. → Dialog opens.
5. Press `Escape`. → Dialog closes.
6. Open it again, then click outside the dialog box on the backdrop. → Dialog closes.
7. Verify the four bullets show colored dots in green / yellow / red / gray (or matching the theme).
8. Toggle dark/light theme — colors and contrast should remain readable.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/components/header/header.tsx src/app/page.tsx
git commit -m "feat: trigger IntroDialog from header title with first-visit auto-open"
```

---

## Task 4: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/intro-dialog
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: add intro dialog explaining The Block 6" --body "$(cat <<'EOF'
## Summary

- New `IntroDialog` component: single-screen explanation of The Block 6's four block types
- Auto-opens on first visit (per-browser via `localStorage["block6:hasSeenIntro"]`)
- Reachable any time by clicking the "The Block 6" title in the header
- Closes on backdrop click, Escape key, or "Got it" button

## Test plan

- [ ] Clear `block6:hasSeenIntro` in localStorage → reload → dialog opens
- [ ] Click "Got it" → reload → dialog stays closed
- [ ] Click header title → dialog opens
- [ ] Esc, backdrop, and "Got it" all close the dialog
- [ ] Block-type dots show the correct colors in both dark and light themes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Trigger via header title click — Task 2 (button) + Task 3 Step 4 (handler) ✓
- First-visit auto-open via localStorage flag — Task 3 Step 3 ✓
- Persist flag on any close path — Task 3 Step 3 (`closeIntro` writes the flag; passed to `<IntroDialog onClose={closeIntro} />`) ✓
- Single-screen content with title, four type bullets, rhythm note, "Got it" button — Task 1 Step 1 ✓
- Block-type accent colors via existing CSS variables — Task 1 Step 1 (uses `--color-block-core/rest/buffer/general`) ✓
- Backdrop click, Escape, and button all close — Task 1 Step 1 (Escape listener + backdrop `onClick` + button `onClick`) ✓
- No close "X" icon, single primary action — Task 1 Step 1 (only "Got it") ✓
- localStorage key `block6:hasSeenIntro` — Task 3 Step 2 ✓
- Files affected match spec — `intro-dialog.tsx` (Task 1), `header.tsx` (Task 2), `page.tsx` (Task 3) ✓

### 2. Placeholder scan

No TBD / TODO / vague references. All code blocks contain complete, runnable code. No "similar to Task N" references — Task 3 repeats the surrounding context where edits are made.

### 3. Type consistency

- `IntroDialogProps { open: boolean; onClose: () => void }` defined in Task 1, used in Task 3 Step 5 with matching props ✓
- `onTitleClick: () => void` defined in Task 2 Step 1, passed in Task 3 Step 4 with matching `() => setIntroOpen(true)` signature ✓
- `INTRO_STORAGE_KEY` defined once in Task 3 Step 2, referenced in the same task's effect and close handler ✓
- `closeIntro` is the same single function passed as `onClose` to `<IntroDialog />` ✓

All checks pass.
