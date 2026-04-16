# Plan Lock & Change Log — Design Spec

## Overview

Today's plan is a commitment. This feature makes that commitment explicit by locking today's blocks and requiring a written reason any time the user changes them. Reasons are logged and surfaced in the weekly review, turning plan drift into a self-reflection artifact. A secondary change lets the review page navigate between weeks so historical logs are viewable.

## Goals

- Any change to today's slots (content edit, drag-drop, or new-block fill-in) is gated by a reason prompt.
- The reason and change metadata are persisted.
- The weekly review shows the week's change log, grouped by day.
- The weekly review page supports previous/next week navigation.
- Status changes, subtasks, timers, and diary are never blocked — execution is unaffected.

## Out of Scope

- Editing or deleting existing log entries.
- Undo integration on the reason-dialog `Cancel` button (cancel simply aborts the pending change).
- Exporting the log.
- Per-block "skip lock" escape hatches.
- Locking blocks on days other than today (no tomorrow-lock, no manual lock).

---

## 1. Lock Model

A block (or empty slot) is **locked** when its cell's calendar date equals today's local date. Computed, not stored.

```ts
function isLockedDay(weekStart: Date, dayOfWeek: number, now: Date): boolean {
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));
  return (
    cellDate.getFullYear() === now.getFullYear() &&
    cellDate.getMonth() === now.getMonth() &&
    cellDate.getDate() === now.getDate()
  );
}
```

Midnight is the boundary — unrelated to the diary 08:00 cutoff. The diary cutoff only controls `DiaryForm` visibility; it does not extend "today" for planning purposes.

---

## 2. What Triggers the Reason Prompt

A reason prompt is required for any change that alters a locked slot's content or occupancy:

| Action | Reason required? |
|---|---|
| Edit title / description / block type of a locked block | Yes |
| Save a new block into an empty locked slot | Yes |
| Drag-drop where the source is a locked block | Yes |
| Drag-drop where the destination is a locked slot | Yes |
| Change block status (planned / in_progress / completed / skipped) | No |
| Subtask add / edit / toggle / delete / reorder | No |
| Timer start / stop / manual entry | No |
| Diary save | No |

Swap between two locked slots (both on today) — still counts as a single "move" action; one dialog, one log entry.

---

## 3. Reason Prompt UX

A new modal component `PlanChangeDialog`:

- Trigger points live in `src/app/page.tsx`:
  - `handleSaveBlock` — before calling `saveBlock(...)`, check if destination slot is locked. If so, stash the pending-save args and open the dialog.
  - `handleSwapBlocks`, `handleMoveBlock` — before calling the app-state action, check if either the source or destination slot is locked. If so, stash pending-move args and open the dialog.
- Dialog fields:
  - Read-only line describing the change: e.g. `Edit: "讀書"` / `Add: new block in slot 3` / `Move: "讀書" → Wed slot 4`.
  - `<textarea>` for the reason. Required. Trim whitespace; reject if empty.
  - `Cancel` button → closes modal, pending args discarded, no state change.
  - `Confirm` button → executes the pending action, then inserts a log entry via `logPlanChange(...)`.
- Close paths: `Cancel`, Esc, backdrop click → all equivalent to Cancel.

The dialog is stateless outside of the open/close toggle and the pending-action payload; both live in `page.tsx` as local state.

---

## 4. Data Model

### Domain entity

`src/domain/entities/plan-change.ts`:

```ts
export type PlanChangeAction = "edit" | "move" | "add";

export interface PlanChange {
  readonly id: string;
  readonly userId: string | null; // null for localStorage-only mode
  readonly weekKey: string;       // ISO date (YYYY-MM-DD), week start
  readonly dayOfWeek: number;     // 1-7
  readonly slot: number;          // 1-6
  readonly blockTitleSnapshot: string;
  readonly action: PlanChangeAction;
  readonly reason: string;
  readonly createdAt: string;     // ISO timestamp
}
```

### Repository interface

`src/domain/repositories/plan-change-repository.ts`:

```ts
export interface PlanChangeRepository {
  listByWeek(userId: string, weekKey: string): Promise<PlanChange[]>;
  create(change: PlanChange): Promise<PlanChange>;
}
```

### Use case

`src/domain/usecases/log-plan-change.ts`:

```ts
export interface LogPlanChangeInput {
  userId: string | null;
  weekKey: string;
  dayOfWeek: number;
  slot: number;
  blockTitleSnapshot: string;
  action: PlanChangeAction;
  reason: string;
}

export function logPlanChange(input: LogPlanChangeInput): PlanChange {
  // Validates reason (non-empty after trim), generates id + createdAt, returns PlanChange.
}
```

### Supabase schema

New migration `supabase/migrations/<next-index>_plan_changes.sql`:

```sql
create table plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key date not null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  slot smallint not null check (slot between 1 and 6),
  block_title_snapshot text not null,
  action text not null check (action in ('edit', 'move', 'add')),
  reason text not null,
  created_at timestamptz not null default now()
);

create index plan_changes_user_week_idx on plan_changes (user_id, week_key);

alter table plan_changes enable row level security;

create policy plan_changes_select_own on plan_changes
  for select using (auth.uid() = user_id);

create policy plan_changes_insert_own on plan_changes
  for insert with check (auth.uid() = user_id);
```

No update / delete policies — the log is append-only.

### localStorage fallback

Key: `block6:planChanges:<userIdOrAnon>` → JSON array of `PlanChange`. Same shape as Supabase rows, `userId` is `"anon"` (string sentinel) for unauthenticated users.

---

## 5. App-State Plumbing

Add to `src/presentation/providers/app-state-provider.tsx`:

```ts
planChanges: Record<string /* weekKey */, PlanChange[]>;
loadPlanChanges: (weekKey: string) => Promise<void>;
addPlanChange: (input: LogPlanChangeInput) => Promise<PlanChange>;
```

- `loadPlanChanges` reads Supabase if authenticated, else localStorage, populates `planChanges[weekKey]`.
- `addPlanChange` constructs the entry via `logPlanChange(...)`, writes to Supabase or localStorage, appends to the in-memory map.

The existing `saveBlock` / `swapBlocks` / `moveBlock` do NOT change. The calling side (`page.tsx`) orchestrates: show dialog → on confirm, call the existing mutation AND `addPlanChange`.

---

## 6. Review Page Changes

### Week navigation

`src/app/review/page.tsx` currently uses `useWeekPlan()` which already exposes `goToPreviousWeek` / `goToNextWeek`. Render a minimal `WeekNavigator`-style header (reuse the existing `src/presentation/components/header/week-navigator.tsx` component) above the title row.

### New section: `PlanChangesLog`

`src/presentation/components/review/plan-changes-log.tsx`:

```tsx
interface PlanChangesLogProps {
  weekStart: Date;
  changes: PlanChange[];
}
```

- Groups changes by `dayOfWeek` (1-7).
- Each entry renders one row: `[action badge] block title — reason  (time)`.
- Action badge: small colored pill (edit=blue, move=yellow, add=green), using existing semantic color vars or `var(--color-block-*)` where appropriate.
- Empty state: single paragraph "No plan changes this week."

Placement in `ReviewPage`: after `<DiaryWeekView />`, before `<ReflectionEditor />`.

---

## 7. Affected Files

| File | Kind | Purpose |
|---|---|---|
| `src/domain/entities/plan-change.ts` | New | `PlanChange` entity + `PlanChangeAction` type |
| `src/domain/repositories/plan-change-repository.ts` | New | Interface |
| `src/domain/usecases/log-plan-change.ts` | New | `logPlanChange` constructor |
| `src/infrastructure/supabase/database.ts` | Modify | Add `listPlanChangesForWeek`, `insertPlanChange` |
| `supabase/migrations/<next-index>_plan_changes.sql` | New | Table + RLS |
| `src/presentation/providers/app-state-provider.tsx` | Modify | `planChanges` state, `loadPlanChanges`, `addPlanChange` |
| `src/presentation/components/plan-change-dialog/plan-change-dialog.tsx` | New | Reason prompt modal |
| `src/presentation/components/review/plan-changes-log.tsx` | New | Review-page log list |
| `src/app/page.tsx` | Modify | Compute locked-slot check, intercept save/swap/move, orchestrate dialog |
| `src/app/review/page.tsx` | Modify | Add week navigator, load + render `PlanChangesLog` |

No changes to existing domain entities. No migration backfill — existing data has no changes to log.

---

## 8. Manual Verification

- With today being, say, Wednesday, open the dashboard. Click today's block → edit title → Save. Expect: reason dialog appears. Enter reason, confirm → change saved, dialog closes.
- Edit a block on another day → Save. Expect: no dialog, saves normally.
- Drag a block from today's cell onto Friday. Expect: reason dialog appears (source is locked). Swap lands after confirm.
- Drag a block from Friday onto today's empty slot. Expect: reason dialog appears (destination is locked).
- Open the review page → scroll to "Plan Changes" section → the entries for today's reasons are listed.
- Click "Previous week" on the review page → shows last week's blocks, diaries, and any plan-change entries (or empty state).
- Change block status to Completed on today's block. Expect: no dialog.
- Log an entry offline (no Supabase session) → reload (still anon) → entry still present from localStorage.

---

## 9. Testing

- Domain: unit-test `logPlanChange` for rejection of empty/whitespace reason and correct entity construction.
- Integration-level: no new unit tests for the dialog or review section — follow the existing pattern in this repo (presentational components and page-level orchestration are manually verified).

---

## Branch

`feature/plan-lock-and-log` (already created).
