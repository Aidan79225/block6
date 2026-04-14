# Subtasks, Timer, and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add checklist subtasks per block (drag-reorderable), timer tracking with single-active-timer rule, manual session entry, and a global snackbar notification system replacing silent error logging.

**Architecture:** Extend existing Clean Architecture with two new domain entities (`Subtask`, `TimerSession`) and their repository interfaces. Supabase implementation adds two new tables. A new `NotificationProvider` wraps the app above `AppStateProvider` to surface API errors. UI adds `SubtaskList`, `BlockTimer`, and `Snackbar` components.

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase (PostgreSQL + Auth), Vitest + RTL, `@dnd-kit/sortable` for drag-drop.

---

## File Structure

```
supabase/migrations/002_subtasks_and_timer.sql          (new)

src/
  domain/
    entities/
      subtask.ts                                         (new)
      timer-session.ts                                   (new)
    repositories/
      subtask-repository.ts                              (new)
      timer-session-repository.ts                        (new)
  infrastructure/
    supabase/
      database.ts                                        (extend)
  presentation/
    providers/
      notification-provider.tsx                          (new)
      app-state-provider.tsx                             (extend)
    components/
      notifications/
        snackbar.tsx                                     (new)
      side-panel/
        side-panel.tsx                                   (extend)
        subtask-list.tsx                                 (new)
        block-timer.tsx                                  (new)

src/__tests__/
  domain/
    entities/
      subtask.test.ts                                    (new)
      timer-session.test.ts                              (new)
  presentation/
    components/
      snackbar.test.tsx                                  (new)
      subtask-list.test.tsx                              (new)
      block-timer.test.tsx                               (new)
```

---

## Task 1: Database Migration (Supabase)

**Files:**
- Create: `supabase/migrations/002_subtasks_and_timer.sql`

- [ ] **Step 1: Write the SQL migration**

Create `supabase/migrations/002_subtasks_and_timer.sql`:

```sql
-- Subtasks
create table subtasks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position smallint not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique(block_id, position)
);

-- Timer sessions
create table timer_sessions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int
);

-- Partial index to enforce a single active session per user
create unique index timer_sessions_one_active_per_user
  on timer_sessions (user_id)
  where ended_at is null;

-- RLS for subtasks
alter table subtasks enable row level security;

create policy "Users can manage own subtasks"
  on subtasks for all
  using (
    block_id in (
      select b.id from blocks b
      join week_plans w on w.id = b.week_plan_id
      where w.user_id = auth.uid()
    )
  )
  with check (
    block_id in (
      select b.id from blocks b
      join week_plans w on w.id = b.week_plan_id
      where w.user_id = auth.uid()
    )
  );

-- RLS for timer_sessions
alter table timer_sessions enable row level security;

create policy "Users can manage own timer sessions"
  on timer_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Tell the user to open Supabase Dashboard → SQL Editor → paste the migration contents and run. Expected result: `Success. No rows returned.`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_subtasks_and_timer.sql
git commit -m "feat: add subtasks and timer_sessions tables with RLS"
```

---

## Task 2: Subtask Domain Entity

**Files:**
- Create: `src/domain/entities/subtask.ts`
- Create: `src/__tests__/domain/entities/subtask.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/domain/entities/subtask.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createSubtask } from "@/domain/entities/subtask";

describe("Subtask", () => {
  it("creates a subtask with required fields", () => {
    const subtask = createSubtask({
      id: "s-1",
      blockId: "b-1",
      title: "寫測試",
      completed: false,
      position: 0,
      createdAt: new Date(),
    });

    expect(subtask.id).toBe("s-1");
    expect(subtask.blockId).toBe("b-1");
    expect(subtask.title).toBe("寫測試");
    expect(subtask.completed).toBe(false);
    expect(subtask.position).toBe(0);
  });

  it("rejects empty title", () => {
    expect(() =>
      createSubtask({
        id: "s-1",
        blockId: "b-1",
        title: "   ",
        completed: false,
        position: 0,
        createdAt: new Date(),
      }),
    ).toThrow("Subtask title is required");
  });

  it("rejects negative position", () => {
    expect(() =>
      createSubtask({
        id: "s-1",
        blockId: "b-1",
        title: "寫測試",
        completed: false,
        position: -1,
        createdAt: new Date(),
      }),
    ).toThrow("position must be non-negative");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/subtask.test.ts
```

Expected: FAIL — cannot resolve `@/domain/entities/subtask`.

- [ ] **Step 3: Implement the entity**

Create `src/domain/entities/subtask.ts`:

```typescript
export interface Subtask {
  readonly id: string;
  readonly blockId: string;
  readonly title: string;
  readonly completed: boolean;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateSubtaskInput {
  id: string;
  blockId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: Date;
}

export function createSubtask(input: CreateSubtaskInput): Subtask {
  if (!input.title.trim()) {
    throw new Error("Subtask title is required");
  }
  if (input.position < 0) {
    throw new Error("position must be non-negative");
  }
  return { ...input };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/entities/subtask.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/subtask.ts src/__tests__/domain/entities/subtask.test.ts
git commit -m "feat: add Subtask domain entity with validation"
```

---

## Task 3: TimerSession Domain Entity

**Files:**
- Create: `src/domain/entities/timer-session.ts`
- Create: `src/__tests__/domain/entities/timer-session.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/domain/entities/timer-session.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createTimerSession } from "@/domain/entities/timer-session";

describe("TimerSession", () => {
  it("creates a running session without ended_at", () => {
    const session = createTimerSession({
      id: "t-1",
      blockId: "b-1",
      userId: "u-1",
      startedAt: new Date("2026-04-14T10:00:00Z"),
      endedAt: null,
      durationSeconds: null,
    });

    expect(session.endedAt).toBeNull();
    expect(session.durationSeconds).toBeNull();
  });

  it("creates a closed session with duration", () => {
    const started = new Date("2026-04-14T10:00:00Z");
    const ended = new Date("2026-04-14T11:00:00Z");
    const session = createTimerSession({
      id: "t-1",
      blockId: "b-1",
      userId: "u-1",
      startedAt: started,
      endedAt: ended,
      durationSeconds: 3600,
    });

    expect(session.durationSeconds).toBe(3600);
  });

  it("rejects endedAt before startedAt", () => {
    expect(() =>
      createTimerSession({
        id: "t-1",
        blockId: "b-1",
        userId: "u-1",
        startedAt: new Date("2026-04-14T11:00:00Z"),
        endedAt: new Date("2026-04-14T10:00:00Z"),
        durationSeconds: -3600,
      }),
    ).toThrow("endedAt must be after startedAt");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/domain/entities/timer-session.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the entity**

Create `src/domain/entities/timer-session.ts`:

```typescript
export interface TimerSession {
  readonly id: string;
  readonly blockId: string;
  readonly userId: string;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly durationSeconds: number | null;
}

export interface CreateTimerSessionInput {
  id: string;
  blockId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
}

export function createTimerSession(
  input: CreateTimerSessionInput,
): TimerSession {
  if (input.endedAt && input.endedAt.getTime() <= input.startedAt.getTime()) {
    throw new Error("endedAt must be after startedAt");
  }
  return { ...input };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/domain/entities/timer-session.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/timer-session.ts src/__tests__/domain/entities/timer-session.test.ts
git commit -m "feat: add TimerSession domain entity with validation"
```

---

## Task 4: Repository Interfaces

**Files:**
- Create: `src/domain/repositories/subtask-repository.ts`
- Create: `src/domain/repositories/timer-session-repository.ts`

- [ ] **Step 1: Create SubtaskRepository interface**

Create `src/domain/repositories/subtask-repository.ts`:

```typescript
import { Subtask } from "@/domain/entities/subtask";

export interface SubtaskRepository {
  findByBlockIds(blockIds: string[]): Promise<Subtask[]>;
  add(
    blockId: string,
    title: string,
    position: number,
  ): Promise<Subtask>;
  toggleCompleted(id: string, completed: boolean): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(blockId: string, orderedIds: string[]): Promise<void>;
}
```

- [ ] **Step 2: Create TimerSessionRepository interface**

Create `src/domain/repositories/timer-session-repository.ts`:

```typescript
import { TimerSession } from "@/domain/entities/timer-session";

export interface TimerSessionRepository {
  findByBlockIds(blockIds: string[]): Promise<TimerSession[]>;
  findActiveForUser(userId: string): Promise<TimerSession | null>;
  startForBlock(
    userId: string,
    blockId: string,
  ): Promise<TimerSession>;
  stopActive(userId: string): Promise<void>;
  addManual(
    userId: string,
    blockId: string,
    startedAt: Date,
    endedAt: Date,
  ): Promise<TimerSession>;
}
```

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domain/repositories/subtask-repository.ts src/domain/repositories/timer-session-repository.ts
git commit -m "feat: add subtask and timer session repository interfaces"
```

---

## Task 5: Supabase Database Functions for Subtasks

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Add Subtask database functions**

Append to `src/infrastructure/supabase/database.ts`:

```typescript
// --- Subtasks ---

import type { Subtask } from "@/domain/entities/subtask";
import { createSubtask } from "@/domain/entities/subtask";

interface DbSubtask {
  id: string;
  block_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

function dbSubtaskToEntity(db: DbSubtask): Subtask {
  return createSubtask({
    id: db.id,
    blockId: db.block_id,
    title: db.title,
    completed: db.completed,
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchSubtasksForBlocks(
  blockIds: string[],
): Promise<Subtask[]> {
  if (blockIds.length === 0) return [];
  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .in("block_id", blockIds)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbSubtask[]).map(dbSubtaskToEntity);
}

export async function addSubtask(
  blockId: string,
  title: string,
  position: number,
): Promise<Subtask> {
  const { data, error } = await supabase
    .from("subtasks")
    .insert({ block_id: blockId, title, position })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbSubtaskToEntity(data as DbSubtask);
}

export async function toggleSubtaskCompleted(
  id: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("subtasks")
    .update({ completed })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderSubtasks(
  orderedIds: string[],
): Promise<void> {
  // Two-phase update to avoid UNIQUE(block_id, position) collisions:
  // Phase 1: shift all to negative positions (safe temporary space)
  // Phase 2: set target positions 0..N-1
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("subtasks")
      .update({ position: -(i + 1) })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("subtasks")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}
```

Also update the `position` CHECK constraint — since the two-phase reorder temporarily sets negative positions, drop the check. Update migration file to remove `check (position >= 0)` on subtasks table. But since migration already ran, add a follow-up:

Actually, since we still want `position >= 0` as final state, let's keep the check but defer it. PostgreSQL doesn't defer CHECK by default; the easiest fix is to drop the CHECK constraint. Add this to `002_subtasks_and_timer.sql` and document the user needs to re-run, OR use a different approach.

**Revised approach: use large temporary positions instead of negative.** Replace the reorder function:

```typescript
export async function reorderSubtasks(
  orderedIds: string[],
): Promise<void> {
  const OFFSET = 10000;
  // Phase 1: move to high temporary positions to avoid UNIQUE collision
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("subtasks")
      .update({ position: OFFSET + i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  // Phase 2: set final positions 0..N-1
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("subtasks")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}
```

Use this revised version in the file.

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "feat: add Supabase database functions for subtasks"
```

---

## Task 6: Supabase Database Functions for Timer

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Add TimerSession database functions**

Append to `src/infrastructure/supabase/database.ts`:

```typescript
// --- Timer Sessions ---

import type { TimerSession } from "@/domain/entities/timer-session";
import { createTimerSession } from "@/domain/entities/timer-session";

interface DbTimerSession {
  id: string;
  block_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

function dbTimerSessionToEntity(db: DbTimerSession): TimerSession {
  return createTimerSession({
    id: db.id,
    blockId: db.block_id,
    userId: db.user_id,
    startedAt: new Date(db.started_at),
    endedAt: db.ended_at ? new Date(db.ended_at) : null,
    durationSeconds: db.duration_seconds,
  });
}

export async function fetchTimerSessionsForBlocks(
  blockIds: string[],
): Promise<TimerSession[]> {
  if (blockIds.length === 0) return [];
  const { data, error } = await supabase
    .from("timer_sessions")
    .select("*")
    .in("block_id", blockIds);

  if (error) throw new Error(error.message);
  return (data as DbTimerSession[]).map(dbTimerSessionToEntity);
}

export async function fetchActiveSession(
  userId: string,
): Promise<TimerSession | null> {
  const { data, error } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbTimerSessionToEntity(data as DbTimerSession);
}

export async function stopActiveSession(userId: string): Promise<void> {
  const { data: active, error: findErr } = await supabase
    .from("timer_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!active) return;

  const startedAt = new Date(active.started_at);
  const endedAt = new Date();
  const durationSeconds = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
  );

  const { error } = await supabase
    .from("timer_sessions")
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", active.id);

  if (error) throw new Error(error.message);
}

export async function startTimerForBlock(
  userId: string,
  blockId: string,
): Promise<TimerSession> {
  // Stop any existing active session
  await stopActiveSession(userId);

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert({
      block_id: blockId,
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbTimerSessionToEntity(data as DbTimerSession);
}

export async function addManualSession(
  userId: string,
  blockId: string,
  startedAt: Date,
  endedAt: Date,
): Promise<TimerSession> {
  const durationSeconds = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
  );

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert({
      block_id: blockId,
      user_id: userId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbTimerSessionToEntity(data as DbTimerSession);
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "feat: add Supabase database functions for timer sessions"
```

---

## Task 7: Notification Provider & Snackbar

**Files:**
- Create: `src/presentation/providers/notification-provider.tsx`
- Create: `src/presentation/components/notifications/snackbar.tsx`
- Create: `src/__tests__/presentation/components/snackbar.test.tsx`

- [ ] **Step 1: Write Snackbar test**

Create `src/__tests__/presentation/components/snackbar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Snackbar } from "@/presentation/components/notifications/snackbar";

describe("Snackbar", () => {
  it("renders the message", () => {
    render(
      <Snackbar
        id="1"
        message="Saved successfully"
        type="success"
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    let closed = false;
    render(
      <Snackbar
        id="1"
        message="Error happened"
        type="error"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(closed).toBe(true);
  });

  it("applies error styling for error type", () => {
    render(
      <Snackbar
        id="1"
        message="Error happened"
        type="error"
        onClose={() => {}}
      />,
    );
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("data-type", "error");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/snackbar.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement Snackbar**

Create `src/presentation/components/notifications/snackbar.tsx`:

```tsx
"use client";

export type NotificationType = "error" | "success" | "info";

interface SnackbarProps {
  id: string;
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const colorForType: Record<NotificationType, string> = {
  error: "var(--color-block-buffer)",
  success: "var(--color-block-core)",
  info: "var(--color-accent)",
};

export function Snackbar({ message, type, onClose }: SnackbarProps) {
  return (
    <div
      role="status"
      data-type={type}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `4px solid ${colorForType[type]}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        color: "var(--color-text-primary)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "240px",
        maxWidth: "360px",
      }}
    >
      <span style={{ flex: 1, fontSize: "13px" }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="close"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "16px",
          padding: "0 4px",
        }}
      >
        &times;
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/snackbar.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Implement NotificationProvider**

Create `src/presentation/providers/notification-provider.tsx`:

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Snackbar, NotificationType } from "@/presentation/components/notifications/snackbar";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notify: (message: string, type: NotificationType) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Notification[]>([]);

  const notify = useCallback(
    (message: string, type: NotificationType) => {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Auto-dismiss: 5s for success/info, 8s for errors
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((item) => {
      const ms = item.type === "error" ? 8000 : 5000;
      return setTimeout(() => removeItem(item.id), ms);
    });
    return () => timers.forEach(clearTimeout);
  }, [items, removeItem]);

  const value: NotificationState = {
    notify,
    error: (m) => notify(m, "error"),
    success: (m) => notify(m, "success"),
    info: (m) => notify(m, "info"),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999,
        }}
      >
        {items.map((n) => (
          <Snackbar
            key={n.id}
            id={n.id}
            message={n.message}
            type={n.type}
            onClose={() => removeItem(n.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify must be used within NotificationProvider");
  return ctx;
}
```

- [ ] **Step 6: Wire into root layout**

Modify `src/app/layout.tsx`. Replace the file with:

```tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import { AppStateProvider } from "@/presentation/providers/app-state-provider";
import { NotificationProvider } from "@/presentation/providers/notification-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Block 6",
  description: "6區塊黃金比例時間分配法",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-theme="dark" suppressHydrationWarning>
      <body>
        <NotificationProvider>
          <AuthProvider>
            <AppStateProvider>{children}</AppStateProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Run all tests**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/providers/notification-provider.tsx src/presentation/components/notifications/ src/__tests__/presentation/components/snackbar.test.tsx src/app/layout.tsx
git commit -m "feat: add NotificationProvider and Snackbar for global error feedback"
```

---

## Task 8: Replace Silent Error Logs with Notifications

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`
- Modify: `src/app/review/page.tsx`

- [ ] **Step 1: Add useNotify to AppStateProvider and wrap catch blocks**

In `src/presentation/providers/app-state-provider.tsx`:

- Add import near the top: `import { useNotify } from "./notification-provider";`
- Inside the `AppStateProvider` function, after `const { user, loading: authLoading } = useAuth();`, add:

```typescript
  const notify = useNotify();
```

- Replace every existing `.catch((err) => { console.error("[BLOCK6] Failed to load week:", err); ...})` pattern. Specifically:

Find this block:
```typescript
        .catch((err) => {
          console.error("[BLOCK6] Failed to load week:", err);
          loadedWeeks.current.delete(weekKey);
        });
```

Replace with:
```typescript
        .catch((err) => {
          console.error(err);
          notify.error("載入週資料失敗");
          loadedWeeks.current.delete(weekKey);
        });
```

Find this block (in saveBlock):
```typescript
          .catch((err) => {
            console.error("[BLOCK6] Failed to save block:", err);
          });
```

Replace with:
```typescript
          .catch((err) => {
            console.error(err);
            notify.error("區塊儲存失敗");
          });
```

Find this block (in updateStatus):
```typescript
        updateBlockStatus(blockId, status).catch((err) => {
          console.error("[BLOCK6] Failed to update status:", err);
        });
```

Replace with:
```typescript
        updateBlockStatus(blockId, status).catch((err) => {
          console.error(err);
          notify.error("狀態更新失敗");
        });
```

Find this block (in saveDiary):
```typescript
        upsertDiary(user.id, dateKey, line1, line2, line3).catch((err) => {
          console.error("[BLOCK6] Failed to save diary:", err);
        });
```

Replace with:
```typescript
        upsertDiary(user.id, dateKey, line1, line2, line3).catch((err) => {
          console.error(err);
          notify.error("日記儲存失敗");
        });
```

Find the migration `.catch`:
```typescript
          .catch((err) => {
            console.error("[BLOCK6] Migration failed:", err);
          });
```

Replace with:
```typescript
          .catch((err) => {
            console.error(err);
            notify.error("資料遷移失敗，請重試");
          });
```

Since `notify` is now a dependency of some useCallback hooks, update their dependency arrays: `saveBlock`, `updateStatus`, `saveDiary`, `loadWeek`, and the migration `useEffect` should include `notify` where used.

- [ ] **Step 2: Update review page**

Modify `src/app/review/page.tsx` — replace the `handleSaveReflection` function:

```tsx
  const handleSaveReflection = (text: string) => {
    setReflection(text);
    if (user) {
      upsertReflection(user.id, weekKey, text).catch((err) => {
        console.error(err);
        notify.error("反思儲存失敗");
      });
    }
  };
```

And add at top:
```tsx
import { useNotify } from "@/presentation/providers/notification-provider";
```

And inside the component after `useAuth()`:
```tsx
  const notify = useNotify();
```

- [ ] **Step 3: Run lint, type-check, tests**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx src/app/review/page.tsx
git commit -m "feat: surface API errors via notification snackbars"
```

---

## Task 9: Extend AppStateProvider with Subtasks

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Add subtask state and operations**

In `src/presentation/providers/app-state-provider.tsx`:

Add to imports:
```typescript
import type { Subtask } from "@/domain/entities/subtask";
import {
  fetchSubtasksForBlocks,
  addSubtask as dbAddSubtask,
  toggleSubtaskCompleted as dbToggleSubtask,
  deleteSubtask as dbDeleteSubtask,
  reorderSubtasks as dbReorderSubtasks,
} from "@/infrastructure/supabase/database";
```

Add to `AppState` interface:
```typescript
  subtasks: Subtask[];
  getSubtasksForBlock: (blockId: string) => Subtask[];
  addSubtask: (blockId: string, title: string) => void;
  toggleSubtask: (id: string) => void;
  deleteSubtask: (id: string) => void;
  reorderSubtasks: (blockId: string, orderedIds: string[]) => void;
```

Add state inside the provider:
```typescript
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
```

Extend `loadWeek` to also fetch subtasks. Modify the existing `loadWeek`:

```typescript
  const loadWeek = useCallback(
    (weekKey: string) => {
      if (!user || loadedWeeks.current.has(weekKey)) return;
      loadedWeeks.current.add(weekKey);
      fetchBlocksForWeek(user.id, weekKey)
        .then(async (fetched) => {
          setSupaBlocks((prev) => {
            const withoutThisWeek = prev.filter(
              (b) => b.weekPlanId !== weekKey,
            );
            return [...withoutThisWeek, ...fetched];
          });
          if (fetched.length > 0) {
            const ids = fetched.map((b) => b.id);
            const fetchedSubs = await fetchSubtasksForBlocks(ids);
            setSubtasks((prev) => {
              const blockIdSet = new Set(ids);
              const other = prev.filter((s) => !blockIdSet.has(s.blockId));
              return [...other, ...fetchedSubs];
            });
          }
        })
        .catch((err) => {
          console.error(err);
          notify.error("載入週資料失敗");
          loadedWeeks.current.delete(weekKey);
        });
    },
    [user, notify],
  );
```

Add getter and operations:
```typescript
  const getSubtasksForBlock = useCallback(
    (blockId: string): Subtask[] => {
      return subtasks
        .filter((s) => s.blockId === blockId)
        .sort((a, b) => a.position - b.position);
    },
    [subtasks],
  );

  const addSubtask = useCallback(
    (blockId: string, title: string) => {
      if (!user) return;
      const existing = subtasks.filter((s) => s.blockId === blockId);
      const position =
        existing.length === 0
          ? 0
          : Math.max(...existing.map((s) => s.position)) + 1;
      dbAddSubtask(blockId, title, position)
        .then((created) => setSubtasks((prev) => [...prev, created]))
        .catch((err) => {
          console.error(err);
          notify.error("細項新增失敗");
        });
    },
    [user, subtasks, notify],
  );

  const toggleSubtask = useCallback(
    (id: string) => {
      const target = subtasks.find((s) => s.id === id);
      if (!target) return;
      const newCompleted = !target.completed;
      setSubtasks((prev) =>
        prev.map((s) => (s.id === id ? { ...s, completed: newCompleted } : s)),
      );
      dbToggleSubtask(id, newCompleted).catch((err) => {
        console.error(err);
        notify.error("細項更新失敗");
      });
    },
    [subtasks, notify],
  );

  const deleteSubtask = useCallback(
    (id: string) => {
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      dbDeleteSubtask(id).catch((err) => {
        console.error(err);
        notify.error("細項刪除失敗");
      });
    },
    [notify],
  );

  const reorderSubtasks = useCallback(
    (blockId: string, orderedIds: string[]) => {
      // Optimistic update: renumber locally
      setSubtasks((prev) => {
        const positionMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev.map((s) =>
          positionMap.has(s.id)
            ? { ...s, position: positionMap.get(s.id)! }
            : s,
        );
      });
      dbReorderSubtasks(orderedIds).catch((err) => {
        console.error(err);
        notify.error("細項排序失敗");
      });
    },
    [notify],
  );
```

Expose these in the context value:
```typescript
    <AppStateContext.Provider
      value={{
        allBlocks: blocks,
        getBlocksForWeek,
        saveBlock,
        updateStatus,
        diaryEntries,
        saveDiary,
        getDiary,
        reflection,
        setReflection,
        loadWeek,
        loadDiary,
        loadReflection,
        subtasks,
        getSubtasksForBlock,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        reorderSubtasks,
      }}
    >
```

- [ ] **Step 2: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: extend AppStateProvider with subtask state and operations"
```

---

## Task 10: Extend AppStateProvider with Timer

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Add timer state and operations**

In `src/presentation/providers/app-state-provider.tsx`:

Add to imports:
```typescript
import type { TimerSession } from "@/domain/entities/timer-session";
import {
  fetchTimerSessionsForBlocks,
  fetchActiveSession,
  startTimerForBlock,
  stopActiveSession,
  addManualSession as dbAddManualSession,
} from "@/infrastructure/supabase/database";
```

Add to `AppState` interface:
```typescript
  timerSessions: TimerSession[];
  activeTimer: TimerSession | null;
  getElapsedSeconds: (blockId: string, now: Date) => number;
  startTimer: (blockId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  addManualTimer: (
    blockId: string,
    startedAt: Date,
    endedAt: Date,
  ) => Promise<void>;
```

Add state inside the provider:
```typescript
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimerSession | null>(null);
```

Extend `loadWeek` to also fetch timer sessions for those blocks. Find the existing subtask-loading block inside `loadWeek` and replace the whole `.then(async (fetched) => { ... })` with:

```typescript
        .then(async (fetched) => {
          setSupaBlocks((prev) => {
            const withoutThisWeek = prev.filter(
              (b) => b.weekPlanId !== weekKey,
            );
            return [...withoutThisWeek, ...fetched];
          });
          if (fetched.length > 0) {
            const ids = fetched.map((b) => b.id);
            const [fetchedSubs, fetchedSessions] = await Promise.all([
              fetchSubtasksForBlocks(ids),
              fetchTimerSessionsForBlocks(ids),
            ]);
            const blockIdSet = new Set(ids);
            setSubtasks((prev) => {
              const other = prev.filter((s) => !blockIdSet.has(s.blockId));
              return [...other, ...fetchedSubs];
            });
            setTimerSessions((prev) => {
              const other = prev.filter((s) => !blockIdSet.has(s.blockId));
              return [...other, ...fetchedSessions];
            });
          }
        })
```

Load active timer on login. Add a new useEffect after the migration effect:

```typescript
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveTimer(null);
      return;
    }
    fetchActiveSession(user!.id)
      .then((active) => setActiveTimer(active))
      .catch((err) => {
        console.error(err);
        notify.error("載入計時器狀態失敗");
      });
  }, [isLoggedIn, user, notify]);
```

Add operations:

```typescript
  const getElapsedSeconds = useCallback(
    (blockId: string, now: Date): number => {
      const sessions = timerSessions.filter((s) => s.blockId === blockId);
      let total = 0;
      for (const s of sessions) {
        if (s.endedAt) {
          total += s.durationSeconds ?? 0;
        } else {
          total += Math.floor(
            (now.getTime() - s.startedAt.getTime()) / 1000,
          );
        }
      }
      return total;
    },
    [timerSessions],
  );

  const startTimer = useCallback(
    async (blockId: string) => {
      if (!user) return;
      try {
        // Close active session in local state first
        if (activeTimer) {
          const nowDate = new Date();
          const duration = Math.floor(
            (nowDate.getTime() - activeTimer.startedAt.getTime()) / 1000,
          );
          setTimerSessions((prev) =>
            prev.map((s) =>
              s.id === activeTimer.id
                ? { ...s, endedAt: nowDate, durationSeconds: duration }
                : s,
            ),
          );
        }
        const newSession = await startTimerForBlock(user.id, blockId);
        setActiveTimer(newSession);
        setTimerSessions((prev) => {
          const existing = prev.find((s) => s.id === newSession.id);
          return existing ? prev : [...prev, newSession];
        });
      } catch (err) {
        console.error(err);
        notify.error("計時器啟動失敗");
      }
    },
    [user, activeTimer, notify],
  );

  const stopTimer = useCallback(async () => {
    if (!user || !activeTimer) return;
    try {
      await stopActiveSession(user.id);
      const nowDate = new Date();
      const duration = Math.floor(
        (nowDate.getTime() - activeTimer.startedAt.getTime()) / 1000,
      );
      setTimerSessions((prev) =>
        prev.map((s) =>
          s.id === activeTimer.id
            ? { ...s, endedAt: nowDate, durationSeconds: duration }
            : s,
        ),
      );
      setActiveTimer(null);
    } catch (err) {
      console.error(err);
      notify.error("計時器停止失敗");
    }
  }, [user, activeTimer, notify]);

  const addManualTimer = useCallback(
    async (blockId: string, startedAt: Date, endedAt: Date) => {
      if (!user) return;
      try {
        const created = await dbAddManualSession(
          user.id,
          blockId,
          startedAt,
          endedAt,
        );
        setTimerSessions((prev) => [...prev, created]);
      } catch (err) {
        console.error(err);
        notify.error("手動新增時段失敗");
      }
    },
    [user, notify],
  );
```

Expose in context value — extend the existing value object:
```typescript
        timerSessions,
        activeTimer,
        getElapsedSeconds,
        startTimer,
        stopTimer,
        addManualTimer,
```

- [ ] **Step 2: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: extend AppStateProvider with timer state and operations"
```

---

## Task 11: Install @dnd-kit

**Files:** (no file changes, just dependency install)

- [ ] **Step 1: Install**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @dnd-kit packages for subtask drag-drop"
```

---

## Task 12: SubtaskList Component

**Files:**
- Create: `src/presentation/components/side-panel/subtask-list.tsx`
- Create: `src/__tests__/presentation/components/subtask-list.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/subtask-list.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubtaskList } from "@/presentation/components/side-panel/subtask-list";
import type { Subtask } from "@/domain/entities/subtask";

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "s-1",
    blockId: "b-1",
    title: "寫測試",
    completed: false,
    position: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("SubtaskList", () => {
  it("renders each subtask title", () => {
    const items = [
      makeSubtask({ id: "s-1", title: "寫測試", position: 0 }),
      makeSubtask({ id: "s-2", title: "實作 API", position: 1 }),
    ];
    render(
      <SubtaskList
        blockId="b-1"
        items={items}
        onAdd={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByText("寫測試")).toBeInTheDocument();
    expect(screen.getByText("實作 API")).toBeInTheDocument();
  });

  it("calls onAdd when user submits a new item", async () => {
    const user = userEvent.setup();
    let added: string | null = null;
    render(
      <SubtaskList
        blockId="b-1"
        items={[]}
        onAdd={(title) => {
          added = title;
        }}
        onToggle={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/新增細項/);
    await user.type(input, "新任務{Enter}");
    expect(added).toBe("新任務");
  });

  it("calls onToggle when checkbox clicked", async () => {
    const user = userEvent.setup();
    let toggled: string | null = null;
    render(
      <SubtaskList
        blockId="b-1"
        items={[makeSubtask({ id: "s-1", title: "寫測試" })]}
        onAdd={() => {}}
        onToggle={(id) => {
          toggled = id;
        }}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(toggled).toBe("s-1");
  });

  it("calls onDelete when delete button clicked", async () => {
    const user = userEvent.setup();
    let deleted: string | null = null;
    render(
      <SubtaskList
        blockId="b-1"
        items={[makeSubtask({ id: "s-1", title: "寫測試" })]}
        onAdd={() => {}}
        onToggle={() => {}}
        onDelete={(id) => {
          deleted = id;
        }}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(deleted).toBe("s-1");
  });

  it("shows advisory warning when more than 7 items", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeSubtask({ id: `s-${i}`, title: `任務 ${i}`, position: i }),
    );
    render(
      <SubtaskList
        blockId="b-1"
        items={items}
        onAdd={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByText(/建議不超過/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/subtask-list.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SubtaskList**

Create `src/presentation/components/side-panel/subtask-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Subtask } from "@/domain/entities/subtask";
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

interface SubtaskListProps {
  blockId: string;
  items: Subtask[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

function SortableItem({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
        opacity: subtask.completed ? 0.6 : 1,
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
        checked={subtask.completed}
        onChange={() => onToggle(subtask.id)}
        style={{ cursor: "pointer" }}
      />
      <span
        style={{
          flex: 1,
          color: "var(--color-text-primary)",
          fontSize: "13px",
          textDecoration: subtask.completed ? "line-through" : "none",
        }}
      >
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.id)}
        aria-label="delete"
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

export function SubtaskList({
  items,
  onAdd,
  onToggle,
  onDelete,
  onReorder,
}: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  };

  const submitNew = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        細項任務
      </label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((subtask) => (
            <SortableItem
              key={subtask.id}
              subtask={subtask}
              onToggle={onToggle}
              onDelete={onDelete}
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
        placeholder="+ 新增細項..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "6px 8px",
          fontSize: "13px",
        }}
      />
      {items.length > 7 && (
        <span
          style={{
            color: "var(--color-block-rest)",
            fontSize: "11px",
            fontStyle: "italic",
          }}
        >
          建議不超過 7 項以保持專注
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/subtask-list.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/side-panel/subtask-list.tsx src/__tests__/presentation/components/subtask-list.test.tsx
git commit -m "feat: add SubtaskList component with drag-reorder"
```

---

## Task 13: BlockTimer Component

**Files:**
- Create: `src/presentation/components/side-panel/block-timer.tsx`
- Create: `src/__tests__/presentation/components/block-timer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/block-timer.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockTimer } from "@/presentation/components/side-panel/block-timer";

describe("BlockTimer", () => {
  it("formats elapsed seconds as HH:MM:SS", () => {
    render(
      <BlockTimer
        elapsedSeconds={3661}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
      />,
    );
    expect(screen.getByText("01:01:01")).toBeInTheDocument();
  });

  it("shows start button when not active", () => {
    render(
      <BlockTimer
        elapsedSeconds={0}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /開始計時/ })).toBeInTheDocument();
  });

  it("shows stop button when active", () => {
    render(
      <BlockTimer
        elapsedSeconds={60}
        isActive={true}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /停止計時/ })).toBeInTheDocument();
  });

  it("calls onStart when start clicked (no other active)", async () => {
    const user = userEvent.setup();
    let started = false;
    render(
      <BlockTimer
        elapsedSeconds={0}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {
          started = true;
        }}
        onStop={() => {}}
        onAddManual={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /開始計時/ }));
    expect(started).toBe(true);
  });

  it("opens manual entry form", async () => {
    const user = userEvent.setup();
    render(
      <BlockTimer
        elapsedSeconds={0}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /手動新增/ }));
    expect(screen.getByLabelText(/開始時間/)).toBeInTheDocument();
    expect(screen.getByLabelText(/結束時間/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/block-timer.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement BlockTimer**

Create `src/presentation/components/side-panel/block-timer.tsx`:

```tsx
"use client";

import { useState } from "react";

interface BlockTimerProps {
  elapsedSeconds: number;
  isActive: boolean;
  otherBlockIsActive: boolean;
  onStart: () => void;
  onStop: () => void;
  onAddManual: (startedAt: Date, endedAt: Date) => void;
}

function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BlockTimer({
  elapsedSeconds,
  isActive,
  otherBlockIsActive,
  onStart,
  onStop,
  onAddManual,
}: BlockTimerProps) {
  const [showManual, setShowManual] = useState(false);
  const [startedAt, setStartedAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000)),
  );
  const [endedAt, setEndedAt] = useState(() => toLocalInputValue(new Date()));

  const handleStartClick = () => {
    if (otherBlockIsActive) {
      const confirmed = window.confirm(
        "其他區塊正在計時中，開始此任務會自動停止。確定嗎？",
      );
      if (!confirmed) return;
    }
    onStart();
  };

  const handleManualSubmit = () => {
    const s = new Date(startedAt);
    const e = new Date(endedAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
      window.alert("結束時間必須晚於開始時間");
      return;
    }
    onAddManual(s, e);
    setShowManual(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        計時
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--color-bg-tertiary)",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: 600,
            fontFamily: "monospace",
            color: isActive
              ? "var(--color-status-in-progress)"
              : "var(--color-text-primary)",
          }}
        >
          {formatHMS(elapsedSeconds)}
        </span>
        {isActive ? (
          <button
            onClick={onStop}
            style={{
              marginLeft: "auto",
              background: "var(--color-block-buffer)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ⏸ 停止計時
          </button>
        ) : (
          <button
            onClick={handleStartClick}
            style={{
              marginLeft: "auto",
              background: "var(--color-accent)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ▶ 開始計時
          </button>
        )}
      </div>
      {!showManual ? (
        <button
          onClick={() => setShowManual(true)}
          style={{
            background: "none",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          + 手動新增
        </button>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "8px",
            background: "var(--color-bg-tertiary)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            開始時間
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              style={{
                marginLeft: "6px",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 4px",
                fontSize: "12px",
              }}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            結束時間
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              style={{
                marginLeft: "6px",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 4px",
                fontSize: "12px",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowManual(false)}
              style={{
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-secondary)",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              取消
            </button>
            <button
              onClick={handleManualSubmit}
              style={{
                background: "var(--color-accent)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              新增
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/block-timer.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/side-panel/block-timer.tsx src/__tests__/presentation/components/block-timer.test.tsx
git commit -m "feat: add BlockTimer component with start/stop and manual entry"
```

---

## Task 14: Wire Subtasks and Timer into SidePanel

**Files:**
- Modify: `src/presentation/components/side-panel/side-panel.tsx`

- [ ] **Step 1: Extend SidePanel props and render**

Replace `src/presentation/components/side-panel/side-panel.tsx` entirely with:

```tsx
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
import type { Subtask } from "@/domain/entities/subtask";
import { BlockEditor } from "./block-editor";
import { StatusToggle } from "./status-toggle";
import { DiaryForm } from "./diary-form";
import { SubtaskList } from "./subtask-list";
import { BlockTimer } from "./block-timer";

interface SidePanelProps {
  dayOfWeek: number;
  slot: number;
  block: Block | null;
  diaryLines: { line1: string; line2: string; line3: string } | null;
  isToday: boolean;
  subtasks: Subtask[];
  elapsedSeconds: number;
  isTimerActive: boolean;
  otherBlockIsActive: boolean;
  onSaveBlock: (
    title: string,
    description: string,
    blockType: BlockType,
  ) => void;
  onStatusChange: (status: BlockStatus) => void;
  onSaveDiary: (line1: string, line2: string, line3: string) => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onReorderSubtasks: (orderedIds: string[]) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onAddManualTimer: (startedAt: Date, endedAt: Date) => void;
  onClose: () => void;
}

const DAY_LABELS = ["", "一", "二", "三", "四", "五", "六", "日"];

export function SidePanel({
  dayOfWeek,
  slot,
  block,
  diaryLines,
  isToday,
  subtasks,
  elapsedSeconds,
  isTimerActive,
  otherBlockIsActive,
  onSaveBlock,
  onStatusChange,
  onSaveDiary,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onStartTimer,
  onStopTimer,
  onAddManualTimer,
  onClose,
}: SidePanelProps) {
  return (
    <aside
      style={{
        width: "320px",
        background: "var(--color-panel-bg)",
        borderLeft: "1px solid var(--color-border)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
          週{DAY_LABELS[dayOfWeek]} · 區塊 {slot}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          &times;
        </button>
      </div>
      <BlockEditor
        key={`editor-${dayOfWeek}-${slot}`}
        title={block?.title ?? ""}
        description={block?.description ?? ""}
        blockType={block?.blockType ?? BlockType.Core}
        onSave={onSaveBlock}
      />
      {block && (
        <>
          <SubtaskList
            blockId={block.id}
            items={subtasks}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
            onReorder={onReorderSubtasks}
          />
          <BlockTimer
            elapsedSeconds={elapsedSeconds}
            isActive={isTimerActive}
            otherBlockIsActive={otherBlockIsActive}
            onStart={onStartTimer}
            onStop={onStopTimer}
            onAddManual={onAddManualTimer}
          />
          <div>
            <label
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "6px",
                display: "block",
              }}
            >
              狀態
            </label>
            <StatusToggle status={block.status} onChange={onStatusChange} />
          </div>
        </>
      )}
      {isToday && (
        <DiaryForm
          key={`diary-${dayOfWeek}`}
          line1={diaryLines?.line1 ?? ""}
          line2={diaryLines?.line2 ?? ""}
          line3={diaryLines?.line3 ?? ""}
          onSave={onSaveDiary}
        />
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: Will FAIL because `page.tsx` doesn't pass the new props yet. That's expected — we'll fix it in the next task. For now ensure the component file itself compiles:

Create a temporary small test file to verify the component module compiles. Actually, skip this step — it's fine that page.tsx doesn't match yet; the next task fixes it. Proceed to commit.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/side-panel/side-panel.tsx
git commit -m "feat: extend SidePanel with subtasks and timer sections"
```

---

## Task 15: Wire Everything in Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update DashboardPage to use new app state**

Replace `src/app/page.tsx` entirely with:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/presentation/components/header/header";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";
import { SidePanel } from "@/presentation/components/side-panel/side-panel";
import { DayView } from "@/presentation/components/day-view/day-view";
import { WeekOverview } from "@/presentation/components/week-overview/week-overview";
import { useTheme } from "@/presentation/hooks/use-theme";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useAuth } from "@/presentation/providers/auth-provider";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface SelectedCell {
  dayOfWeek: number;
  slot: number;
}

function formatDateKey(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

function isTodayInWeek(weekStart: Date, dayOfWeek: number): boolean {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekPlan();
  const {
    getBlocksForWeek,
    saveBlock,
    updateStatus,
    saveDiary,
    getDiary,
    loadWeek,
    loadDiary,
    getSubtasksForBlock,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    activeTimer,
    getElapsedSeconds,
    startTimer,
    stopTimer,
    addManualTimer,
  } = useAppState();
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [mobileDay, setMobileDay] = useState<number>(new Date().getDay() || 7);
  const [mobileView, setMobileView] = useState<"day" | "overview">("day");
  const [now, setNow] = useState<Date>(new Date());

  const weekKey = weekStart.toISOString().split("T")[0];
  const blocks = getBlocksForWeek(weekKey);

  useEffect(() => {
    loadWeek(weekKey);
  }, [weekKey, loadWeek]);

  useEffect(() => {
    if (selected) {
      const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
      loadDiary(dateKey);
    }
  }, [selected, weekStart, loadDiary]);

  // Tick every second to update elapsed time while a timer is running
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const completedCount = blocks.filter(
    (b) => b.status === BlockStatus.Completed,
  ).length;
  const totalCount = blocks.length;
  const completionPct =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleBlockClick = (dayOfWeek: number, slot: number) => {
    setSelected({ dayOfWeek, slot });
  };

  const selectedBlock = selected
    ? (blocks.find(
        (b) =>
          b.dayOfWeek === selected.dayOfWeek && b.slot === selected.slot,
      ) ?? null)
    : null;

  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selected) return;
    saveBlock(
      weekKey,
      selected.dayOfWeek,
      selected.slot,
      title,
      description,
      blockType,
    );
  };

  const handleStatusChange = (status: BlockStatus) => {
    if (!selectedBlock) return;
    updateStatus(selectedBlock.id, status);
  };

  const handleSaveDiary = (line1: string, line2: string, line3: string) => {
    if (!selected) return;
    const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
    saveDiary(dateKey, line1, line2, line3);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header
        weekStart={weekStart}
        theme={theme}
        userEmail={user?.email ?? null}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, padding: "16px", overflow: "auto" }}>
          <div className="desktop-only">
            <WeekGrid blocks={blocks} onBlockClick={handleBlockClick} />
          </div>
          <div className="mobile-only">
            {mobileView === "day" ? (
              <DayView
                dayOfWeek={mobileDay}
                blocks={blocks}
                onBlockClick={handleBlockClick}
                onPreviousDay={
                  mobileDay > 1
                    ? () => setMobileDay((d) => d - 1)
                    : undefined
                }
                onNextDay={
                  mobileDay < 7
                    ? () => setMobileDay((d) => d + 1)
                    : undefined
                }
              />
            ) : (
              <WeekOverview
                blocks={blocks}
                onDayClick={(day) => {
                  setMobileDay(day);
                  setMobileView("day");
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                padding: "12px 0",
                borderTop: "1px solid var(--color-border)",
                marginTop: "16px",
              }}
            >
              <button
                onClick={() => setMobileView("overview")}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    mobileView === "overview"
                      ? "var(--color-accent)"
                      : "var(--color-text-secondary)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                週總覽
              </button>
              <button
                onClick={() => setMobileView("day")}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    mobileView === "day"
                      ? "var(--color-accent)"
                      : "var(--color-text-secondary)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                今日
              </button>
              <a
                href="/review"
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                }}
              >
                回顧
              </a>
            </div>
          </div>
        </main>
        {selected && (
          <SidePanel
            dayOfWeek={selected.dayOfWeek}
            slot={selected.slot}
            block={selectedBlock}
            diaryLines={getDiary(formatDateKey(weekStart, selected.dayOfWeek))}
            isToday={isTodayInWeek(weekStart, selected.dayOfWeek)}
            subtasks={selectedBlock ? getSubtasksForBlock(selectedBlock.id) : []}
            elapsedSeconds={
              selectedBlock ? getElapsedSeconds(selectedBlock.id, now) : 0
            }
            isTimerActive={
              !!(selectedBlock && activeTimer?.blockId === selectedBlock.id)
            }
            otherBlockIsActive={
              !!activeTimer &&
              !!selectedBlock &&
              activeTimer.blockId !== selectedBlock.id
            }
            onSaveBlock={handleSaveBlock}
            onStatusChange={handleStatusChange}
            onSaveDiary={handleSaveDiary}
            onAddSubtask={(title) => {
              if (selectedBlock) addSubtask(selectedBlock.id, title);
            }}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
            onReorderSubtasks={(orderedIds) => {
              if (selectedBlock) reorderSubtasks(selectedBlock.id, orderedIds);
            }}
            onStartTimer={() => {
              if (selectedBlock) startTimer(selectedBlock.id);
            }}
            onStopTimer={() => {
              stopTimer();
            }}
            onAddManualTimer={(s, e) => {
              if (selectedBlock) addManualTimer(selectedBlock.id, s, e);
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      {blocks.length > 0 && (
        <footer
          className="desktop-only"
          style={{
            padding: "8px 24px",
            backgroundColor: "var(--color-bg-secondary)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            本週完成率 {completionPct}% ({completedCount}/{totalCount})
          </span>
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              height: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "var(--color-status-completed)",
                height: "100%",
                width: `${completionPct}%`,
                borderRadius: "var(--radius-sm)",
                transition: "width 0.3s",
              }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run full checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire subtasks, timer, and live elapsed display into dashboard"
```

---

## Task 16: Final Verification & Format

**Files:** (no specific changes, verification and formatting)

- [ ] **Step 1: Run formatter**

```bash
pnpm format
```

- [ ] **Step 2: Run full quality check**

```bash
pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: All PASS.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:3000`, verify:
- Login works
- Select a block → side panel opens
- Add 2 subtasks → they appear
- Check a subtask → strikethrough applied
- Drag a subtask → order changes
- Click "開始計時" → timer ticks up every second
- Switch to a different block, click "開始計時" → confirm dialog, first timer stops
- Click "手動新增" → fill in times → session appears in elapsed total
- Reload page → active timer still running (cross-device state)
- Trigger any Supabase failure (e.g. disable network) → snackbar appears

- [ ] **Step 4: If issues remain, fix them and re-run checks**

- [ ] **Step 5: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: format and final polish for subtasks/timer/notifications"
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "feat: subtasks, timer, and notifications" --body "$(cat <<'EOF'
## Summary

- Adds checklist subtasks per block with drag-to-reorder
- Adds block-level timer with start/stop and manual session entry (single-active-timer rule)
- Adds global snackbar notifications replacing silent console errors
- Migration: supabase/migrations/002_subtasks_and_timer.sql

## Test plan

- [ ] Add/check/delete/reorder subtasks
- [ ] Start/stop timer; verify ticks every second
- [ ] Start timer on block A, then block B → confirm dialog appears
- [ ] Add manual session → total elapsed updates
- [ ] Reload page → active timer state persists
- [ ] Induce API failure → snackbar appears

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**

- Subtask entity + RLS — Task 1, 2 ✓
- TimerSession entity + RLS + single-active rule — Task 1, 3, 6 ✓
- Repository interfaces — Task 4 ✓
- Supabase DB functions — Task 5, 6 ✓
- NotificationProvider + Snackbar — Task 7 ✓
- Replace silent errors — Task 8 ✓
- AppState extension for subtasks — Task 9 ✓
- AppState extension for timer — Task 10 ✓
- @dnd-kit install — Task 11 ✓
- SubtaskList component with drag-drop + warning — Task 12 ✓
- BlockTimer component with manual entry — Task 13 ✓
- SidePanel integration — Task 14 ✓
- Dashboard wiring + live tick — Task 15 ✓
- Final verification + PR — Task 16 ✓

**2. Placeholder scan:** No TBD/TODO. All steps have concrete code.

**3. Type consistency:** Verified — `Subtask`, `TimerSession` types used consistently. Repository interfaces match DB function signatures where relevant. `onAddManual(startedAt: Date, endedAt: Date)` used consistently across `BlockTimer`, `SidePanel`, `page.tsx`, and `addManualTimer` in AppState.
