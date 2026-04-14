# Subtasks, Timer, and Notifications — Design Spec

## Overview

Add three capabilities to BLOCK6 Time Manager:

1. **Subtasks** — each block can have a checklist of sub-tasks with drag-to-reorder
2. **Timer** — track time spent on each block via start/stop timer and manual entry
3. **Error notifications** — replace silent console errors with user-visible snackbars

## Goals

- Let users break each block into actionable checklist items (up to 7 recommended)
- Track actual time spent per block, either by live timer or manual session entry
- Make all API failures visible to users via snackbar notifications
- Keep BLOCK6 philosophy intact: focus (single active timer), lightweight UI, no over-engineering

## Out of Scope

- Subtask status beyond checked/unchecked (no in_progress/skipped for subtasks)
- Time per subtask (time tracked at block level only)
- Timer history UI (sessions are stored but not surfaced as a list for now)
- Pomodoro or interval timers
- Cross-week time analytics

---

## Data Model

### New table: `subtasks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| block_id | UUID | FK → blocks.id ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| completed | BOOLEAN | NOT NULL DEFAULT false |
| position | SMALLINT | NOT NULL, CHECK >= 0 |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(block_id, position) |

Batch-reorder strategy: when drag-dropped, the client renumbers all affected subtasks and issues a batched update. Position is recomputed as a contiguous 0..N sequence.

### New table: `timer_sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| block_id | UUID | FK → blocks.id ON DELETE CASCADE |
| user_id | UUID | FK → auth.users.id ON DELETE CASCADE |
| started_at | TIMESTAMPTZ | NOT NULL |
| ended_at | TIMESTAMPTZ | NULL means currently running |
| duration_seconds | INT | computed on stop; NULL while running |

Elapsed time per block is derived by summing `duration_seconds` from completed sessions plus `now - started_at` for any running session. No denormalized cache on `blocks`.

### RLS policies

Both tables follow the existing pattern: users can CRUD rows where they own the parent week_plan (for subtasks, via blocks → week_plans) or where `user_id = auth.uid()` (for timer_sessions).

---

## Single-active-timer rule

Only one `timer_sessions` row may have `ended_at IS NULL` for a given user at any time.

**Starting a timer on block X:**

1. `UPDATE timer_sessions SET ended_at = now(), duration_seconds = EXTRACT(EPOCH FROM now() - started_at) WHERE user_id = $1 AND ended_at IS NULL`
2. `INSERT INTO timer_sessions (block_id, user_id, started_at) VALUES ($block_x, $user, now())`

**Stopping a timer on block X:**

1. `UPDATE timer_sessions SET ended_at = now(), duration_seconds = EXTRACT(EPOCH FROM now() - started_at) WHERE block_id = $block_x AND user_id = $1 AND ended_at IS NULL`

**Manual session entry:**

1. User enters `started_at` and `ended_at` (or minutes count)
2. `INSERT INTO timer_sessions (block_id, user_id, started_at, ended_at, duration_seconds) VALUES (...)`
3. No conflict with active timer; manual entries are always pre-closed.

---

## Cross-device timer state

Timer state lives in Supabase, not localStorage. Any device shows the current running session because all devices read from the same `timer_sessions` table.

- On page load, client queries `timer_sessions WHERE user_id = $1 AND ended_at IS NULL` and shows running timer if any.
- Starting a timer on device A → device B's next data refresh (or periodic poll) sees the running session.
- No real-time sync in MVP; a 30-second polling interval on the active week is enough.

---

## UI Design

### SidePanel layout (top to bottom)

```
┌─────────────────────────────────────┐
│ Header: 週四 · 區塊 1        [✕]    │
├─────────────────────────────────────┤
│ BlockEditor                         │
│   Type [核心] [休息] [緩衝]          │
│   Title  [________________]         │
│   Description [                ]    │
├─────────────────────────────────────┤
│ SubtaskList (new)                   │
│   ⋮⋮ ☐ 寫測試                [✕]    │
│   ⋮⋮ ☑ 實作 API              [✕]    │
│   ⋮⋮ ☐ 部署                  [✕]    │
│   + 新增細項...                     │
│                                     │
│   (warning if > 7)                  │
├─────────────────────────────────────┤
│ BlockTimer (new)                    │
│   累計：01:23:45                    │
│   [▶ 開始計時]  [+ 手動新增]        │
├─────────────────────────────────────┤
│ StatusToggle                        │
│   [planned] [in_progress] ...       │
├─────────────────────────────────────┤
│ DiaryForm (if today)                │
│   Line 1, Line 2, Line 3            │
└─────────────────────────────────────┘
```

### New components

**`SubtaskList`**

- Props: `blockId`, `subtasks`, `onAdd`, `onToggle`, `onDelete`, `onReorder`
- Each row: drag handle (⋮⋮) + checkbox + title + delete button
- Drag and drop: uses `@dnd-kit/sortable`
- Adding: input at the bottom; submit on Enter
- Warning message when count > 7: "建議不超過 7 項以保持專注"
- Hard cap: none (advisory warning only)

**`BlockTimer`**

- Props: `blockId`, `sessions`, `onStart`, `onStop`, `onAddManual`
- Displays elapsed time in `HH:MM:SS` format
- While running: ticks every second via `setInterval`, "停止計時" button in red
- While stopped: "開始計時" button
- Manual entry: button "+ 手動新增" expands a small form with `started_at` + `ended_at` inputs (or alternative: minutes input)
- Confirm dialog when another block has an active session: "『任務 X』正在計時中，開始此任務會自動停止。確定嗎？"

**`Snackbar`** (new, used globally)

- Fixed position bottom-right
- Props: `message`, `type` ("error" | "success" | "info"), `onClose`
- Auto-dismiss after 5 seconds (errors: 8 seconds, with manual close)
- Color coded: error = `--color-block-buffer`, success = `--color-block-core`, info = `--color-accent`
- Stacks when multiple messages appear

**`NotificationProvider`** (new global context)

- Exposes `notify.error(message)`, `notify.success(message)`, `notify.info(message)`
- Manages a queue of active snackbars
- Wrapped in `RootLayout` above `AppStateProvider`

---

## Error Notification Integration

Replace every silent `.catch((err) => console.error(...))` in the app with:

```typescript
.catch((err) => {
  console.error(err);
  notify.error("儲存失敗，請稍後再試");
});
```

**Affected call sites:**

- `AppStateProvider`: `saveBlock`, `updateStatus`, `saveDiary`, `loadWeek`, `loadDiary`, `loadReflection`, migration failures
- `review/page.tsx`: `upsertReflection`
- New subtask operations: add, toggle, delete, reorder
- New timer operations: start, stop, manual entry, load sessions

Messages are localized to Traditional Chinese and operation-specific (e.g. "區塊儲存失敗", "細項新增失敗") so the user understands what failed without needing the console.

---

## Data Flow

### Loading a week (extended)

`loadWeek(weekKey)` now also fetches:
- subtasks for all blocks in that week (single query: `SELECT * FROM subtasks WHERE block_id IN (...)`)
- timer_sessions for all blocks in that week

AppState exposes:
- `getSubtasks(blockId): Subtask[]`
- `getElapsedSeconds(blockId): number` (computed from sessions, including live delta for running session)
- `getActiveTimer(): { blockId, startedAt } | null`

### Subtask operations

- `addSubtask(blockId, title)` → insert with `position = max(existing) + 1`
- `toggleSubtask(id)` → update `completed`
- `deleteSubtask(id)` → delete + renumber remaining subtasks' positions (batch update)
- `reorderSubtasks(blockId, orderedIds)` → batch update positions 0..N-1 in one transaction

### Timer operations

- `startTimer(blockId)` → end any active session for user, then insert new session. Returns new session.
- `stopTimer(blockId)` → close active session, set `ended_at` and `duration_seconds`.
- `addManualSession(blockId, startedAt, endedAt)` → insert pre-closed session.

---

## Architecture

New files in existing structure:

```
src/
  domain/
    entities/
      subtask.ts          # Subtask entity + createSubtask
      timer-session.ts    # TimerSession entity + createTimerSession
    repositories/
      subtask-repository.ts
      timer-session-repository.ts
    usecases/
      (add/toggle/delete/reorder subtasks)
      (start/stop/addManual timer)
  infrastructure/
    supabase/
      database.ts         # extended with subtask & timer fns
  presentation/
    components/
      side-panel/
        subtask-list.tsx
        block-timer.tsx
      notifications/
        snackbar.tsx
        notification-stack.tsx
    providers/
      notification-provider.tsx
      app-state-provider.tsx   # extended with subtask & timer state
```

---

## Testing Strategy

### Domain layer (Vitest)
- `Subtask` entity: title non-empty, position >= 0
- `TimerSession` entity: started_at present, if ended_at then ended_at > started_at
- Use cases: mocked repos, same pattern as existing tests

### Component layer (RTL)
- `SubtaskList`: renders items, checkbox toggles, add/delete, drag-drop reorder
- `BlockTimer`: shows formatted time, start/stop buttons, confirm dialog for active timer
- `Snackbar`: auto-dismiss, manual close, type-specific styling

### Integration
- No new E2E tests in MVP; rely on component + domain tests.

---

## Migration Path

1. Create Supabase SQL migration: `002_subtasks_and_timer.sql`
2. Run in Supabase SQL Editor
3. Deploy to Vercel via `main` branch push

No data migration needed since both tables are new.

---

## Development Process

- Branch: `feature/subtasks-and-timer` (already created)
- Commits follow existing convention (conventional commits)
- Merge to `master` via PR after spec + plan are approved and implementation passes all checks
