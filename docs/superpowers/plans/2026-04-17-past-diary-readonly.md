# Past-Day Diary Read-Only View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a side-panel selection points at a past day that has a diary entry, show the diary read-only. Today / yesterday-before-08:00 stays editable. Future days and past days without entries render nothing.

**Architecture:** A new `DiaryReadOnlyView` component renders `bad`/`good`/`next` as plain text. `SidePanel` replaces its `isToday: boolean` prop with `diaryMode: "editable" | "readonly" | "hidden"` and picks the correct diary UI. A new `getDiaryMode(cellDate, now)` helper in `page.tsx` derives the mode, reusing a refactored `isDiaryEditableDay(cellDate, now)`.

**Tech Stack:** TypeScript, React, Next.js, Vitest, React Testing Library. No DB changes, no new dependencies.

**Prerequisite:** Be on branch `feature/past-diary-readonly` (create it before Task 1: `git checkout -b feature/past-diary-readonly`).

---

## File Structure

```
src/
  app/
    page.tsx                                                            (modify)
  presentation/
    components/
      side-panel/
        side-panel.tsx                                                  (modify)
        diary-readonly-view.tsx                                         (create)
  __tests__/
    presentation/
      components/
        diary-readonly-view.test.tsx                                    (create)
        side-panel.test.tsx                                             (create)
```

No domain-layer or repository changes.

---

## Task 1: Build `DiaryReadOnlyView` component (TDD)

**Files:**
- Create: `src/__tests__/presentation/components/diary-readonly-view.test.tsx`
- Create: `src/presentation/components/side-panel/diary-readonly-view.tsx`

- [ ] **Step 1: Write the failing test file**

Create `src/__tests__/presentation/components/diary-readonly-view.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiaryReadOnlyView } from "@/presentation/components/side-panel/diary-readonly-view";

describe("DiaryReadOnlyView", () => {
  it("renders bad, good, next values as plain text", () => {
    render(<DiaryReadOnlyView bad="分心了" good="完成專案" next="明天早點" />);
    expect(screen.getByText("分心了")).toBeInTheDocument();
    expect(screen.getByText("完成專案")).toBeInTheDocument();
    expect(screen.getByText("明天早點")).toBeInTheDocument();
  });

  it("renders em-dash placeholder for empty fields", () => {
    render(<DiaryReadOnlyView bad="" good="完成專案" next="" />);
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
  });

  it("renders the 情緒日記 heading and Bad/Good/Next sub-labels in order", () => {
    render(<DiaryReadOnlyView bad="a" good="b" next="c" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("情緒日記");
    const badIdx = text.indexOf("Bad");
    const goodIdx = text.indexOf("Good");
    const nextIdx = text.indexOf("Next");
    expect(badIdx).toBeGreaterThan(-1);
    expect(goodIdx).toBeGreaterThan(badIdx);
    expect(nextIdx).toBeGreaterThan(goodIdx);
  });

  it("renders no input fields and no buttons", () => {
    render(<DiaryReadOnlyView bad="a" good="b" next="c" />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test src/__tests__/presentation/components/diary-readonly-view.test.tsx
```

Expected: FAIL with "Cannot find module '@/presentation/components/side-panel/diary-readonly-view'" or equivalent.

- [ ] **Step 3: Write the component**

Create `src/presentation/components/side-panel/diary-readonly-view.tsx`:

```tsx
interface DiaryReadOnlyViewProps {
  bad: string;
  good: string;
  next: string;
}

const FIELD_CONFIG: Array<{
  key: "bad" | "good" | "next";
  label: string;
}> = [
  { key: "bad", label: "Bad" },
  { key: "good", label: "Good" },
  { key: "next", label: "Next" },
];

export function DiaryReadOnlyView({
  bad,
  good,
  next,
}: DiaryReadOnlyViewProps) {
  const values = { bad, good, next };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        情緒日記
      </span>
      {FIELD_CONFIG.map(({ key, label }) => (
        <div
          key={key}
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span
            style={{
              color: "var(--color-text-muted)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
          <span
            style={{
              color: "var(--color-text-primary)",
              fontSize: "14px",
            }}
          >
            {values[key] || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test src/__tests__/presentation/components/diary-readonly-view.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/presentation/components/diary-readonly-view.test.tsx src/presentation/components/side-panel/diary-readonly-view.tsx
git commit -m "feat: add DiaryReadOnlyView component"
```

---

## Task 2: Refactor helpers in `page.tsx`

Introduce `getDiaryMode` and change `isDiaryEditableDay` to take a concrete `cellDate`. The `SidePanel` call site keeps using `isToday` for now by deriving it from `getDiaryMode` — nothing else changes, so existing behavior is preserved and all tests continue to pass.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Refactor `isDiaryEditableDay` signature and add `getDiaryMode`**

In `src/app/page.tsx`, find the existing helper:

```typescript
function isDiaryEditableDay(
  weekStart: Date,
  dayOfWeek: number,
  now: Date,
): boolean {
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));

  // Diary day = today if now >= 08:00, else yesterday
  const diaryDay = new Date(now);
  if (diaryDay.getHours() < 8) {
    diaryDay.setDate(diaryDay.getDate() - 1);
  }

  return (
    cellDate.getFullYear() === diaryDay.getFullYear() &&
    cellDate.getMonth() === diaryDay.getMonth() &&
    cellDate.getDate() === diaryDay.getDate()
  );
}
```

Replace the whole block with:

```typescript
type DiaryMode = "editable" | "readonly" | "hidden";

function getCellDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d;
}

function isDiaryEditableDay(cellDate: Date, now: Date): boolean {
  // Diary day = today if now >= 08:00, else yesterday
  const diaryDay = new Date(now);
  if (diaryDay.getHours() < 8) {
    diaryDay.setDate(diaryDay.getDate() - 1);
  }
  return (
    cellDate.getFullYear() === diaryDay.getFullYear() &&
    cellDate.getMonth() === diaryDay.getMonth() &&
    cellDate.getDate() === diaryDay.getDate()
  );
}

function getDiaryMode(cellDate: Date, now: Date): DiaryMode {
  if (isDiaryEditableDay(cellDate, now)) return "editable";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (cellDate.getTime() < startOfToday.getTime()) return "readonly";
  return "hidden";
}
```

- [ ] **Step 2: Update the `isToday` call site to derive from `getDiaryMode`**

Find the `<SidePanel />` JSX. Locate:

```tsx
            isToday={isDiaryEditableDay(weekStart, selectedDayOfWeek, new Date())}
```

Replace with:

```tsx
            isToday={
              getDiaryMode(
                getCellDate(weekStart, selectedDayOfWeek),
                new Date(),
              ) === "editable"
            }
```

(This keeps the existing `isToday` prop on `SidePanel` working while the helpers are in their new shape. Task 3 will replace the prop entirely.)

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. Existing behavior is unchanged because `getDiaryMode(...) === "editable"` is logically equivalent to the old `isDiaryEditableDay(weekStart, dayOfWeek, now)`.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: introduce getDiaryMode and cellDate-based helper"
```

---

## Task 3: Switch `SidePanel` to `diaryMode` prop (TDD)

**Files:**
- Create: `src/__tests__/presentation/components/side-panel.test.tsx`
- Modify: `src/presentation/components/side-panel/side-panel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing side-panel test file**

Create `src/__tests__/presentation/components/side-panel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { SidePanel } from "@/presentation/components/side-panel/side-panel";

type SidePanelProps = ComponentProps<typeof SidePanel>;

function makeProps(overrides: Partial<SidePanelProps> = {}): SidePanelProps {
  const noop = () => {};
  return {
    dayOfWeek: 1,
    slot: 1,
    block: null,
    diaryLines: null,
    diaryMode: "hidden",
    subtasks: [],
    elapsedSeconds: 0,
    isTimerActive: false,
    otherBlockIsActive: false,
    onSaveBlock: noop,
    onStatusChange: noop,
    onSaveDiary: noop,
    onAddSubtask: noop,
    onEditSubtask: noop,
    onToggleSubtask: noop,
    onDeleteSubtask: noop,
    onReorderSubtasks: noop,
    onStartTimer: noop,
    onStopTimer: noop,
    onAddManualTimer: noop,
    onClearTimer: noop,
    onClose: noop,
    ...overrides,
  };
}

describe("SidePanel diary rendering", () => {
  it('renders DiaryForm when diaryMode is "editable"', () => {
    render(<SidePanel {...makeProps({ diaryMode: "editable" })} />);
    expect(screen.getByRole("button", { name: /儲存/ })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
  });

  it('renders DiaryReadOnlyView when diaryMode is "readonly" and diaryLines exist', () => {
    render(
      <SidePanel
        {...makeProps({
          diaryMode: "readonly",
          diaryLines: { bad: "分心", good: "完成", next: "調整" },
        })}
      />,
    );
    expect(screen.getByText("分心")).toBeInTheDocument();
    expect(screen.getByText("完成")).toBeInTheDocument();
    expect(screen.getByText("調整")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /儲存/ })).toBeNull();
  });

  it('renders neither form nor read-only view when diaryMode is "readonly" and diaryLines is null', () => {
    render(
      <SidePanel
        {...makeProps({ diaryMode: "readonly", diaryLines: null })}
      />,
    );
    expect(screen.queryByText("情緒日記")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it('renders neither when diaryMode is "hidden"', () => {
    render(
      <SidePanel
        {...makeProps({
          diaryMode: "hidden",
          diaryLines: { bad: "x", good: "y", next: "z" },
        })}
      />,
    );
    expect(screen.queryByText("情緒日記")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test src/__tests__/presentation/components/side-panel.test.tsx
```

Expected: FAIL. The first failure will be a TypeScript error (the `diaryMode` prop does not exist on `SidePanelProps` yet) — if the test runner doesn't fail the compile, the test body will still fail because `isToday` is still the prop in use.

- [ ] **Step 3: Update `SidePanel` to accept `diaryMode`**

In `src/presentation/components/side-panel/side-panel.tsx`:

Add the import for `DiaryReadOnlyView` next to the existing `DiaryForm` import. Find:

```tsx
import { DiaryForm } from "./diary-form";
```

Replace with:

```tsx
import { DiaryForm } from "./diary-form";
import { DiaryReadOnlyView } from "./diary-readonly-view";
```

Find the prop `isToday: boolean;` in the `SidePanelProps` interface:

```tsx
  isToday: boolean;
```

Replace with:

```tsx
  diaryMode: "editable" | "readonly" | "hidden";
```

Find the destructuring in the function signature:

```tsx
  isToday,
```

Replace with:

```tsx
  diaryMode,
```

Find the diary render block near the bottom:

```tsx
      {isToday && (
        <DiaryForm
          key={`diary-${dayOfWeek}`}
          bad={diaryLines?.bad ?? ""}
          good={diaryLines?.good ?? ""}
          next={diaryLines?.next ?? ""}
          onSave={onSaveDiary}
        />
      )}
```

Replace with:

```tsx
      {diaryMode === "editable" && (
        <DiaryForm
          key={`diary-${dayOfWeek}`}
          bad={diaryLines?.bad ?? ""}
          good={diaryLines?.good ?? ""}
          next={diaryLines?.next ?? ""}
          onSave={onSaveDiary}
        />
      )}
      {diaryMode === "readonly" && diaryLines && (
        <DiaryReadOnlyView
          bad={diaryLines.bad}
          good={diaryLines.good}
          next={diaryLines.next}
        />
      )}
```

- [ ] **Step 4: Update the `page.tsx` call site**

In `src/app/page.tsx`, find the `isToday` prop (now derived from `getDiaryMode`) on `<SidePanel />`:

```tsx
            isToday={
              getDiaryMode(
                getCellDate(weekStart, selectedDayOfWeek),
                new Date(),
              ) === "editable"
            }
```

Replace with:

```tsx
            diaryMode={getDiaryMode(
              getCellDate(weekStart, selectedDayOfWeek),
              new Date(),
            )}
```

- [ ] **Step 5: Run the side-panel test to verify it passes**

```bash
pnpm test src/__tests__/presentation/components/side-panel.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 6: Run the full check suite**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/presentation/components/side-panel/side-panel.tsx src/__tests__/presentation/components/side-panel.test.tsx
git commit -m "feat: show past-day diary read-only in side panel"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Verify past-day read-only**

1. Open the app, go to a past day that has a diary entry (write one today, then navigate to a past week or to a day earlier in this week if one exists).
2. Click any block on that past day.
3. **Expected:** `情緒日記` heading appears with the saved Bad / Good / Next values as plain text. No input boxes, no 儲存 button.

- [ ] **Step 3: Verify past-day with no diary**

1. Click a block on a past day where you never wrote a diary.
2. **Expected:** The diary section is completely absent from the side panel.

- [ ] **Step 4: Verify today still editable**

1. Click a block on today.
2. **Expected:** The editable `DiaryForm` appears as before, with inputs and a 儲存 button.

- [ ] **Step 5: Verify future-day hidden**

1. Click a block on a future day (same week or future week).
2. **Expected:** No diary section at all.

- [ ] **Step 6: Verify early-morning cutoff still works**

Optional (requires changing system clock or waiting). Before 08:00, yesterday's cell should still show the editable form.

---

## Task 5: Push and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/past-diary-readonly
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: show past-day diary read-only in side panel" --body "$(cat <<'EOF'
## Summary

- Add `DiaryReadOnlyView` component that renders Bad / Good / Next as plain text
- Replace `SidePanel`'s `isToday` prop with `diaryMode: "editable" | "readonly" | "hidden"`
- Introduce `getDiaryMode(cellDate, now)` helper in `page.tsx`, derived from a cellDate-based `isDiaryEditableDay`
- Past days with a saved diary show the read-only view; past days without one, future days, and today's window behave as before

## Test plan

- [ ] Past day with entry: read-only view appears
- [ ] Past day without entry: no diary section
- [ ] Today: editable `DiaryForm` still appears
- [ ] Future day: no diary section
- [ ] Yesterday before 08:00: still editable

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- New `DiaryReadOnlyView` component with bad/good/next props — Task 1 ✓
- `DiaryMode` type and `getDiaryMode(cellDate, now)` helper — Task 2, Step 1 ✓
- `isDiaryEditableDay` refactored to take a concrete `cellDate` — Task 2, Step 1 ✓
- `getCellDate` helper extracted — Task 2, Step 1 ✓
- `SidePanel` swaps `isToday` for `diaryMode` — Task 3, Step 3 ✓
- Render rules: editable → DiaryForm; readonly+entry → DiaryReadOnlyView; else nothing — Task 3, Step 3 ✓
- Call site in `page.tsx` passes the new prop — Task 3, Step 4 ✓
- `DiaryReadOnlyView` tests (plain text, em-dash, heading, no inputs/buttons) — Task 1, Step 1 ✓
- `SidePanel` tests for all four (mode × diaryLines) combinations — Task 3, Step 1 ✓
- No test for `getDiaryMode` itself — consistent with spec's stated rationale ✓

### 2. Placeholder scan

No TBD / TODO / "similar to". All code blocks are concrete.

### 3. Type consistency

- `DiaryMode` literal `"editable" | "readonly" | "hidden"` is identical in every task (helper definition, `SidePanel` prop, test `makeProps`).
- `isDiaryEditableDay(cellDate: Date, now: Date): boolean` is consistent between its definition (Task 2, Step 1) and its single caller inside `getDiaryMode` (same step).
- `getDiaryMode(cellDate: Date, now: Date): DiaryMode` matches every call: `getDiaryMode(getCellDate(weekStart, selectedDayOfWeek), new Date())` in both Task 2 Step 2 and Task 3 Step 4.
- `DiaryReadOnlyView` props `{ bad: string; good: string; next: string }` are consistent between the component (Task 1, Step 3), its unit tests (Task 1, Step 1), and its use in `SidePanel` (Task 3, Step 3).

All checks pass.
