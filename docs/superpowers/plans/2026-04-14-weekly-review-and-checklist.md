# Weekly Review Enhancements + Global Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop review entry point, task-time ranking and diary aggregation to the review page, and a new global weekly checklist accessible via floating button (desktop) and bottom-nav tab (mobile).

**Architecture:** Two new Supabase tables (`weekly_tasks`, `weekly_task_completions`) back the checklist. A new domain entity and repository interface follow Clean Architecture. Review-page aggregations (task × time, weekly diary) are derived client-side from existing tables. Two new UI entry points (desktop floating button, mobile nav tab) render a shared `WeeklyChecklistPanel` component.

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase (PostgreSQL + RLS), @dnd-kit/sortable, Vitest + RTL.

---

## File Structure

```
supabase/migrations/005_weekly_tasks.sql                                 (new)

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
    providers/
      app-state-provider.tsx                                            (extend)
    components/
      review/
        task-time-ranking.tsx                                           (new)
        diary-week-view.tsx                                             (new)
      checklist/
        weekly-checklist-panel.tsx                                      (new)
        floating-checklist-button.tsx                                   (new)
  app/
    page.tsx                                                            (extend)
    review/
      page.tsx                                                          (extend)

src/__tests__/
  domain/
    entities/
      weekly-task.test.ts                                               (new)
  presentation/
    components/
      weekly-checklist-panel.test.tsx                                   (new)
      task-time-ranking.test.tsx                                        (new)
      diary-week-view.test.tsx                                          (new)
```

---

## Task 1: Database Migration — weekly_tasks + weekly_task_completions

**Files:**
- Create: `supabase/migrations/005_weekly_tasks.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/005_weekly_tasks.sql`:

```sql
-- Global per-user weekly tasks
create table weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  position int not null check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index weekly_tasks_active_position
  on weekly_tasks (user_id, position)
  where is_active = true;

-- Completions: one row per (task, week) when checked
create table weekly_task_completions (
  id uuid primary key default gen_random_uuid(),
  weekly_task_id uuid not null references weekly_tasks(id) on delete cascade,
  week_start date not null,
  completed_at timestamptz not null default now(),
  unique (weekly_task_id, week_start)
);

create index weekly_task_completions_week_start
  on weekly_task_completions (week_start);

-- RLS
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

- [ ] **Step 2: Ask user to run it**

Tell the user: "Open Supabase Dashboard → SQL Editor → paste the file contents → Run. Expected: `Success. No rows returned.`"

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_weekly_tasks.sql
git commit -m "feat: add weekly_tasks and weekly_task_completions tables"
```

---

## Task 2: WeeklyTask Domain Entity (TDD)

**Files:**
- Create: `src/domain/entities/weekly-task.ts`
- Create: `src/__tests__/domain/entities/weekly-task.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/domain/entities/weekly-task.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createWeeklyTask } from "@/domain/entities/weekly-task";

describe("WeeklyTask", () => {
  it("creates a task with required fields", () => {
    const task = createWeeklyTask({
      id: "t-1",
      userId: "u-1",
      title: "每週運動 3 次",
      position: 0,
      isActive: true,
      createdAt: new Date(),
    });
    expect(task.title).toBe("每週運動 3 次");
    expect(task.isActive).toBe(true);
    expect(task.position).toBe(0);
  });

  it("rejects empty title", () => {
    expect(() =>
      createWeeklyTask({
        id: "t-1",
        userId: "u-1",
        title: "   ",
        position: 0,
        isActive: true,
        createdAt: new Date(),
      }),
    ).toThrow("WeeklyTask title is required");
  });

  it("rejects negative position", () => {
    expect(() =>
      createWeeklyTask({
        id: "t-1",
        userId: "u-1",
        title: "Read",
        position: -1,
        isActive: true,
        createdAt: new Date(),
      }),
    ).toThrow("position must be non-negative");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/weekly-task.test.ts
```

Expected: FAIL — cannot resolve `@/domain/entities/weekly-task`.

- [ ] **Step 3: Implement the entity**

Create `src/domain/entities/weekly-task.ts`:

```typescript
export interface WeeklyTask {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export interface CreateWeeklyTaskInput {
  id: string;
  userId: string;
  title: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
}

export function createWeeklyTask(
  input: CreateWeeklyTaskInput,
): WeeklyTask {
  if (!input.title.trim()) {
    throw new Error("WeeklyTask title is required");
  }
  if (input.position < 0) {
    throw new Error("position must be non-negative");
  }
  return { ...input };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/entities/weekly-task.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/weekly-task.ts src/__tests__/domain/entities/weekly-task.test.ts
git commit -m "feat: add WeeklyTask domain entity"
```

---

## Task 3: WeeklyTask Repository Interface

**Files:**
- Create: `src/domain/repositories/weekly-task-repository.ts`

- [ ] **Step 1: Create the interface**

Create `src/domain/repositories/weekly-task-repository.ts`:

```typescript
import { WeeklyTask } from "@/domain/entities/weekly-task";

export interface WeeklyTaskCompletion {
  readonly weeklyTaskId: string;
  readonly weekStart: string;
}

export interface WeeklyTaskRepository {
  findActiveForUser(userId: string): Promise<WeeklyTask[]>;
  add(
    userId: string,
    title: string,
    position: number,
  ): Promise<WeeklyTask>;
  updateTitle(id: string, title: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
  fetchCompletions(
    userId: string,
    weekStart: string,
  ): Promise<WeeklyTaskCompletion[]>;
  addCompletion(
    weeklyTaskId: string,
    weekStart: string,
  ): Promise<void>;
  removeCompletion(
    weeklyTaskId: string,
    weekStart: string,
  ): Promise<void>;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/domain/repositories/weekly-task-repository.ts
git commit -m "feat: add WeeklyTaskRepository interface"
```

---

## Task 4: Supabase Functions for WeeklyTasks

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Add entity import at top**

Add alongside existing entity imports near the top of the file:

```typescript
import type { WeeklyTask } from "@/domain/entities/weekly-task";
import { createWeeklyTask } from "@/domain/entities/weekly-task";
```

- [ ] **Step 2: Append the functions**

Append this section at the very end of `src/infrastructure/supabase/database.ts`:

```typescript
// --- Weekly Tasks ---

interface DbWeeklyTask {
  id: string;
  user_id: string;
  title: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

function dbWeeklyTaskToEntity(db: DbWeeklyTask): WeeklyTask {
  return createWeeklyTask({
    id: db.id,
    userId: db.user_id,
    title: db.title,
    position: db.position,
    isActive: db.is_active,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchActiveWeeklyTasks(
  userId: string,
): Promise<WeeklyTask[]> {
  const { data, error } = await supabase
    .from("weekly_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbWeeklyTask[]).map(dbWeeklyTaskToEntity);
}

export async function addWeeklyTask(
  userId: string,
  title: string,
  position: number,
): Promise<WeeklyTask> {
  const { data, error } = await supabase
    .from("weekly_tasks")
    .insert({ user_id: userId, title, position, is_active: true })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return dbWeeklyTaskToEntity(data as DbWeeklyTask);
}

export async function updateWeeklyTaskTitle(
  id: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ title })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setWeeklyTaskActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderWeeklyTasks(
  orderedIds: string[],
): Promise<void> {
  const OFFSET = 10000;
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("weekly_tasks")
      .update({ position: OFFSET + i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("weekly_tasks")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- Weekly task completions ---

interface DbWeeklyTaskCompletion {
  weekly_task_id: string;
  week_start: string;
}

export async function fetchWeeklyTaskCompletions(
  userId: string,
  weekStart: string,
): Promise<{ weeklyTaskId: string; weekStart: string }[]> {
  const { data, error } = await supabase
    .from("weekly_task_completions")
    .select("weekly_task_id, week_start, weekly_tasks!inner(user_id)")
    .eq("week_start", weekStart)
    .eq("weekly_tasks.user_id", userId);
  if (error) throw new Error(error.message);
  return (data as DbWeeklyTaskCompletion[]).map((r) => ({
    weeklyTaskId: r.weekly_task_id,
    weekStart: r.week_start,
  }));
}

export async function addWeeklyTaskCompletion(
  weeklyTaskId: string,
  weekStart: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_task_completions")
    .insert({ weekly_task_id: weeklyTaskId, week_start: weekStart });
  if (error) throw new Error(error.message);
}

export async function removeWeeklyTaskCompletion(
  weeklyTaskId: string,
  weekStart: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_task_completions")
    .delete()
    .eq("weekly_task_id", weeklyTaskId)
    .eq("week_start", weekStart);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "feat: add Supabase functions for weekly tasks and completions"
```

---

## Task 5: Extend AppStateProvider with Weekly Tasks

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Add imports**

Find the existing import from `@/infrastructure/supabase/database` and append:

```typescript
  fetchActiveWeeklyTasks,
  addWeeklyTask as dbAddWeeklyTask,
  updateWeeklyTaskTitle as dbUpdateWeeklyTaskTitle,
  setWeeklyTaskActive as dbSetWeeklyTaskActive,
  reorderWeeklyTasks as dbReorderWeeklyTasks,
  fetchWeeklyTaskCompletions,
  addWeeklyTaskCompletion as dbAddWeeklyTaskCompletion,
  removeWeeklyTaskCompletion as dbRemoveWeeklyTaskCompletion,
```

Also add near other entity imports:

```typescript
import type { WeeklyTask } from "@/domain/entities/weekly-task";
```

- [ ] **Step 2: Extend AppState interface**

Add to the `AppState` interface:

```typescript
  weeklyTasks: WeeklyTask[];
  weeklyCompletions: Record<string, Set<string>>;
  addWeeklyTask: (title: string) => void;
  editWeeklyTask: (id: string, title: string) => void;
  disableWeeklyTask: (id: string) => void;
  reorderWeeklyTasks: (orderedIds: string[]) => void;
  toggleWeeklyTaskCompletion: (id: string, weekKey: string) => void;
  loadWeeklyCompletions: (weekKey: string) => void;
  getTaskTimeRanking: (
    weekKey: string,
    now: Date,
  ) => Array<{ title: string; totalSeconds: number }>;
```

- [ ] **Step 3: Add state inside the provider**

Inside `AppStateProvider`, near other state declarations:

```typescript
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [weeklyCompletions, setWeeklyCompletions] = useState<
    Record<string, Set<string>>
  >({});
  const loadedCompletionsWeeks = useRef<Set<string>>(new Set());
```

- [ ] **Step 4: Load weekly tasks on login**

Find the existing `useEffect` that handles login/migration (the one calling `migrateLocalToSupabase`). After it, add a separate effect:

```typescript
  useEffect(() => {
    if (!isLoggedIn) {
      setWeeklyTasks([]);
      return;
    }
    fetchActiveWeeklyTasks(user!.id)
      .then((list) => setWeeklyTasks(list))
      .catch((err) => {
        console.error(err);
        notify.error("載入週任務清單失敗");
      });
  }, [isLoggedIn, user, notify]);
```

- [ ] **Step 5: Implement operations**

Near other operation useCallbacks, add:

```typescript
  const addWeeklyTask = useCallback(
    (title: string) => {
      if (!user) return;
      const position =
        weeklyTasks.length === 0
          ? 0
          : Math.max(...weeklyTasks.map((t) => t.position)) + 1;
      dbAddWeeklyTask(user.id, title, position)
        .then((created) => setWeeklyTasks((prev) => [...prev, created]))
        .catch((err) => {
          console.error(err);
          notify.error("週任務新增失敗");
        });
    },
    [user, weeklyTasks, notify],
  );

  const editWeeklyTask = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setWeeklyTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
      );
      dbUpdateWeeklyTaskTitle(id, trimmed).catch((err) => {
        console.error(err);
        notify.error("週任務更新失敗");
      });
    },
    [notify],
  );

  const disableWeeklyTask = useCallback(
    (id: string) => {
      setWeeklyTasks((prev) => prev.filter((t) => t.id !== id));
      dbSetWeeklyTaskActive(id, false).catch((err) => {
        console.error(err);
        notify.error("週任務停用失敗");
      });
    },
    [notify],
  );

  const reorderWeeklyTasksOp = useCallback(
    (orderedIds: string[]) => {
      setWeeklyTasks((prev) => {
        const positionMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev
          .map((t) =>
            positionMap.has(t.id)
              ? { ...t, position: positionMap.get(t.id)! }
              : t,
          )
          .sort((a, b) => a.position - b.position);
      });
      dbReorderWeeklyTasks(orderedIds).catch((err) => {
        console.error(err);
        notify.error("週任務排序失敗");
      });
    },
    [notify],
  );

  const loadWeeklyCompletions = useCallback(
    (weekKey: string) => {
      if (!user || loadedCompletionsWeeks.current.has(weekKey)) return;
      loadedCompletionsWeeks.current.add(weekKey);
      fetchWeeklyTaskCompletions(user.id, weekKey)
        .then((rows) => {
          setWeeklyCompletions((prev) => ({
            ...prev,
            [weekKey]: new Set(rows.map((r) => r.weeklyTaskId)),
          }));
        })
        .catch((err) => {
          console.error(err);
          notify.error("載入週任務完成狀態失敗");
          loadedCompletionsWeeks.current.delete(weekKey);
        });
    },
    [user, notify],
  );

  const toggleWeeklyTaskCompletion = useCallback(
    (id: string, weekKey: string) => {
      const current = weeklyCompletions[weekKey] ?? new Set<string>();
      const willComplete = !current.has(id);
      setWeeklyCompletions((prev) => {
        const next = new Set(prev[weekKey] ?? []);
        if (willComplete) next.add(id);
        else next.delete(id);
        return { ...prev, [weekKey]: next };
      });
      const op = willComplete
        ? dbAddWeeklyTaskCompletion(id, weekKey)
        : dbRemoveWeeklyTaskCompletion(id, weekKey);
      op.catch((err) => {
        console.error(err);
        notify.error("週任務狀態更新失敗");
      });
    },
    [weeklyCompletions, notify],
  );

  const getTaskTimeRanking = useCallback(
    (weekKey: string, now: Date) => {
      const weekBlocks = blocks.filter((b) => b.weekPlanId === weekKey);
      const titleByBlockId = new Map<string, string>();
      for (const b of weekBlocks) {
        if (b.title.trim()) titleByBlockId.set(b.id, b.title.trim());
      }
      const totals = new Map<string, number>();
      for (const session of timerSessions) {
        const title = titleByBlockId.get(session.blockId);
        if (!title) continue;
        const seconds = session.endedAt
          ? Math.max(0, session.durationSeconds ?? 0)
          : Math.max(
              0,
              Math.floor(
                (now.getTime() - session.startedAt.getTime()) / 1000,
              ),
            );
        totals.set(title, (totals.get(title) ?? 0) + seconds);
      }
      return Array.from(totals.entries())
        .filter(([, seconds]) => seconds > 0)
        .map(([title, totalSeconds]) => ({ title, totalSeconds }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds);
    },
    [blocks, timerSessions],
  );
```

- [ ] **Step 6: Expose in context value**

In the `<AppStateContext.Provider value={{...}}>` object, add:

```typescript
        weeklyTasks,
        weeklyCompletions,
        addWeeklyTask,
        editWeeklyTask,
        disableWeeklyTask,
        reorderWeeklyTasks: reorderWeeklyTasksOp,
        toggleWeeklyTaskCompletion,
        loadWeeklyCompletions,
        getTaskTimeRanking,
```

- [ ] **Step 7: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: extend AppState with weekly tasks, completions, and ranking"
```

---

## Task 6: WeeklyChecklistPanel Component (TDD)

**Files:**
- Create: `src/presentation/components/checklist/weekly-checklist-panel.tsx`
- Create: `src/__tests__/presentation/components/weekly-checklist-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/weekly-checklist-panel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyChecklistPanel } from "@/presentation/components/checklist/weekly-checklist-panel";
import type { WeeklyTask } from "@/domain/entities/weekly-task";

function makeTask(overrides: Partial<WeeklyTask> = {}): WeeklyTask {
  return {
    id: "t-1",
    userId: "u-1",
    title: "每週運動",
    position: 0,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("WeeklyChecklistPanel", () => {
  it("renders each task title", () => {
    render(
      <WeeklyChecklistPanel
        tasks={[
          makeTask({ id: "a", title: "運動" }),
          makeTask({ id: "b", title: "閱讀", position: 1 }),
        ]}
        completedIds={new Set()}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByText("運動")).toBeInTheDocument();
    expect(screen.getByText("閱讀")).toBeInTheDocument();
  });

  it("shows checkbox checked for completed tasks", () => {
    render(
      <WeeklyChecklistPanel
        tasks={[makeTask({ id: "a" })]}
        completedIds={new Set(["a"])}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onToggle when checkbox clicked", async () => {
    const user = userEvent.setup();
    let toggled: string | null = null;
    render(
      <WeeklyChecklistPanel
        tasks={[makeTask({ id: "a" })]}
        completedIds={new Set()}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={(id) => {
          toggled = id;
        }}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(toggled).toBe("a");
  });

  it("calls onAdd with new title on Enter", async () => {
    const user = userEvent.setup();
    let added: string | null = null;
    render(
      <WeeklyChecklistPanel
        tasks={[]}
        completedIds={new Set()}
        onAdd={(title) => {
          added = title;
        }}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/新增任務/);
    await user.type(input, "新任務{Enter}");
    expect(added).toBe("新任務");
  });

  it("calls onDisable when disable button clicked", async () => {
    const user = userEvent.setup();
    let disabled: string | null = null;
    render(
      <WeeklyChecklistPanel
        tasks={[makeTask({ id: "a" })]}
        completedIds={new Set()}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={(id) => {
          disabled = id;
        }}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /disable/i }));
    expect(disabled).toBe("a");
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test -- src/__tests__/presentation/components/weekly-checklist-panel.test.tsx
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement the component**

Create `src/presentation/components/checklist/weekly-checklist-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { WeeklyTask } from "@/domain/entities/weekly-task";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  tasks: WeeklyTask[];
  completedIds: Set<string>;
  onAdd: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  onDisable: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

function SortableRow({
  task,
  checked,
  onEdit,
  onToggle,
  onDisable,
}: {
  task: WeeklyTask;
  checked: boolean;
  onEdit: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  onDisable: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commit = () => {
    const t = draft.trim();
    if (t && t !== task.title) onEdit(task.id, t);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 4px",
        background: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span
        {...attributes}
        {...listeners}
        aria-label="drag handle"
        style={{
          cursor: "grab",
          color: "var(--color-text-muted)",
          userSelect: "none",
          fontSize: "14px",
          padding: "0 4px",
        }}
      >
        ⋮⋮
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(task.id)}
        style={{ cursor: "pointer" }}
      />
      {isEditing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(task.title);
              setIsEditing(false);
            }
          }}
          autoFocus
          style={{
            flex: 1,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "2px 6px",
            fontSize: "13px",
          }}
        />
      ) : (
        <span
          onClick={() => {
            setDraft(task.title);
            setIsEditing(true);
          }}
          style={{
            flex: 1,
            fontSize: "13px",
            color: "var(--color-text-primary)",
            textDecoration: checked ? "line-through" : "none",
            opacity: checked ? 0.6 : 1,
            cursor: "text",
          }}
        >
          {task.title}
        </span>
      )}
      <button
        onClick={() => onDisable(task.id)}
        aria-label="disable"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        &times;
      </button>
    </div>
  );
}

export function WeeklyChecklistPanel({
  tasks,
  completedIds,
  onAdd,
  onEdit,
  onToggle,
  onDisable,
  onReorder,
}: Props) {
  const [newTitle, setNewTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    onReorder(reordered.map((t) => t.id));
  };

  const submitNew = () => {
    const t = newTitle.trim();
    if (!t) return;
    onAdd(t);
    setNewTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableRow
              key={task.id}
              task={task}
              checked={completedIds.has(task.id)}
              onEdit={onEdit}
              onToggle={onToggle}
              onDisable={onDisable}
            />
          ))}
        </SortableContext>
      </DndContext>
      <input
        type="text"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitNew();
        }}
        placeholder="+ 新增任務..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "6px 8px",
          fontSize: "13px",
        }}
      />
      {tasks.length === 0 && (
        <span
          style={{
            color: "var(--color-text-muted)",
            fontSize: "12px",
            fontStyle: "italic",
          }}
        >
          尚未建立任何週任務
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/weekly-checklist-panel.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 5: Full check**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/checklist/weekly-checklist-panel.tsx src/__tests__/presentation/components/weekly-checklist-panel.test.tsx
git commit -m "feat: add WeeklyChecklistPanel with sortable rows"
```

---

## Task 7: FloatingChecklistButton (Desktop)

**Files:**
- Create: `src/presentation/components/checklist/floating-checklist-button.tsx`

- [ ] **Step 1: Implement**

Create `src/presentation/components/checklist/floating-checklist-button.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { WeeklyChecklistPanel } from "./weekly-checklist-panel";
import type { WeeklyTask } from "@/domain/entities/weekly-task";

interface Props {
  tasks: WeeklyTask[];
  completedIds: Set<string>;
  onAdd: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  onDisable: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function FloatingChecklistButton(props: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        bottom: "72px",
        right: "16px",
        zIndex: 100,
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: "8px",
            width: "300px",
            maxHeight: "60vh",
            overflowY: "auto",
            background: "var(--color-panel-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <strong
              style={{
                color: "var(--color-text-primary)",
                fontSize: "14px",
              }}
            >
              本週任務
            </strong>
            <button
              onClick={() => setOpen(false)}
              aria-label="close"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              &times;
            </button>
          </div>
          <WeeklyChecklistPanel {...props} />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle weekly checklist"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        &#9745;
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/checklist/floating-checklist-button.tsx
git commit -m "feat: add desktop floating checklist button"
```

---

## Task 8: Dashboard Integration (Floating Button + Footer Link + Mobile Tab)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/app/page.tsx`:

```typescript
import Link from "next/link";
import { FloatingChecklistButton } from "@/presentation/components/checklist/floating-checklist-button";
import { WeeklyChecklistPanel } from "@/presentation/components/checklist/weekly-checklist-panel";
```

- [ ] **Step 2: Destructure new AppState methods**

Extend the `useAppState()` destructure to include:

```typescript
    weeklyTasks,
    weeklyCompletions,
    addWeeklyTask,
    editWeeklyTask,
    disableWeeklyTask,
    reorderWeeklyTasks,
    toggleWeeklyTaskCompletion,
    loadWeeklyCompletions,
```

- [ ] **Step 3: Load completions for the current week**

Near the existing `useEffect(() => { loadWeek(weekKey); }, ...)`, add a second effect:

```typescript
  useEffect(() => {
    loadWeeklyCompletions(weekKey);
  }, [weekKey, loadWeeklyCompletions]);
```

- [ ] **Step 4: Update mobileView state type**

Find:

```typescript
const [mobileView, setMobileView] = useState<"day" | "overview">("day");
```

Change to:

```typescript
const [mobileView, setMobileView] = useState<
  "day" | "overview" | "checklist"
>("day");
```

- [ ] **Step 5: Render checklist when mobileView is "checklist"**

Find the mobile conditional:

```tsx
{mobileView === "day" ? (
  <DayView ... />
) : (
  <WeekOverview ... />
)}
```

Replace with:

```tsx
{mobileView === "day" && (
  <DayView
    dayOfWeek={mobileDay}
    blocks={blocks}
    selectedDayOfWeek={selected?.dayOfWeek ?? null}
    selectedSlot={selected?.slot ?? null}
    onBlockClick={handleBlockClick}
    onPreviousDay={
      mobileDay > 1 ? () => setMobileDay((d) => d - 1) : undefined
    }
    onNextDay={
      mobileDay < 7 ? () => setMobileDay((d) => d + 1) : undefined
    }
  />
)}
{mobileView === "overview" && (
  <WeekOverview
    blocks={blocks}
    onDayClick={(day) => {
      setMobileDay(day);
      setMobileView("day");
    }}
  />
)}
{mobileView === "checklist" && user && (
  <WeeklyChecklistPanel
    tasks={weeklyTasks}
    completedIds={weeklyCompletions[weekKey] ?? new Set()}
    onAdd={addWeeklyTask}
    onEdit={editWeeklyTask}
    onToggle={(id) => toggleWeeklyTaskCompletion(id, weekKey)}
    onDisable={disableWeeklyTask}
    onReorder={reorderWeeklyTasks}
  />
)}
```

- [ ] **Step 6: Add "清單" button to mobile bottom nav**

Find the mobile bottom nav buttons. Between the "今日" button and the "回顧" link, add:

```tsx
{user && (
  <button
    onClick={() => setMobileView("checklist")}
    style={{
      background: "none",
      border: "none",
      color:
        mobileView === "checklist"
          ? "var(--color-accent)"
          : "var(--color-text-secondary)",
      cursor: "pointer",
      fontSize: "14px",
    }}
  >
    清單
  </button>
)}
```

- [ ] **Step 7: Add desktop review entry link to footer**

Find the existing desktop-only footer. Append a link after the progress bar:

```tsx
<Link
  href="/review"
  style={{
    color: "var(--color-accent)",
    fontSize: "13px",
    whiteSpace: "nowrap",
    marginLeft: "12px",
  }}
>
  查看詳細回顧 &rarr;
</Link>
```

- [ ] **Step 8: Render FloatingChecklistButton (desktop only)**

At the top level of the return JSX, outside the flex container but inside the outermost `<div>`, add:

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
    />
  </div>
)}
```

- [ ] **Step 9: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate checklist (floating button + mobile tab) and review footer link"
```

---

## Task 9: TaskTimeRanking Component (TDD)

**Files:**
- Create: `src/presentation/components/review/task-time-ranking.tsx`
- Create: `src/__tests__/presentation/components/task-time-ranking.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/task-time-ranking.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskTimeRanking } from "@/presentation/components/review/task-time-ranking";

describe("TaskTimeRanking", () => {
  it("renders 'no records' when items is empty", () => {
    render(<TaskTimeRanking items={[]} />);
    expect(screen.getByText(/本週尚無計時紀錄/)).toBeInTheDocument();
  });

  it("renders items with formatted durations", () => {
    render(
      <TaskTimeRanking
        items={[
          { title: "專案開發", totalSeconds: 3 * 3600 + 15 * 60 },
          { title: "閱讀", totalSeconds: 45 * 60 },
        ]}
      />,
    );
    expect(screen.getByText("專案開發")).toBeInTheDocument();
    expect(screen.getByText("閱讀")).toBeInTheDocument();
    expect(screen.getByText("3h 15m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test -- src/__tests__/presentation/components/task-time-ranking.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/presentation/components/review/task-time-ranking.tsx`:

```tsx
interface Item {
  title: string;
  totalSeconds: number;
}

interface Props {
  items: Item[];
}

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function TaskTimeRanking({ items }: Props) {
  const max = items.reduce(
    (m, i) => Math.max(m, i.totalSeconds),
    0,
  );

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "16px",
        }}
      >
        本週時間分佈
      </h3>
      {items.length === 0 ? (
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "13px",
            fontStyle: "italic",
          }}
        >
          本週尚無計時紀錄
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item) => {
            const width = max === 0 ? 0 : (item.totalSeconds / max) * 100;
            return (
              <div key={item.title}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "12px",
                    }}
                  >
                    {formatDuration(item.totalSeconds)}
                  </span>
                </div>
                <div
                  style={{
                    background: "var(--color-bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    height: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "var(--color-accent)",
                      height: "100%",
                      width: `${width}%`,
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/task-time-ranking.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/review/task-time-ranking.tsx src/__tests__/presentation/components/task-time-ranking.test.tsx
git commit -m "feat: add TaskTimeRanking review component"
```

---

## Task 10: DiaryWeekView Component (TDD)

**Files:**
- Create: `src/presentation/components/review/diary-week-view.tsx`
- Create: `src/__tests__/presentation/components/diary-week-view.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/diary-week-view.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiaryWeekView } from "@/presentation/components/review/diary-week-view";

describe("DiaryWeekView", () => {
  it("renders 7 day cells", () => {
    render(<DiaryWeekView entries={new Array(7).fill(null)} />);
    expect(screen.getByText("週一")).toBeInTheDocument();
    expect(screen.getByText("週二")).toBeInTheDocument();
    expect(screen.getByText("週日")).toBeInTheDocument();
  });

  it("renders diary lines for filled entries", () => {
    render(
      <DiaryWeekView
        entries={[
          {
            dayOfWeek: 1,
            line1: "今天很專注",
            line2: "完成 API",
            line3: "明天加油",
          },
          null,
          null,
          null,
          null,
          null,
          null,
        ]}
      />,
    );
    expect(screen.getByText("今天很專注")).toBeInTheDocument();
    expect(screen.getByText("完成 API")).toBeInTheDocument();
    expect(screen.getByText("明天加油")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test -- src/__tests__/presentation/components/diary-week-view.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/presentation/components/review/diary-week-view.tsx`:

```tsx
interface Entry {
  dayOfWeek: number;
  line1: string;
  line2: string;
  line3: string;
}

interface Props {
  entries: Array<Entry | null>; // length 7, index 0 = Monday
}

const DAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

export function DiaryWeekView({ entries }: Props) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "16px",
        }}
      >
        本週日記
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(110px, 1fr))",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {DAY_LABELS.map((label, i) => {
          const entry = entries[i] ?? null;
          return (
            <div
              key={label}
              style={{
                background: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                padding: "8px",
                minHeight: "100px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              {entry ? (
                <>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "12px",
                    }}
                  >
                    {entry.line1}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "12px",
                    }}
                  >
                    {entry.line2}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "12px",
                    }}
                  >
                    {entry.line3}
                  </span>
                </>
              ) : (
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                  }}
                >
                  —
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/diary-week-view.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/review/diary-week-view.tsx src/__tests__/presentation/components/diary-week-view.test.tsx
git commit -m "feat: add DiaryWeekView review component"
```

---

## Task 11: Wire New Sections into Review Page

**Files:**
- Modify: `src/app/review/page.tsx`

- [ ] **Step 1: Update imports**

Add to top of `src/app/review/page.tsx`:

```typescript
import { useState } from "react";
import { TaskTimeRanking } from "@/presentation/components/review/task-time-ranking";
import { DiaryWeekView } from "@/presentation/components/review/diary-week-view";
```

- [ ] **Step 2: Destructure new AppState fields**

Add to the `useAppState()` destructure:

```typescript
    getTaskTimeRanking,
    loadDiary,
    diaryEntries,
```

(Keep existing destructure; just add these.)

- [ ] **Step 3: Load each day's diary for the week**

After the existing `useEffect(() => { loadWeek(weekKey); loadReflection(weekKey); }, ...)`, add:

```typescript
  useEffect(() => {
    for (let dow = 1; dow <= 7; dow++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + (dow - 1));
      const dateKey = d.toISOString().split("T")[0];
      loadDiary(dateKey);
    }
  }, [weekStart, loadDiary]);
```

- [ ] **Step 4: Compute ranking and diary entries**

After the existing stats computation, before the return statement:

```typescript
  const [now] = useState(() => new Date());
  const ranking = getTaskTimeRanking(weekKey, now);

  const weekDiaries: Array<{
    dayOfWeek: number;
    line1: string;
    line2: string;
    line3: string;
  } | null> = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dow - 1));
    const dateKey = d.toISOString().split("T")[0];
    const entry = diaryEntries[dateKey];
    weekDiaries.push(
      entry
        ? { dayOfWeek: dow, ...entry }
        : null,
    );
  }
```

- [ ] **Step 5: Insert new sections in JSX**

Find the existing JSX:

```tsx
<CompletionStats ... />
<BlockTypeBreakdown byType={byType} />
<ReflectionEditor reflection={reflection} onSave={handleSaveReflection} />
```

Change to:

```tsx
<CompletionStats ... />
<BlockTypeBreakdown byType={byType} />
<TaskTimeRanking items={ranking} />
<DiaryWeekView entries={weekDiaries} />
<ReflectionEditor reflection={reflection} onSave={handleSaveReflection} />
```

- [ ] **Step 6: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/review/page.tsx
git commit -m "feat: add TaskTimeRanking and DiaryWeekView to review page"
```

---

## Task 12: Final Verification + PR

**Files:** none (verification + PR)

- [ ] **Step 1: Format**

```bash
pnpm format
```

- [ ] **Step 2: Full quality check**

```bash
pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Verify (logged in):
- Desktop footer shows "查看詳細回顧 →" link, clicks through to review page
- Review page shows: CompletionStats, BlockTypeBreakdown, TaskTimeRanking, DiaryWeekView, ReflectionEditor
- Desktop bottom-right has a blue circular button — click opens checklist popover
- Add a task — appears in list, persists after refresh
- Click checkbox — toggles completion for current week; refresh page confirms persistence
- Click task title — goes into edit mode; Enter/blur saves; Escape cancels
- Click ✕ on a task — task disappears from list (disabled)
- Drag handle reorders tasks
- Mobile: bottom nav shows 4 buttons; "清單" switches to checklist view
- Unauthenticated: floating button not rendered, mobile nav has no "清單" tab

- [ ] **Step 4: Commit format if needed**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: format weekly-review-and-checklist files"
```

- [ ] **Step 5: Push**

```bash
git push -u origin feature/weekly-review-and-checklist
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "feat: weekly review enhancements and global checklist" --body "$(cat <<'EOF'
## Summary

- Desktop dashboard footer now links to `/review`
- Review page adds TaskTimeRanking (per-task total duration) and DiaryWeekView (7-day side-by-side)
- New global weekly checklist: floating button on desktop, bottom-nav tab on mobile
- Completions are recorded per (task, week); unchecking removes the row
- All checklist features require login (tables + UI gated)

## Database

Migration `supabase/migrations/005_weekly_tasks.sql`:
- `weekly_tasks` and `weekly_task_completions` tables with RLS
- Partial unique index on active task position per user

## Test plan

- [ ] Desktop footer "查看詳細回顧 →" link works
- [ ] Review page shows TaskTimeRanking with ordered durations
- [ ] DiaryWeekView shows 7 days; empty cells show em-dash
- [ ] Desktop floating checklist button opens popover
- [ ] Add / edit / check / disable / reorder weekly tasks
- [ ] Mobile nav "清單" tab shows checklist
- [ ] Logged-out users don't see any checklist UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- `weekly_tasks` + `weekly_task_completions` schema + RLS + partial unique — Task 1 ✓
- `WeeklyTask` entity — Task 2 ✓
- Repository interface — Task 3 ✓
- Supabase CRUD for tasks + completions — Task 4 ✓
- AppState: weeklyTasks, weeklyCompletions, add/edit/disable/reorder/toggle, loadWeeklyCompletions, getTaskTimeRanking — Task 5 ✓
- WeeklyChecklistPanel component with dnd — Task 6 ✓
- Desktop FloatingChecklistButton — Task 7 ✓
- Dashboard integration: floating button, mobile tab, footer review link — Task 8 ✓
- TaskTimeRanking component — Task 9 ✓
- DiaryWeekView component — Task 10 ✓
- Review page wiring — Task 11 ✓
- Verify + PR — Task 12 ✓

### 2. Placeholder scan

No TBD / TODO / vague references. All code shown or commands concrete.

### 3. Type consistency

- `WeeklyTask` interface fields (`userId`, `position`, `isActive`) consistent across entity (Task 2), repo (Task 3), Supabase mapper (Task 4), AppState usage (Task 5), component props (Task 6 onward).
- Method names `addWeeklyTask`, `editWeeklyTask`, `disableWeeklyTask`, `reorderWeeklyTasks`, `toggleWeeklyTaskCompletion` consistent across Task 5 (defined), Task 6 (Props), Task 7 (forward), Task 8 (wiring).
- `completedIds: Set<string>` consistent in Task 6 Props and Task 8 value construction (`weeklyCompletions[weekKey] ?? new Set()`).
- `getTaskTimeRanking` signature `(weekKey: string, now: Date) => Array<{title, totalSeconds}>` consistent Task 5 definition and Task 11 usage.

All checks pass.
