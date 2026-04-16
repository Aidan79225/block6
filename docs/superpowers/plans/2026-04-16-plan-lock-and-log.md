# Plan Lock & Change Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock today's blocks so any change requires a written reason, log the reasons, and surface them in a navigable weekly review.

**Architecture:** Add a new `PlanChange` domain entity and a `plan_changes` Supabase table (with localStorage fallback). A new `PlanChangeDialog` modal intercepts save/swap/move actions whose source OR destination falls on today's calendar date, prompts for a reason, and calls the existing mutation plus `addPlanChange`. The review page gains a `WeekNavigator` and a new `PlanChangesLog` section; it already uses the shared `useWeekPlan` hook so state is shared with the dashboard.

**Tech Stack:** TypeScript, React, Next.js (App Router), Supabase (Postgres + RLS), Vitest.

---

## File Structure

```
src/
  domain/
    entities/
      plan-change.ts                                               (create)
    repositories/
      plan-change-repository.ts                                    (create)
    usecases/
      log-plan-change.ts                                           (create)
  infrastructure/
    supabase/
      database.ts                                                  (modify)
  presentation/
    providers/
      app-state-provider.tsx                                       (modify)
    components/
      plan-change-dialog/
        plan-change-dialog.tsx                                     (create)
      review/
        plan-changes-log.tsx                                       (create)
  app/
    page.tsx                                                       (modify)
    review/
      page.tsx                                                     (modify)

supabase/
  migrations/
    007_plan_changes.sql                                           (create)

tests/
  domain/
    usecases/
      log-plan-change.test.ts                                      (create)
```

---

## Task 1: Domain Entity, Use Case, and Repository Interface

**Files:**
- Create: `src/domain/entities/plan-change.ts`
- Create: `src/domain/repositories/plan-change-repository.ts`
- Create: `src/domain/usecases/log-plan-change.ts`
- Create: `tests/domain/usecases/log-plan-change.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/domain/usecases/log-plan-change.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { logPlanChange } from "@/domain/usecases/log-plan-change";

describe("logPlanChange", () => {
  const baseInput = {
    userId: "user-1",
    weekKey: "2026-04-13",
    dayOfWeek: 3,
    slot: 2,
    blockTitleSnapshot: "讀書",
    action: "edit" as const,
    reason: "今天不想讀",
  };

  it("constructs a PlanChange with generated id and createdAt", () => {
    const change = logPlanChange(baseInput);
    expect(change.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(change.userId).toBe("user-1");
    expect(change.weekKey).toBe("2026-04-13");
    expect(change.dayOfWeek).toBe(3);
    expect(change.slot).toBe(2);
    expect(change.blockTitleSnapshot).toBe("讀書");
    expect(change.action).toBe("edit");
    expect(change.reason).toBe("今天不想讀");
    expect(change.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("trims whitespace from reason", () => {
    const change = logPlanChange({ ...baseInput, reason: "  too busy  " });
    expect(change.reason).toBe("too busy");
  });

  it("throws if reason is empty after trim", () => {
    expect(() => logPlanChange({ ...baseInput, reason: "" })).toThrow();
    expect(() => logPlanChange({ ...baseInput, reason: "   " })).toThrow();
  });

  it("accepts null userId for anonymous/local mode", () => {
    const change = logPlanChange({ ...baseInput, userId: null });
    expect(change.userId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/domain/usecases/log-plan-change.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the entity**

Create `src/domain/entities/plan-change.ts`:

```ts
export type PlanChangeAction = "edit" | "move" | "add";

export interface PlanChange {
  readonly id: string;
  readonly userId: string | null;
  readonly weekKey: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockTitleSnapshot: string;
  readonly action: PlanChangeAction;
  readonly reason: string;
  readonly createdAt: string;
}
```

- [ ] **Step 4: Create the repository interface**

Create `src/domain/repositories/plan-change-repository.ts`:

```ts
import type { PlanChange } from "@/domain/entities/plan-change";

export interface PlanChangeRepository {
  listByWeek(userId: string, weekKey: string): Promise<PlanChange[]>;
  create(change: PlanChange): Promise<PlanChange>;
}
```

- [ ] **Step 5: Create the use case**

Create `src/domain/usecases/log-plan-change.ts`:

```ts
import type {
  PlanChange,
  PlanChangeAction,
} from "@/domain/entities/plan-change";

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
  const trimmed = input.reason.trim();
  if (trimmed.length === 0) {
    throw new Error("reason must not be empty");
  }
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    weekKey: input.weekKey,
    dayOfWeek: input.dayOfWeek,
    slot: input.slot,
    blockTitleSnapshot: input.blockTitleSnapshot,
    action: input.action,
    reason: trimmed,
    createdAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run tests/domain/usecases/log-plan-change.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full suite**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain/entities/plan-change.ts src/domain/repositories/plan-change-repository.ts src/domain/usecases/log-plan-change.ts tests/domain/usecases/log-plan-change.test.ts
git commit -m "feat: add PlanChange domain entity and logPlanChange use case"
```

---

## Task 2: Supabase Migration + Database CRUD

**Files:**
- Create: `supabase/migrations/007_plan_changes.sql`
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/007_plan_changes.sql`:

```sql
-- Plan change log: append-only record of reasons for modifying today's plan

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

- [ ] **Step 2: Add database CRUD functions**

Open `src/infrastructure/supabase/database.ts`. Add this block at the end of the file (after all existing exports):

```ts
// --- Plan changes ---

import type { PlanChange, PlanChangeAction } from "@/domain/entities/plan-change";

interface DbPlanChange {
  id: string;
  user_id: string;
  week_key: string;
  day_of_week: number;
  slot: number;
  block_title_snapshot: string;
  action: PlanChangeAction;
  reason: string;
  created_at: string;
}

function dbPlanChangeToEntity(db: DbPlanChange): PlanChange {
  return {
    id: db.id,
    userId: db.user_id,
    weekKey: db.week_key,
    dayOfWeek: db.day_of_week,
    slot: db.slot,
    blockTitleSnapshot: db.block_title_snapshot,
    action: db.action,
    reason: db.reason,
    createdAt: db.created_at,
  };
}

export async function fetchPlanChangesForWeek(
  userId: string,
  weekKey: string,
): Promise<PlanChange[]> {
  const { data, error } = await supabase
    .from("plan_changes")
    .select("*")
    .eq("user_id", userId)
    .eq("week_key", weekKey)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(dbPlanChangeToEntity);
}

export async function insertPlanChange(
  change: PlanChange,
): Promise<PlanChange> {
  if (!change.userId) throw new Error("insertPlanChange requires a userId");
  const { data, error } = await supabase
    .from("plan_changes")
    .insert({
      id: change.id,
      user_id: change.userId,
      week_key: change.weekKey,
      day_of_week: change.dayOfWeek,
      slot: change.slot,
      block_title_snapshot: change.blockTitleSnapshot,
      action: change.action,
      reason: change.reason,
      created_at: change.createdAt,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return dbPlanChangeToEntity(data as DbPlanChange);
}
```

Note: the existing `database.ts` already imports `supabase` at the top; reuse that. Move the `import type { PlanChange, ... }` line to the top of the file with the other imports, not inline at the end.

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_plan_changes.sql src/infrastructure/supabase/database.ts
git commit -m "feat: add plan_changes table and CRUD helpers"
```

- [ ] **Step 5: Apply the migration**

Run (locally, against the remote Supabase project — same way prior migrations were applied):

```bash
pnpm supabase db push
```

Expected: migration 007 applied cleanly.

---

## Task 3: App-State Provider Plumbing

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Add imports and interface fields**

At the top of `src/presentation/providers/app-state-provider.tsx`, near the other `@/infrastructure/supabase/database` imports (around line 50), extend the import list to include the two new helpers:

```ts
  fetchPlanChangesForWeek,
  insertPlanChange,
```

(Added alongside the existing comma-separated imports.)

Below the existing `import type { DiaryLines } from "@/infrastructure/supabase/database";` line, add:

```ts
import type { PlanChange } from "@/domain/entities/plan-change";
import { logPlanChange } from "@/domain/usecases/log-plan-change";
import type { LogPlanChangeInput } from "@/domain/usecases/log-plan-change";
```

- [ ] **Step 2: Extend the `AppState` interface**

Inside the `interface AppState {` block, near `copyPreviousWeekPlan` (around line 65), add:

```ts
  planChanges: Record<string, PlanChange[]>;
  loadPlanChanges: (weekKey: string) => Promise<void>;
  addPlanChange: (input: Omit<LogPlanChangeInput, "userId">) => Promise<void>;
```

- [ ] **Step 3: Add the localStorage key constant**

Near the top of the component-body area (just before `export function AppStateProvider(` or inside the function above the state hooks), add:

```ts
const PLAN_CHANGES_STORAGE_KEY = (userIdOrAnon: string) =>
  `block6:planChanges:${userIdOrAnon}`;
```

- [ ] **Step 4: Add state + load + add implementations**

Inside `AppStateProvider`, after the existing state hooks (look for other `useState` calls like `setSupaReflection`), add:

```ts
  const [planChanges, setPlanChanges] = useState<Record<string, PlanChange[]>>(
    {},
  );
  const loadedPlanChangeWeeks = useRef<Set<string>>(new Set());

  const loadPlanChanges = useCallback(
    async (weekKey: string) => {
      const key = user?.id ?? "anon";
      const cacheKey = `${key}:${weekKey}`;
      if (loadedPlanChangeWeeks.current.has(cacheKey)) return;
      loadedPlanChangeWeeks.current.add(cacheKey);

      if (user) {
        try {
          const rows = await fetchPlanChangesForWeek(user.id, weekKey);
          setPlanChanges((prev) => ({ ...prev, [weekKey]: rows }));
        } catch (err) {
          console.error(err);
          loadedPlanChangeWeeks.current.delete(cacheKey);
          notify.error("載入計畫變更紀錄失敗");
        }
        return;
      }

      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(PLAN_CHANGES_STORAGE_KEY("anon"));
        const all: PlanChange[] = raw ? JSON.parse(raw) : [];
        const forWeek = all.filter((c) => c.weekKey === weekKey);
        setPlanChanges((prev) => ({ ...prev, [weekKey]: forWeek }));
      } catch {
        setPlanChanges((prev) => ({ ...prev, [weekKey]: [] }));
      }
    },
    [user, notify],
  );

  const addPlanChange = useCallback(
    async (input: Omit<LogPlanChangeInput, "userId">) => {
      const userId = user?.id ?? null;
      const change = logPlanChange({ ...input, userId });

      setPlanChanges((prev) => {
        const existing = prev[input.weekKey] ?? [];
        return { ...prev, [input.weekKey]: [...existing, change] };
      });

      if (user) {
        try {
          await insertPlanChange(change);
        } catch (err) {
          console.error(err);
          notify.error("儲存計畫變更紀錄失敗");
        }
        return;
      }

      if (typeof window === "undefined") return;
      const storageKey = PLAN_CHANGES_STORAGE_KEY("anon");
      const raw = localStorage.getItem(storageKey);
      const all: PlanChange[] = raw ? JSON.parse(raw) : [];
      all.push(change);
      localStorage.setItem(storageKey, JSON.stringify(all));
    },
    [user, notify],
  );
```

- [ ] **Step 5: Export the new fields from the provider value**

Find the `value={{ ... }}` block near the bottom of the file (after the function bodies, around line 1067). Add these three lines near where `copyPreviousWeekPlan` is exported:

```ts
        planChanges,
        loadPlanChanges,
        addPlanChange,
```

- [ ] **Step 6: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: add planChanges state and addPlanChange to AppState"
```

---

## Task 4: PlanChangeDialog Component

**Files:**
- Create: `src/presentation/components/plan-change-dialog/plan-change-dialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/presentation/components/plan-change-dialog/plan-change-dialog.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface PlanChangeDialogProps {
  open: boolean;
  summary: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function PlanChangeDialog({
  open,
  summary,
  onCancel,
  onConfirm,
}: PlanChangeDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canConfirm = trimmed.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-change-dialog-title"
        style={{
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h2
          id="plan-change-dialog-title"
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--color-accent)",
            marginBottom: "8px",
          }}
        >
          Why are you changing today's plan?
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-text-secondary)",
            marginBottom: "16px",
          }}
        >
          {summary}
        </p>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "8px",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: "16px",
          }}
        />
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
        >
          <button
            onClick={onCancel}
            style={{
              background: "none",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              background: canConfirm
                ? "var(--color-accent)"
                : "var(--color-bg-tertiary)",
              color: canConfirm
                ? "var(--color-bg-primary)"
                : "var(--color-text-secondary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run checks**

```bash
pnpm lint && pnpm type-check
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/plan-change-dialog/plan-change-dialog.tsx
git commit -m "feat: add PlanChangeDialog modal"
```

---

## Task 5: Wire Dialog Into Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

After the existing `IntroDialog` import, add:

```tsx
import { PlanChangeDialog } from "@/presentation/components/plan-change-dialog/plan-change-dialog";
import type { PlanChangeAction } from "@/domain/entities/plan-change";
```

- [ ] **Step 2: Add the locked-day helper**

Below the existing `isDiaryEditableDay` function (around line 49), add:

```tsx
function isLockedDay(
  weekStart: Date,
  dayOfWeek: number,
  now: Date,
): boolean {
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));
  return (
    cellDate.getFullYear() === now.getFullYear() &&
    cellDate.getMonth() === now.getMonth() &&
    cellDate.getDate() === now.getDate()
  );
}
```

- [ ] **Step 3: Pull `addPlanChange` and `loadPlanChanges` out of `useAppState`**

In the `useAppState()` destructuring block (around line 55), add these two names to the list (after `copyPreviousWeekPlan`):

```tsx
    addPlanChange,
    loadPlanChanges,
```

- [ ] **Step 4: Load current week's plan changes on week change**

Near the other `useEffect` hooks that depend on `weekKey` (around lines 99–105), add:

```tsx
  useEffect(() => {
    loadPlanChanges(weekKey);
  }, [weekKey, loadPlanChanges]);
```

- [ ] **Step 5: Add pending-action state and dialog plumbing**

After `const [introOpen, setIntroOpen] = useState(false);` block (around line 94), add:

```tsx
  type PendingChange =
    | {
        kind: "save";
        dayOfWeek: number;
        slot: number;
        title: string;
        description: string;
        blockType: BlockType;
        action: PlanChangeAction;
      }
    | {
        kind: "swap";
        idA: string;
        idB: string;
        logDayOfWeek: number;
        logSlot: number;
        titleSnapshot: string;
      }
    | {
        kind: "move";
        id: string;
        dayOfWeek: number;
        slot: number;
        logDayOfWeek: number;
        logSlot: number;
        titleSnapshot: string;
      };

  const [pendingChange, setPendingChange] = useState<PendingChange | null>(
    null,
  );

  const pendingSummary = (() => {
    if (!pendingChange) return "";
    if (pendingChange.kind === "save") {
      if (pendingChange.action === "add") {
        return `Add: "${pendingChange.title}" to day ${pendingChange.dayOfWeek} slot ${pendingChange.slot}`;
      }
      return `Edit: "${pendingChange.title}"`;
    }
    if (pendingChange.kind === "move") {
      return `Move: "${pendingChange.titleSnapshot}" → day ${pendingChange.dayOfWeek} slot ${pendingChange.slot}`;
    }
    return `Swap: "${pendingChange.titleSnapshot}"`;
  })();

  const cancelPending = () => setPendingChange(null);

  const confirmPending = async (reason: string) => {
    if (!pendingChange) return;
    const pending = pendingChange;
    setPendingChange(null);

    if (pending.kind === "save") {
      const saved = saveBlock(
        weekKey,
        pending.dayOfWeek,
        pending.slot,
        pending.title,
        pending.description,
        pending.blockType,
      );
      if (selection?.kind === "empty") {
        setSelection({ kind: "block", blockId: saved.id });
      }
      await addPlanChange({
        weekKey,
        dayOfWeek: pending.dayOfWeek,
        slot: pending.slot,
        blockTitleSnapshot: pending.title,
        action: pending.action,
        reason,
      });
      return;
    }

    if (pending.kind === "swap") {
      await swapBlocks(pending.idA, pending.idB);
      await addPlanChange({
        weekKey,
        dayOfWeek: pending.logDayOfWeek,
        slot: pending.logSlot,
        blockTitleSnapshot: pending.titleSnapshot,
        action: "move",
        reason,
      });
      return;
    }

    await moveBlock(pending.id, pending.dayOfWeek, pending.slot);
    await addPlanChange({
      weekKey,
      dayOfWeek: pending.logDayOfWeek,
      slot: pending.logSlot,
      blockTitleSnapshot: pending.titleSnapshot,
      action: "move",
      reason,
    });
  };
```

- [ ] **Step 6: Intercept `handleSaveBlock`**

Replace the existing `handleSaveBlock` function (around lines 181–200) with:

```tsx
  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selection) return;
    const day =
      selection.kind === "block"
        ? selectedBlock?.dayOfWeek
        : selection.dayOfWeek;
    const slot =
      selection.kind === "block" ? selectedBlock?.slot : selection.slot;
    if (day == null || slot == null) return;

    const locked = isLockedDay(weekStart, day, new Date());
    if (locked) {
      setPendingChange({
        kind: "save",
        dayOfWeek: day,
        slot,
        title,
        description,
        blockType,
        action: selection.kind === "empty" ? "add" : "edit",
      });
      return;
    }

    const saved = saveBlock(weekKey, day, slot, title, description, blockType);
    if (selection.kind === "empty") {
      setSelection({ kind: "block", blockId: saved.id });
    }
  };
```

- [ ] **Step 7: Intercept swap and move via wrapper functions passed to WeekGrid**

Find the existing `<WeekGrid ... onSwapBlocks={swapBlocks} onMoveBlock={moveBlock} />` line (around line 240). Leave the rendering as-is for now, but introduce wrapper handlers just above the `return (`:

Add just before the first `return (` in the component (around line 213):

```tsx
  const handleSwapBlocks = async (idA: string, idB: string) => {
    const a = blocks.find((b) => b.id === idA);
    const b = blocks.find((b) => b.id === idB);
    if (!a || !b) return;
    const now = new Date();
    const aLocked = isLockedDay(weekStart, a.dayOfWeek, now);
    const bLocked = isLockedDay(weekStart, b.dayOfWeek, now);
    if (aLocked || bLocked) {
      const affected = aLocked ? a : b;
      setPendingChange({
        kind: "swap",
        idA,
        idB,
        logDayOfWeek: affected.dayOfWeek,
        logSlot: affected.slot,
        titleSnapshot: affected.title,
      });
      return;
    }
    await swapBlocks(idA, idB);
  };

  const handleMoveBlock = async (
    id: string,
    dayOfWeek: number,
    slot: number,
  ) => {
    const src = blocks.find((b) => b.id === id);
    if (!src) return;
    const now = new Date();
    const srcLocked = isLockedDay(weekStart, src.dayOfWeek, now);
    const destLocked = isLockedDay(weekStart, dayOfWeek, now);
    if (srcLocked || destLocked) {
      setPendingChange({
        kind: "move",
        id,
        dayOfWeek,
        slot,
        logDayOfWeek: destLocked ? dayOfWeek : src.dayOfWeek,
        logSlot: destLocked ? slot : src.slot,
        titleSnapshot: src.title,
      });
      return;
    }
    await moveBlock(id, dayOfWeek, slot);
  };
```

- [ ] **Step 8: Wire wrappers into `<WeekGrid>`**

Find:

```tsx
            <WeekGrid
              blocks={blocks}
              selectedDayOfWeek={selectedDayOfWeek}
              selectedSlot={selectedSlot}
              onBlockClick={handleBlockClick}
              onSwapBlocks={swapBlocks}
              onMoveBlock={moveBlock}
            />
```

Replace with:

```tsx
            <WeekGrid
              blocks={blocks}
              selectedDayOfWeek={selectedDayOfWeek}
              selectedSlot={selectedSlot}
              onBlockClick={handleBlockClick}
              onSwapBlocks={handleSwapBlocks}
              onMoveBlock={handleMoveBlock}
            />
```

- [ ] **Step 9: Mount `<PlanChangeDialog />`**

Near the bottom, just before the existing `<IntroDialog ... />` line, add:

```tsx
      <PlanChangeDialog
        open={pendingChange !== null}
        summary={pendingSummary}
        onCancel={cancelPending}
        onConfirm={confirmPending}
      />
```

- [ ] **Step 10: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: pass.

- [ ] **Step 11: Manual check**

```bash
pnpm dev
```

Verify: editing a block whose cell date matches today opens the `PlanChangeDialog`. Confirm applies and logs; Cancel aborts. Editing a non-today block saves without dialog.

- [ ] **Step 12: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: prompt for reason on locked-day plan changes"
```

---

## Task 6: Review Page — Week Navigator

**Files:**
- Modify: `src/app/review/page.tsx`

- [ ] **Step 1: Add imports**

Near the other imports at the top, add:

```tsx
import { WeekNavigator } from "@/presentation/components/header/week-navigator";
```

- [ ] **Step 2: Pull the week-nav handlers from `useWeekPlan`**

Find the existing destructuring:

```tsx
  const { weekStart } = useWeekPlan();
```

Replace with:

```tsx
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekPlan();
```

- [ ] **Step 3: Insert `<WeekNavigator />` into the header row**

Find the header row (around lines 107–129) that contains the `<h1>週回顧</h1>` and the "回到儀表板" link. Replace it with:

```tsx
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
          }}
        >
          週回顧
        </h1>
        <WeekNavigator
          weekStart={weekStart}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
        />
        <Link
          href="/"
          style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
        >
          &larr; 回到儀表板
        </Link>
      </div>
```

- [ ] **Step 4: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: pass.

- [ ] **Step 5: Manual check**

```bash
pnpm dev
```

Navigate to `/review`. Clicking `←` and `→` in the navigator should change the week. Blocks, diaries, and the reflection load for the new week.

- [ ] **Step 6: Commit**

```bash
git add src/app/review/page.tsx
git commit -m "feat: add week navigator to review page"
```

---

## Task 7: Review Page — PlanChangesLog Section

**Files:**
- Create: `src/presentation/components/review/plan-changes-log.tsx`
- Modify: `src/app/review/page.tsx`

- [ ] **Step 1: Create `PlanChangesLog` component**

Create `src/presentation/components/review/plan-changes-log.tsx`:

```tsx
import type { PlanChange } from "@/domain/entities/plan-change";

interface PlanChangesLogProps {
  changes: PlanChange[];
}

const ACTION_LABEL: Record<PlanChange["action"], string> = {
  edit: "Edit",
  move: "Move",
  add: "Add",
};

const ACTION_COLOR: Record<PlanChange["action"], string> = {
  edit: "var(--color-block-core)",
  move: "var(--color-block-rest)",
  add: "var(--color-block-general)",
};

const DAY_LABEL = ["日", "一", "二", "三", "四", "五", "六", "日"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function PlanChangesLog({ changes }: PlanChangesLogProps) {
  const byDay = new Map<number, PlanChange[]>();
  for (const c of changes) {
    const list = byDay.get(c.dayOfWeek) ?? [];
    list.push(c);
    byDay.set(c.dayOfWeek, list);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <section
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
      }}
    >
      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "12px",
        }}
      >
        計畫變更紀錄
      </h2>

      {changes.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
          本週沒有計畫變更。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {days.map((dow) => (
            <div key={dow}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "4px",
                }}
              >
                週{DAY_LABEL[dow]}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {(byDay.get(dow) ?? []).map((c) => (
                  <li
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        background: ACTION_COLOR[c.action],
                        color: "var(--color-bg-primary)",
                        borderRadius: "var(--radius-sm)",
                        padding: "2px 6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {ACTION_LABEL[c.action]}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>
                      {c.blockTitleSnapshot || "(untitled)"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        flex: 1,
                        wordBreak: "break-word",
                      }}
                    >
                      — {c.reason}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(c.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire `PlanChangesLog` into the review page**

Open `src/app/review/page.tsx`. Near the existing `useAppState()` destructuring (around lines 21–30), add `planChanges` and `loadPlanChanges` to the pulled names:

```tsx
    planChanges,
    loadPlanChanges,
```

Add an `useEffect` to load plan changes when the week changes, near the other `useEffect`s (after `loadReflection`'s effect, around line 38):

```tsx
  useEffect(() => {
    loadPlanChanges(weekKey);
  }, [weekKey, loadPlanChanges]);
```

Near the top of the imports, add:

```tsx
import { PlanChangesLog } from "@/presentation/components/review/plan-changes-log";
```

Compute the week's changes before the `return`:

```tsx
  const weekChanges = planChanges[weekKey] ?? [];
```

Finally, insert `<PlanChangesLog />` between `<DiaryWeekView />` and `<ReflectionEditor />` in the JSX:

```tsx
      <DiaryWeekView entries={weekDiaries} />
      <PlanChangesLog changes={weekChanges} />
      <ReflectionEditor reflection={reflection} onSave={handleSaveReflection} />
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: pass.

- [ ] **Step 4: Manual check**

```bash
pnpm dev
```

Create a plan change today (edit a block in today's cell, supply a reason, confirm). Navigate to `/review`. The entry appears under the correct day. Navigate to previous week via the week navigator — changes from last week also appear (or empty state shows).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/review/plan-changes-log.tsx src/app/review/page.tsx
git commit -m "feat: show plan changes log in weekly review"
```

---

## Task 8: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/plan-lock-and-log
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: lock today's plan and log modification reasons" --body "$(cat <<'EOF'
## Summary

- Today's blocks are locked: any edit, add, or drag-drop that touches a locked slot opens a reason dialog; the change applies only after the user confirms with a reason
- Reasons persist in a new `plan_changes` Supabase table (with localStorage fallback)
- Weekly review page now shows a "計畫變更紀錄" section listing the week's reasons, grouped by day
- Weekly review page now has a week navigator so past weeks' reviews, diaries, and change logs are browsable

## Test plan

- [ ] Edit a block on today's cell → reason dialog appears → confirm → change saves and a log entry appears in the review
- [ ] Edit a non-today block → no dialog
- [ ] Drag today's block to another day → reason dialog; cancel aborts the move
- [ ] Drag a block onto an empty today slot → reason dialog
- [ ] Change block status on today's block → no dialog (execution is unaffected)
- [ ] Review page previous/next week buttons load blocks, diaries, and plan changes for the new week
- [ ] Offline (no auth) → reason dialog still works, entries persist in localStorage, review shows them

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Lock model (`isLockedDay` helper, computed from today) — Task 5 Step 2 ✓
- Reason required for edit / add / move with locked source OR destination — Task 5 Steps 6, 7 ✓
- Reason NOT required for status / subtasks / timer / diary — existing handlers (`handleStatusChange`, subtask/timer/diary callbacks) are not modified ✓
- Modal UX: reason textarea, Cancel, Confirm, Esc, backdrop click — Task 4 Step 1 ✓
- Data model: entity, repository interface, use case — Task 1 ✓
- Supabase migration + CRUD — Task 2 ✓
- localStorage fallback — Task 3 Step 4 ✓
- App-state plumbing: `planChanges`, `loadPlanChanges`, `addPlanChange` — Task 3 ✓
- Review page: week navigator — Task 6 ✓
- Review page: `PlanChangesLog` between `DiaryWeekView` and `ReflectionEditor` — Task 7 ✓
- Append-only (no update/delete policies in migration, no update/delete in repository) — Task 2 Step 1 ✓
- Test for `logPlanChange` (empty reason rejection, trim) — Task 1 Step 1 ✓

### 2. Placeholder scan

No "TBD" / "TODO" / vague references. All code blocks are complete and runnable. Every "find X, replace with Y" contains the exact before and after text.

### 3. Type consistency

- `PlanChange` shape identical in entity (Task 1), DB mapper (Task 2), provider state (Task 3), component props (Task 4, Task 7) ✓
- `PlanChangeAction = "edit" | "move" | "add"` used consistently across entity, DB, pending-state discriminator, and log component's maps ✓
- `LogPlanChangeInput` with `userId: string | null` defined in Task 1; `addPlanChange` in Task 3 accepts `Omit<LogPlanChangeInput, "userId">` and injects userId internally ✓
- `addPlanChange` signature `(input) => Promise<void>` matches the Task 5 `await addPlanChange({...})` calls ✓
- `WeekNavigator` props `{ weekStart, onPreviousWeek, onNextWeek }` in Task 6 match the existing component file ✓

All checks pass.
