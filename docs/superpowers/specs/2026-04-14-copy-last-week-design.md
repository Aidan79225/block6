# Copy Last Week — Design Spec

## Overview

Add a "Copy Last Week" banner to the dashboard so users can instantly seed an incomplete week with the previous week's block structure. This removes the friction of re-entering recurring tasks while respecting any new blocks the user has already planned for the current week.

## Goals

- Eliminate the chore of re-typing the same weekly pattern
- Never overwrite the user's intentional current-week entries
- Keep execution data separate from planning data (don't copy timers, statuses, completions, or diaries)

## Out of Scope

- Week "templates" that live independently from real weeks
- Copying from an arbitrary week (only the immediate previous week)
- Copying for unauthenticated (localStorage-only) users — cross-week functionality is for logged-in users only
- Confirmation dialog — the "fill empty only" rule makes overwrites impossible, so no confirmation is needed

---

## Behavior

### Banner visibility

Visible when **all** of:
- The user is authenticated
- Current week has at least one empty cell (i.e. fewer than 42 blocks)

Hidden otherwise. The banner stays visible even after a partial copy — users can click it again to fill any remaining empty cells.

### Click action

On click, the system:

1. Disables the button and shows a loading indicator
2. Queries blocks and subtasks from the previous week (`currentWeekKey - 7 days`)
3. For each previous-week block:
   - If the current week already has a block at the same `(dayOfWeek, slot)` → **skip**
   - Otherwise → insert a new block with:
     - `weekPlanId` = current week
     - `blockType`, `title`, `description` copied from previous
     - `status` = `"planned"` (not copied)
     - New UUID `id`
   - Copy subtasks of that block to the newly inserted block (title, position preserved; `completed` reset to `false`)
4. Re-fetches current week data so the UI reflects the new blocks
5. Shows a snackbar:
   - Success: `已複製 N 個區塊` (info)
   - No previous-week data: `上週沒有可複製的內容` (info)
   - Failure: `複製失敗，請稍後再試` (error)

### What is NOT copied

- `timer_sessions`
- Block `status` (all new blocks start at `planned`)
- Subtask `completed` flags (all reset to `false`)
- Diary entries
- Week reflection
- Weekly checklist completions

---

## Data Flow

```
Banner click
  └─ AppState.copyPreviousWeekPlan(currentWeekKey)
       ├─ previousWeekKey = addDays(currentWeekKey, -7)
       ├─ const prevBlocks = await fetchBlocksForWeek(user.id, previousWeekKey)
       ├─ if (prevBlocks.length === 0) return 0
       ├─ const prevSubtasks = await fetchSubtasksForBlocks(prevBlocks.map(b => b.id))
       ├─ const currentBlocks = getBlocksForWeek(currentWeekKey)  // from state
       ├─ const occupiedSlots = new Set of "day-slot"
       ├─ for each prevBlock not in occupiedSlots:
       │    ├─ const saved = await upsertBlock(userId, currentWeekKey, day, slot,
       │    │                                  blockType, title, description)
       │    └─ for each subtask of prevBlock:
       │         await addSubtask(saved.id, subtask.title, subtask.position)
       ├─ await loadWeek(currentWeekKey)  // force re-fetch
       └─ return inserted count
```

Errors in individual block inserts propagate up and abort the rest; user sees an error snackbar. Partial progress is persisted (not a transaction) — that's acceptable because the "fill empty only" rule means a retry will resume from where it stopped.

---

## UI

### New component: `CopyLastWeekBanner`

File: `src/presentation/components/dashboard/copy-last-week-banner.tsx`

```tsx
interface Props {
  emptyCellCount: number;  // 1..41
  onCopy: () => void;
  isCopying: boolean;
}
```

Layout:
- Horizontal bar, full width of the main content area
- Left: accent-colored vertical stripe (4px, `var(--color-accent)`)
- Message text: `還有 {emptyCellCount} 格未填 — 要從上週複製嗎？`
- Right-aligned action button: `從上週複製 →`
- Background: `var(--color-bg-secondary)`
- Padding: `10px 16px`, border radius
- On mobile, stacks the button below the text

### Dashboard integration

In `src/app/page.tsx`, above the `<WeekGrid />` (desktop) and `<DayView />` / `<WeekOverview />` (mobile), render:

```tsx
{user && blocks.length < 42 && (
  <CopyLastWeekBanner
    emptyCellCount={42 - blocks.length}
    onCopy={handleCopy}
    isCopying={isCopying}
  />
)}
```

`handleCopy` calls `copyPreviousWeekPlan(weekKey)`, awaits result, shows snackbar.

---

## AppState Additions

```typescript
copyPreviousWeekPlan: (currentWeekKey: string) => Promise<number>;
```

Returns the number of blocks inserted. `0` means the previous week had no content (or all overlapped with the current week's existing blocks).

Loading state is managed in the dashboard component (`useState<boolean>`), not in AppState — the banner is the only consumer.

---

## Architecture

New files:

```
src/
  presentation/
    components/
      dashboard/
        copy-last-week-banner.tsx                                       (new)

src/__tests__/
  presentation/
    components/
      copy-last-week-banner.test.tsx                                    (new)
```

Modified:

- `src/presentation/providers/app-state-provider.tsx` — add `copyPreviousWeekPlan`
- `src/app/page.tsx` — render banner conditionally

---

## Testing

### Component tests (`CopyLastWeekBanner`)

- Renders empty-cell count correctly
- Click calls `onCopy` handler
- When `isCopying` is true, button is disabled
- Message shows the provided count

### Manual verification (since the copy logic involves Supabase round-trips)

- On an empty current week with filled previous week → click banner → all 42 blocks populate
- On a partially filled current week → click banner → only empty slots fill, existing blocks untouched
- On an empty current week with an empty previous week → click banner → info snackbar `上週沒有可複製的內容`
- Subtasks of copied blocks appear with `completed = false`
- Timer sessions, diary, reflection do NOT carry over
- After copy, clicking the banner again is a no-op (still says `還有 0 格未填` — actually banner should be hidden at that point; verify this)

---

## Branch

`feature/copy-last-week` (already created).
