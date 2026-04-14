# Copy Last Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard banner that copies the previous week's block structure (type, title, description, subtasks) into the current week's empty cells.

**Architecture:** New AppState method `copyPreviousWeekPlan(currentWeekKey)` reads previous-week blocks + subtasks via existing Supabase functions, then inserts new blocks and subtasks only for `(dayOfWeek, slot)` slots that are currently empty. UI is a single `CopyLastWeekBanner` component shown above the WeekGrid / DayView when there's at least one empty cell and the user is logged in.

**Tech Stack:** TypeScript (strict), Next.js, Supabase, Vitest + RTL.

---

## File Structure

```
src/
  presentation/
    components/
      dashboard/
        copy-last-week-banner.tsx                                       (new)
    providers/
      app-state-provider.tsx                                            (modify: add copyPreviousWeekPlan)
  app/
    page.tsx                                                            (modify: render banner + handler)

src/__tests__/
  presentation/
    components/
      copy-last-week-banner.test.tsx                                    (new)
```

---

## Task 1: CopyLastWeekBanner Component (TDD)

**Files:**
- Create: `src/presentation/components/dashboard/copy-last-week-banner.tsx`
- Create: `src/__tests__/presentation/components/copy-last-week-banner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/copy-last-week-banner.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyLastWeekBanner } from "@/presentation/components/dashboard/copy-last-week-banner";

describe("CopyLastWeekBanner", () => {
  it("shows the empty-cell count in the message", () => {
    render(
      <CopyLastWeekBanner
        emptyCellCount={27}
        isCopying={false}
        onCopy={() => {}}
      />,
    );
    expect(screen.getByText(/27 格/)).toBeInTheDocument();
  });

  it("calls onCopy when button clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <CopyLastWeekBanner
        emptyCellCount={10}
        isCopying={false}
        onCopy={() => {
          clicked = true;
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /複製/ }));
    expect(clicked).toBe(true);
  });

  it("disables the button while copying", () => {
    render(
      <CopyLastWeekBanner
        emptyCellCount={10}
        isCopying={true}
        onCopy={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /複製/ })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/copy-last-week-banner.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/presentation/components/dashboard/copy-last-week-banner.tsx`:

```tsx
"use client";

interface Props {
  emptyCellCount: number;
  isCopying: boolean;
  onCopy: () => void;
}

export function CopyLastWeekBanner({
  emptyCellCount,
  isCopying,
  onCopy,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--color-bg-secondary)",
        borderLeft: "4px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        padding: "10px 16px",
        marginBottom: "12px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          color: "var(--color-text-primary)",
          fontSize: "13px",
          flex: 1,
          minWidth: 0,
        }}
      >
        還有 {emptyCellCount} 格未填 — 要從上週複製嗎？
      </span>
      <button
        onClick={onCopy}
        disabled={isCopying}
        style={{
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "6px 14px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: isCopying ? "not-allowed" : "pointer",
          opacity: isCopying ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {isCopying ? "複製中…" : "從上週複製 →"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/copy-last-week-banner.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Run full checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/dashboard/copy-last-week-banner.tsx src/__tests__/presentation/components/copy-last-week-banner.test.tsx
git commit -m "feat: add CopyLastWeekBanner component"
```

---

## Task 2: Add copyPreviousWeekPlan to AppStateProvider

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Extend AppState interface**

Find the `AppState` interface. Near the existing block operations (`saveBlock`, `updateStatus`), add:

```typescript
  copyPreviousWeekPlan: (currentWeekKey: string) => Promise<number>;
```

- [ ] **Step 2: Add imports if needed**

Check that the following are already imported from `@/infrastructure/supabase/database`:

- `fetchBlocksForWeek`
- `upsertBlock`
- `fetchSubtasksForBlocks`
- `addSubtask as dbAddSubtask`

They should all already be imported (used by existing code). No new imports needed.

- [ ] **Step 3: Implement the operation**

Find a place near other block-related useCallbacks (e.g. after `updateStatus`). Add:

```typescript
  const copyPreviousWeekPlan = useCallback(
    async (currentWeekKey: string): Promise<number> => {
      if (!user) return 0;

      const currentDate = new Date(currentWeekKey);
      const prev = new Date(currentDate);
      prev.setUTCDate(prev.getUTCDate() - 7);
      const previousWeekKey = prev.toISOString().split("T")[0];

      const prevBlocks = await fetchBlocksForWeek(user.id, previousWeekKey);
      if (prevBlocks.length === 0) return 0;

      const prevSubtasks = await fetchSubtasksForBlocks(
        prevBlocks.map((b) => b.id),
      );
      const subtasksByBlock = new Map<string, typeof prevSubtasks>();
      for (const s of prevSubtasks) {
        const list = subtasksByBlock.get(s.blockId) ?? [];
        list.push(s);
        subtasksByBlock.set(s.blockId, list);
      }

      const currentBlocks = supaBlocks.filter(
        (b) => b.weekPlanId === currentWeekKey,
      );
      const occupied = new Set(
        currentBlocks.map((b) => `${b.dayOfWeek}-${b.slot}`),
      );

      let inserted = 0;
      for (const prevBlock of prevBlocks) {
        const key = `${prevBlock.dayOfWeek}-${prevBlock.slot}`;
        if (occupied.has(key)) continue;

        const saved = await upsertBlock(
          user.id,
          currentWeekKey,
          prevBlock.dayOfWeek,
          prevBlock.slot,
          prevBlock.blockType,
          prevBlock.title,
          prevBlock.description,
        );

        const subtasksToCopy = (subtasksByBlock.get(prevBlock.id) ?? []).slice();
        subtasksToCopy.sort((a, b) => a.position - b.position);
        for (let i = 0; i < subtasksToCopy.length; i++) {
          const st = subtasksToCopy[i];
          await dbAddSubtask(saved.id, st.title, i);
        }

        inserted++;
      }

      // Force re-fetch of this week's data so local state reflects new blocks
      loadedWeeks.current.delete(currentWeekKey);
      loadWeek(currentWeekKey);

      return inserted;
    },
    [user, supaBlocks, loadWeek],
  );
```

- [ ] **Step 4: Expose in context value**

In the `<AppStateContext.Provider value={{...}}>` object, add:

```typescript
        copyPreviousWeekPlan,
```

- [ ] **Step 5: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: add copyPreviousWeekPlan to AppStateProvider"
```

---

## Task 3: Wire Banner into Dashboard

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add import**

At the top of `src/app/page.tsx`:

```typescript
import { CopyLastWeekBanner } from "@/presentation/components/dashboard/copy-last-week-banner";
```

- [ ] **Step 2: Destructure the new method**

Find the `useAppState()` destructuring. Add:

```typescript
    copyPreviousWeekPlan,
```

- [ ] **Step 3: Also destructure `user` if not already (it's already imported from useAuth)**

No change — `user` is already in scope from `useAuth()`.

- [ ] **Step 4: Add useNotify**

Check if `useNotify` is already imported. If not, add:

```typescript
import { useNotify } from "@/presentation/providers/notification-provider";
```

Inside the component, add:

```typescript
  const notify = useNotify();
```

(Skip this step if `notify` is already present.)

- [ ] **Step 5: Add copy state and handler**

Inside `DashboardPage`, after the existing `useState` calls, add:

```typescript
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyLastWeek = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      const count = await copyPreviousWeekPlan(weekKey);
      if (count === 0) {
        notify.info("上週沒有可複製的內容");
      } else {
        notify.info(`已複製 ${count} 個區塊`);
      }
    } catch (err) {
      console.error(err);
      notify.error("複製失敗，請稍後再試");
    } finally {
      setIsCopying(false);
    }
  };
```

- [ ] **Step 6: Render banner above WeekGrid / DayView**

Find the `<main>` element in the JSX. Inside it, before the desktop/mobile wrappers, add:

```tsx
          {user && blocks.length < 42 && (
            <CopyLastWeekBanner
              emptyCellCount={42 - blocks.length}
              isCopying={isCopying}
              onCopy={handleCopyLastWeek}
            />
          )}
```

So the main structure becomes:

```tsx
<main style={{ flex: 1, padding: "16px", overflow: "auto" }}>
  {user && blocks.length < 42 && (
    <CopyLastWeekBanner
      emptyCellCount={42 - blocks.length}
      isCopying={isCopying}
      onCopy={handleCopyLastWeek}
    />
  )}
  <div className="desktop-only">
    <WeekGrid ... />
  </div>
  <div className="mobile-only">
    ...
  </div>
</main>
```

- [ ] **Step 7: Run full checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: show copy-last-week banner when current week has empty cells"
```

---

## Task 4: Manual Smoke Test + PR

- [ ] **Step 1: Format + full check**

```bash
pnpm format && pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Commit format changes if any**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: format copy-last-week files"
```

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

As a logged-in user:
- Fill in a few blocks for this week (not all 42). Banner shows with correct empty count.
- Switch to next week (which is empty). Banner shows `還有 42 格未填`. Click it.
  - If previous week was filled → blocks copy over, banner disappears (or shows reduced count if not all 42 slots had content)
  - If previous week was empty → info snackbar `上週沒有可複製的內容`
- In a partially filled week, fill 2-3 cells manually, then click banner → existing cells remain untouched, empty cells fill from previous week.
- Verify subtasks are copied with `completed = false`.
- Verify timer sessions, statuses, diary entries are NOT copied.
- Fill all 42 cells → banner hides.
- Log out → banner doesn't render.

- [ ] **Step 4: Push**

```bash
git push -u origin feature/copy-last-week
```

- [ ] **Step 5: Open PR**

```bash
gh pr create --title "feat: copy last week's plan to current empty cells" --body "$(cat <<'EOF'
## Summary

- New banner on the dashboard shows whenever the current week has empty cells (logged-in users only)
- Clicking it copies the previous week's blocks into empty slots: type, title, description, and subtasks
- Existing blocks are never overwritten (empty-slot-only fill)
- Timer sessions, statuses, diary entries, and reflections are NOT copied
- Info snackbar shows the count copied, or "上週沒有可複製的內容" if previous week was empty

## Test plan

- [ ] Empty current week + filled previous week → click banner → 42 blocks copy
- [ ] Partially filled current week → click banner → only empty slots fill
- [ ] Empty previous week → click banner → info snackbar
- [ ] Fill all 42 manually → banner hides
- [ ] Logged-out user → banner doesn't render
- [ ] Subtasks copied with completed=false
- [ ] Timer sessions / statuses / diaries NOT copied

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Banner visibility rules (logged-in + < 42 blocks) — Task 3 ✓
- Banner click action (disable, query, insert, refresh, snackbar) — Tasks 2 + 3 ✓
- "Fill empty only" rule — Task 2 ✓
- Copies type/title/description/subtasks (not status/timer/diary/completed) — Task 2 ✓
- Reset subtask.completed to false — Task 2 (`dbAddSubtask` inserts fresh rows with default `completed = false`) ✓
- Snackbar messages (success count, no-data, failure) — Task 3 ✓
- Empty previous week returns 0 — Task 2 ✓
- `CopyLastWeekBanner` component with emptyCellCount prop — Task 1 ✓
- Dashboard integration — Task 3 ✓
- Component tests — Task 1 ✓
- PR — Task 4 ✓

### 2. Placeholder scan

No "TBD" / "TODO" / vague references. All code and commands are concrete.

### 3. Type consistency

- `copyPreviousWeekPlan(currentWeekKey: string) => Promise<number>` consistent across Task 2 (interface + implementation) and Task 3 (usage).
- Banner props `{ emptyCellCount: number; isCopying: boolean; onCopy: () => void }` consistent between Task 1 (definition) and Task 3 (call site).
- Usage of `supaBlocks` and `loadWeek` in Task 2 matches the existing AppStateProvider internals (those names exist from previous features).
- `dbAddSubtask(blockId, title, position)` signature matches the existing export.
- `upsertBlock(userId, weekKey, dayOfWeek, slot, blockType, title, description)` matches existing.

All checks pass.
