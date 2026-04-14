# Weekly Review Enhancements + Global Weekly Checklist — Design Spec

## Overview

Expand the weekly review page with deeper insights, and introduce a new global weekly task checklist accessible from the dashboard.

Four related additions:

1. **Desktop entry point** to `/review` from the dashboard footer
2. **Task × elapsed time ranking** on the review page (aggregated from blocks + timer_sessions)
3. **Weekly diary aggregation** on the review page (7 days side-by-side)
4. **Global weekly checklist** — a cross-week list of tasks, each one checkable per week; accessible via floating button (desktop) and a new bottom-nav tab (mobile)

All four require authentication (login).

## Goals

- Give users at-a-glance weekly insight (where did my time actually go? how did I feel each day?)
- Support long-term habits and targets that span weeks without coupling them to specific blocks
- Keep the review page purposeful (reflection + aggregated data) and the dashboard task-focused (planning + execution)

## Out of Scope

- Multi-week trends / month view (future)
- Import/export of checklist
- Editing diary entries from the review page (stays on the dashboard side panel)
- Checklist reminders / notifications

---

## Data Model

### New table: `weekly_tasks`

One row per user-defined recurring task.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users.id ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| position | INT | NOT NULL, CHECK (position >= 0) |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Partial unique index ensures active tasks have unique positions:

```sql
create unique index weekly_tasks_active_position
  on weekly_tasks (user_id, position)
  where is_active = true;
```

When a task is disabled (`is_active = false`) its position is not constrained. Re-enabling assigns a fresh position (max active + 1).

### New table: `weekly_task_completions`

One row per task × week when the task was checked. Deleting the row = unchecking.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| weekly_task_id | UUID | FK → weekly_tasks.id ON DELETE CASCADE |
| week_start | DATE | NOT NULL (Monday of the week) |
| completed_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| | | UNIQUE(weekly_task_id, week_start) |

### RLS

Both tables: users can CRUD their own rows.

```sql
alter table weekly_tasks enable row level security;
create policy "Users manage own weekly tasks"
  on weekly_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table weekly_task_completions enable row level security;
create policy "Users manage own task completions"
  on weekly_task_completions for all
  using (
    weekly_task_id in (
      select id from weekly_tasks where user_id = auth.uid()
    )
  )
  with check (
    weekly_task_id in (
      select id from weekly_tasks where user_id = auth.uid()
    )
  );
```

### No new schema for review aggregations

- **Task × time ranking** is derived from existing `blocks` + `timer_sessions` at query time
- **Weekly diary** is derived from existing `diary_entries`

---

## Domain

### New entity: `WeeklyTask`

```typescript
export interface WeeklyTask {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export function createWeeklyTask(input: CreateWeeklyTaskInput): WeeklyTask {
  if (!input.title.trim()) throw new Error("WeeklyTask title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input };
}
```

### Repository interface

```typescript
export interface WeeklyTaskRepository {
  findActiveForUser(userId: string): Promise<WeeklyTask[]>;
  add(userId: string, title: string, position: number): Promise<WeeklyTask>;
  updateTitle(id: string, title: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
  fetchCompletions(
    userId: string,
    weekStart: string,
  ): Promise<{ weeklyTaskId: string }[]>;
  addCompletion(weeklyTaskId: string, weekStart: string): Promise<void>;
  removeCompletion(weeklyTaskId: string, weekStart: string): Promise<void>;
}
```

### No new use cases

The operations are simple enough to live as plain functions in the Supabase data layer + methods on `AppStateProvider`. Following the existing pattern for subtasks — the domain entity provides validation, the data layer does the persistence.

### Aggregation function: task × time ranking

Added to the app state provider (client-side aggregation, simple enough for a reasonable number of blocks):

```typescript
getTaskTimeRanking(weekKey: string, now: Date): Array<{
  title: string;
  totalSeconds: number;
}>
```

Steps:
1. Get blocks for this week (existing `getBlocksForWeek`)
2. Get their timer sessions (existing `timerSessions` state, filter by `block_id`)
3. Group sessions by the block's `title`; sum `duration_seconds` (use `now - started_at` for running sessions)
4. Sort descending, strip entries with zero total
5. Return

---

## UI

### Desktop: review entry point

The existing footer already shows the weekly completion percentage. Append a right-aligned link:

```tsx
<footer className="desktop-only">
  <span>本週完成率 {pct}% ({completed}/{total})</span>
  <div style={{ flex: 1, /* progress bar */ }} />
  <Link href="/review" style={{ color: "var(--color-accent)", fontSize: "13px" }}>
    查看詳細回顧 →
  </Link>
</footer>
```

### Review page additions

Update `src/app/review/page.tsx`. Insert new sections **between existing ones**:

```
CompletionStats
BlockTypeBreakdown
TaskTimeRanking          ← new
DiaryWeekView            ← new
ReflectionEditor
```

**`TaskTimeRanking`** (new component)

- Props: `items: Array<{ title: string; totalSeconds: number }>`
- Renders a list sorted descending by `totalSeconds`
- Each row: title + formatted duration (`2h 15m`) + horizontal bar (`width: (row.seconds / max.seconds) * 100%`)
- Empty state: "本週尚無計時紀錄"

**`DiaryWeekView`** (new component)

- Props: `entries: Array<{ date: string; dayOfWeek: number; line1: string; line2: string; line3: string } | null>` — length 7, one per day
- Grid of 7 columns on desktop; scroll-horizontal on mobile
- Each cell: header (`週一 4/13`), three lines of text, or em-dash if empty

The review page reads `blocks` and `timerSessions` for the ranking, and calls `loadDiary(dateKey)` for each of the 7 days on mount.

### Weekly checklist panel

**`WeeklyChecklistPanel`** (new component) — the core UI used by both desktop and mobile entries.

- Props: `weeklyTasks`, `completedIds: Set<string>`, `weekKey: string`, handlers (`onAdd`, `onEdit`, `onToggle`, `onDisable`, `onReorder`)
- Lists active tasks sorted by position
- Each row: drag handle (⋮⋮) + checkbox + title (click to edit inline) + "✕" button (disables the task after confirm)
- Bottom: "+ 新增任務..." input
- Uses `@dnd-kit/sortable` like `SubtaskList`
- Shows disabled-task count somewhere minor (or not at all if too noisy — start without)

**Desktop: `FloatingChecklistButton`** (new component)

- Fixed position: `bottom: 16px, right: 16px`, z-index above content
- Circular button with a checklist icon
- Click toggles a popover (absolute-positioned panel above/left of the button) containing `WeeklyChecklistPanel`
- Only rendered when `user` is logged in
- Click outside → close

**Mobile: new bottom-nav tab**

Add `"checklist"` to the existing `mobileView` state. Nav buttons become:

```
[週總覽] [今日] [清單] [回顧]
```

When `mobileView === "checklist"`, the main area renders `<WeeklyChecklistPanel>` instead of `<DayView>` or `<WeekOverview>`.

Checklist is hidden for unauthenticated users on both platforms.

---

## AppState Additions

```typescript
interface AppState {
  // ...existing
  weeklyTasks: WeeklyTask[];           // active tasks only
  weeklyCompletions: Record<string, Set<string>>; // weekKey → set of weeklyTaskIds completed that week
  addWeeklyTask: (title: string) => void;
  editWeeklyTask: (id: string, title: string) => void;
  disableWeeklyTask: (id: string) => void;
  reorderWeeklyTasks: (orderedIds: string[]) => void;
  toggleWeeklyTaskCompletion: (id: string, weekKey: string) => void;
  getTaskTimeRanking: (weekKey: string, now: Date) =>
    Array<{ title: string; totalSeconds: number }>;
  loadWeeklyTasks: () => void;         // called once on login
  loadCompletions: (weekKey: string) => void;
}
```

`weeklyTasks` populated on login via `loadWeeklyTasks()`. Completions lazy-loaded per week; `loadCompletions(weekKey)` is called from the dashboard's existing `loadWeek` effect and the review page effect.

Optimistic updates follow existing pattern (update local state, await DB, notify on error).

---

## Architecture

New files:

```
supabase/migrations/005_weekly_tasks.sql                                (new)

src/
  domain/
    entities/
      weekly-task.ts                                                    (new)
    repositories/
      weekly-task-repository.ts                                         (new)
  infrastructure/
    supabase/
      database.ts                                                       (extend)
  presentation/
    components/
      review/
        task-time-ranking.tsx                                           (new)
        diary-week-view.tsx                                             (new)
      checklist/
        weekly-checklist-panel.tsx                                      (new)
        floating-checklist-button.tsx                                   (new)
    providers/
      app-state-provider.tsx                                            (extend)
  app/
    page.tsx                                                            (extend)
    review/
      page.tsx                                                          (extend)
```

---

## Testing

### Domain
- `createWeeklyTask`: validation (empty title, negative position)

### AppState
- `getTaskTimeRanking`: given sample blocks + timer sessions + now, returns correctly grouped/sorted array including running sessions

### Components
- `WeeklyChecklistPanel`: add, edit-inline, check/uncheck, disable, reorder (mirror subtask-list tests)
- `TaskTimeRanking`: renders ordered list, bar widths proportional to top, empty state
- `DiaryWeekView`: renders 7 cells, empty cells show em-dash, filled cells show lines

### Not tested
- Floating button popover open/close animation
- Mobile nav tab switching (trivial, existing pattern)
- RLS (verified manually via Supabase console)

---

## Migration

`supabase/migrations/005_weekly_tasks.sql` runs in Supabase Dashboard. Idempotent enough (CREATE TABLE IF NOT EXISTS is avoided for stricter schema evolution, but the migration is a one-shot — re-running will error, which is acceptable).

---

## Development Process

- Branch: `feature/weekly-review-and-checklist` (already created)
- Standard commit style
- One PR to `master` when all features pass checks
