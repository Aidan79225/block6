# Concrete Repository Implementations — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce concrete `Supabase*Repository` and `InMemory*Repository` implementations for `BlockRepository`, `DiaryRepository`, `WeekPlanRepository`, `WeekReviewRepository`, and `PlanChangeRepository`. Nothing is consumed yet — this slice unblocks sub-project #2 which will mount `DependencyProvider`.

**Architecture:** Each repo gets two impls. `InMemory*Repository` classes are pure in-memory maps and are fully unit-tested. `Supabase*Repository` classes are thin adapters — they either wrap existing helpers in `src/infrastructure/supabase/database.ts` or call new helpers added as part of the same task. `AppStateProvider` and `DependencyProvider` are not touched.

**Tech Stack:** TypeScript strict, Vitest. No new runtime dependencies. No DB migrations.

**Prerequisite:** Be on branch `refactor/concrete-repositories` (`git checkout -b refactor/concrete-repositories` before Task 1).

**Note on weekPlanId semantics:** The existing `database.ts` uses `week_start` (a date key string) as the external weekPlanId in block rows (see `fetchBlocksForWeek` at database.ts:105-109 where `weekPlanId: weekStart` is hand-assigned). Inside the DB, `week_plans.id` is a proper UUID and `blocks.week_plan_id` foreign-keys into it. **The new Supabase repos here use the proper UUID.** Sub-project #2 will handle resolving a weekKey to the real UUID when it wires the repos into call sites. This sub-project tests the repos only via the in-memory impls, so there is no UUID/weekKey ambiguity at runtime here.

---

## File Structure

```
src/
  infrastructure/
    supabase/
      database.ts                                                       (modify — add helpers)
      repositories/
        supabase-block-repository.ts                                    (create)
        supabase-diary-repository.ts                                    (create)
        supabase-week-plan-repository.ts                                (create)
        supabase-week-review-repository.ts                              (create)
        supabase-plan-change-repository.ts                              (create)
    in-memory/
      repositories/
        in-memory-block-repository.ts                                   (create)
        in-memory-diary-repository.ts                                   (create)
        in-memory-week-plan-repository.ts                               (create)
        in-memory-week-review-repository.ts                             (create)
        in-memory-plan-change-repository.ts                             (create)
  __tests__/
    infrastructure/
      in-memory/
        repositories/
          in-memory-block-repository.test.ts                            (create)
          in-memory-diary-repository.test.ts                            (create)
          in-memory-week-plan-repository.test.ts                        (create)
          in-memory-week-review-repository.test.ts                      (create)
          in-memory-plan-change-repository.test.ts                      (create)
```

Each task below handles **one repo domain end-to-end** — new `database.ts` helpers if needed, Supabase impl, in-memory impl, and in-memory tests — and ends with a single commit.

---

## Task 1: `BlockRepository` (in-memory + tests + Supabase)

**Files:**
- Create: `src/__tests__/infrastructure/in-memory/repositories/in-memory-block-repository.test.ts`
- Create: `src/infrastructure/in-memory/repositories/in-memory-block-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-block-repository.ts`
- Modify: `src/infrastructure/supabase/database.ts`

### Step 1: Write the failing in-memory test file

Create `src/__tests__/infrastructure/in-memory/repositories/in-memory-block-repository.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InMemoryBlockRepository } from "@/infrastructure/in-memory/repositories/in-memory-block-repository";
import {
  BlockType,
  BlockStatus,
  createBlock,
} from "@/domain/entities/block";

function makeBlock(overrides: Partial<Parameters<typeof createBlock>[0]> = {}) {
  return createBlock({
    id: "block-1",
    weekPlanId: "wp-1",
    dayOfWeek: 1,
    slot: 1,
    blockType: BlockType.Core,
    title: "Deep Work",
    description: "",
    status: BlockStatus.Planned,
    ...overrides,
  });
}

describe("InMemoryBlockRepository", () => {
  it("findById returns null for a missing block", async () => {
    const repo = new InMemoryBlockRepository();
    expect(await repo.findById("nope")).toBeNull();
  });

  it("save stores a block; findById returns it", async () => {
    const repo = new InMemoryBlockRepository();
    const b = makeBlock();
    await repo.save(b);
    expect(await repo.findById("block-1")).toEqual(b);
  });

  it("save throws if the id already exists", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(makeBlock());
    await expect(repo.save(makeBlock())).rejects.toThrow(/already exists/);
  });

  it("update replaces an existing block", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(makeBlock({ title: "Old" }));
    await repo.update(makeBlock({ title: "New" }));
    const got = await repo.findById("block-1");
    expect(got?.title).toBe("New");
  });

  it("update throws if the id does not exist", async () => {
    const repo = new InMemoryBlockRepository();
    await expect(repo.update(makeBlock())).rejects.toThrow(/not found/);
  });

  it("findByWeekPlan returns only blocks with the matching weekPlanId", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(makeBlock({ id: "a", weekPlanId: "wp-1" }));
    await repo.save(makeBlock({ id: "b", weekPlanId: "wp-1", slot: 2 }));
    await repo.save(makeBlock({ id: "c", weekPlanId: "wp-2" }));
    const result = await repo.findByWeekPlan("wp-1");
    expect(result.map((b) => b.id).sort()).toEqual(["a", "b"]);
  });

  it("findByWeekPlan returns [] for an unknown weekPlanId", async () => {
    const repo = new InMemoryBlockRepository();
    expect(await repo.findByWeekPlan("missing")).toEqual([]);
  });
});
```

### Step 2: Run the test to verify it fails

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-block-repository.test.ts
```

Expected: FAIL with "Cannot find module '@/infrastructure/in-memory/repositories/in-memory-block-repository'" or equivalent.

### Step 3: Create the in-memory impl

Create `src/infrastructure/in-memory/repositories/in-memory-block-repository.ts`:

```typescript
import type { Block } from "@/domain/entities/block";
import type { BlockRepository } from "@/domain/repositories/block-repository";

export class InMemoryBlockRepository implements BlockRepository {
  private readonly byId = new Map<string, Block>();

  async findByWeekPlan(weekPlanId: string): Promise<Block[]> {
    return Array.from(this.byId.values()).filter(
      (b) => b.weekPlanId === weekPlanId,
    );
  }

  async findById(id: string): Promise<Block | null> {
    return this.byId.get(id) ?? null;
  }

  async save(block: Block): Promise<void> {
    if (this.byId.has(block.id)) {
      throw new Error(`Block ${block.id} already exists`);
    }
    this.byId.set(block.id, block);
  }

  async update(block: Block): Promise<void> {
    if (!this.byId.has(block.id)) {
      throw new Error(`Block ${block.id} not found`);
    }
    this.byId.set(block.id, block);
  }
}
```

### Step 4: Run the test to verify it passes

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-block-repository.test.ts
```

Expected: PASS (7 tests).

### Step 5: Add `database.ts` helpers used by the Supabase block repo

In `src/infrastructure/supabase/database.ts`, add these functions **at the end of the "Blocks" section** (after `updateBlockStatus`, around line 192):

```typescript
export async function fetchBlockById(id: string): Promise<Block | null> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbBlockToEntity(data as DbBlock);
}

export async function fetchBlocksByWeekPlanId(
  weekPlanId: string,
): Promise<Block[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("week_plan_id", weekPlanId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => dbBlockToEntity(row as DbBlock));
}

export async function insertBlockRow(block: Block): Promise<void> {
  const { error } = await supabase.from("blocks").insert({
    id: block.id,
    week_plan_id: block.weekPlanId,
    day_of_week: block.dayOfWeek,
    slot: block.slot,
    block_type_id: BLOCK_TYPE_MAP[block.blockType],
    title: block.title,
    description: block.description,
    status: block.status,
  });
  if (error) throw new Error(error.message);
}

export async function updateBlockRow(block: Block): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({
      block_type_id: BLOCK_TYPE_MAP[block.blockType],
      title: block.title,
      description: block.description,
      status: block.status,
    })
    .eq("id", block.id);
  if (error) throw new Error(error.message);
}
```

### Step 6: Create the Supabase impl

Create `src/infrastructure/supabase/repositories/supabase-block-repository.ts`:

```typescript
import type { Block } from "@/domain/entities/block";
import type { BlockRepository } from "@/domain/repositories/block-repository";
import {
  fetchBlockById,
  fetchBlocksByWeekPlanId,
  insertBlockRow,
  updateBlockRow,
} from "@/infrastructure/supabase/database";

export class SupabaseBlockRepository implements BlockRepository {
  async findByWeekPlan(weekPlanId: string): Promise<Block[]> {
    return fetchBlocksByWeekPlanId(weekPlanId);
  }

  async findById(id: string): Promise<Block | null> {
    return fetchBlockById(id);
  }

  async save(block: Block): Promise<void> {
    return insertBlockRow(block);
  }

  async update(block: Block): Promise<void> {
    return updateBlockRow(block);
  }
}
```

### Step 7: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. (Existing ~100 tests still green; 7 new tests in this file.)

### Step 8: Commit

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-block-repository.ts src/infrastructure/in-memory/repositories/in-memory-block-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-block-repository.test.ts
git commit -m "feat: add BlockRepository implementations (Supabase + in-memory)"
```

---

## Task 2: `DiaryRepository` (in-memory + tests + Supabase)

**Files:**
- Create: `src/__tests__/infrastructure/in-memory/repositories/in-memory-diary-repository.test.ts`
- Create: `src/infrastructure/in-memory/repositories/in-memory-diary-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-diary-repository.ts`
- Modify: `src/infrastructure/supabase/database.ts`

### Step 1: Write the failing in-memory test file

Create `src/__tests__/infrastructure/in-memory/repositories/in-memory-diary-repository.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InMemoryDiaryRepository } from "@/infrastructure/in-memory/repositories/in-memory-diary-repository";
import { createDiaryEntry } from "@/domain/entities/diary-entry";

function makeEntry(
  overrides: Partial<Parameters<typeof createDiaryEntry>[0]> = {},
) {
  return createDiaryEntry({
    id: "d-1",
    userId: "user-1",
    entryDate: new Date(2026, 3, 13),
    bad: "bad",
    good: "good",
    next: "next",
    createdAt: new Date(2026, 3, 13, 10, 0),
    ...overrides,
  });
}

describe("InMemoryDiaryRepository", () => {
  it("findByUserAndDate returns null when no entry exists", async () => {
    const repo = new InMemoryDiaryRepository();
    const got = await repo.findByUserAndDate("user-1", new Date(2026, 3, 13));
    expect(got).toBeNull();
  });

  it("save stores an entry, findByUserAndDate finds it by userId and date", async () => {
    const repo = new InMemoryDiaryRepository();
    const entry = makeEntry();
    await repo.save(entry);
    const got = await repo.findByUserAndDate("user-1", new Date(2026, 3, 13));
    expect(got).toEqual(entry);
  });

  it("findByUserAndDate returns null for a different user", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry());
    const got = await repo.findByUserAndDate("user-2", new Date(2026, 3, 13));
    expect(got).toBeNull();
  });

  it("save throws on duplicate id", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry());
    await expect(repo.save(makeEntry())).rejects.toThrow(/already exists/);
  });

  it("update replaces the existing entry", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry({ bad: "old" }));
    await repo.update(makeEntry({ bad: "new" }));
    const got = await repo.findByUserAndDate("user-1", new Date(2026, 3, 13));
    expect(got?.bad).toBe("new");
  });

  it("update throws if id does not exist", async () => {
    const repo = new InMemoryDiaryRepository();
    await expect(repo.update(makeEntry())).rejects.toThrow(/not found/);
  });

  it("findByUserAndDateRange returns entries inside the range inclusive", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry({ id: "a", entryDate: new Date(2026, 3, 13) }));
    await repo.save(makeEntry({ id: "b", entryDate: new Date(2026, 3, 15) }));
    await repo.save(makeEntry({ id: "c", entryDate: new Date(2026, 3, 19) }));
    const result = await repo.findByUserAndDateRange(
      "user-1",
      new Date(2026, 3, 13),
      new Date(2026, 3, 15),
    );
    expect(result.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("findByUserAndDateRange filters by userId", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry({ id: "a", userId: "user-1" }));
    await repo.save(makeEntry({ id: "b", userId: "user-2" }));
    const result = await repo.findByUserAndDateRange(
      "user-1",
      new Date(2026, 3, 13),
      new Date(2026, 3, 13),
    );
    expect(result.map((e) => e.id)).toEqual(["a"]);
  });
});
```

### Step 2: Run the test to verify it fails

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-diary-repository.test.ts
```

Expected: FAIL (module not found).

### Step 3: Create the in-memory impl

Create `src/infrastructure/in-memory/repositories/in-memory-diary-repository.ts`:

```typescript
import type { DiaryEntry } from "@/domain/entities/diary-entry";
import type { DiaryRepository } from "@/domain/repositories/diary-repository";
import { isSameLocalDay } from "@/presentation/lib/date-helpers";

export class InMemoryDiaryRepository implements DiaryRepository {
  private readonly byId = new Map<string, DiaryEntry>();

  async findByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<DiaryEntry | null> {
    for (const e of this.byId.values()) {
      if (e.userId === userId && isSameLocalDay(e.entryDate, date)) return e;
    }
    return null;
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DiaryEntry[]> {
    const start = startOfLocalDay(startDate).getTime();
    const end = startOfLocalDay(endDate).getTime();
    return Array.from(this.byId.values()).filter((e) => {
      if (e.userId !== userId) return false;
      const t = startOfLocalDay(e.entryDate).getTime();
      return t >= start && t <= end;
    });
  }

  async save(entry: DiaryEntry): Promise<void> {
    if (this.byId.has(entry.id)) {
      throw new Error(`Diary entry ${entry.id} already exists`);
    }
    this.byId.set(entry.id, entry);
  }

  async update(entry: DiaryEntry): Promise<void> {
    if (!this.byId.has(entry.id)) {
      throw new Error(`Diary entry ${entry.id} not found`);
    }
    this.byId.set(entry.id, entry);
  }
}

function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
```

### Step 4: Run the test to verify it passes

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-diary-repository.test.ts
```

Expected: PASS (8 tests).

### Step 5: Add `database.ts` helpers for the Supabase diary repo

In `src/infrastructure/supabase/database.ts`, after the existing `upsertDiary` function (around line 256), add:

```typescript
interface DbDiaryFull {
  id: string;
  user_id: string;
  entry_date: string;
  bad: string;
  good: string;
  next: string;
  created_at: string;
}

function dbDiaryToEntity(
  db: DbDiaryFull,
): import("@/domain/entities/diary-entry").DiaryEntry {
  const [y, m, d] = db.entry_date.split("-").map(Number);
  return {
    id: db.id,
    userId: db.user_id,
    entryDate: new Date(y, m - 1, d),
    bad: db.bad,
    good: db.good,
    next: db.next,
    createdAt: new Date(db.created_at),
  };
}

export async function fetchDiaryEntry(
  userId: string,
  dateKey: string,
): Promise<import("@/domain/entities/diary-entry").DiaryEntry | null> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, user_id, entry_date, bad, good, next, created_at")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbDiaryToEntity(data as DbDiaryFull);
}

export async function fetchDiaryRange(
  userId: string,
  startKey: string,
  endKey: string,
): Promise<import("@/domain/entities/diary-entry").DiaryEntry[]> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, user_id, entry_date, bad, good, next, created_at")
    .eq("user_id", userId)
    .gte("entry_date", startKey)
    .lte("entry_date", endKey);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => dbDiaryToEntity(row as DbDiaryFull));
}

export async function insertDiaryEntry(
  entry: import("@/domain/entities/diary-entry").DiaryEntry,
): Promise<void> {
  const y = entry.entryDate.getFullYear();
  const m = String(entry.entryDate.getMonth() + 1).padStart(2, "0");
  const d = String(entry.entryDate.getDate()).padStart(2, "0");
  const { error } = await supabase.from("diary_entries").insert({
    id: entry.id,
    user_id: entry.userId,
    entry_date: `${y}-${m}-${d}`,
    bad: entry.bad,
    good: entry.good,
    next: entry.next,
  });
  if (error) throw new Error(error.message);
}

export async function updateDiaryEntry(
  entry: import("@/domain/entities/diary-entry").DiaryEntry,
): Promise<void> {
  const { error } = await supabase
    .from("diary_entries")
    .update({
      bad: entry.bad,
      good: entry.good,
      next: entry.next,
    })
    .eq("id", entry.id);
  if (error) throw new Error(error.message);
}
```

(Dynamic imports via `import(...)` above keep the existing file's import block untouched; you may alternatively add a named import at the top of the file. Either is fine.)

### Step 6: Create the Supabase impl

Create `src/infrastructure/supabase/repositories/supabase-diary-repository.ts`:

```typescript
import type { DiaryEntry } from "@/domain/entities/diary-entry";
import type { DiaryRepository } from "@/domain/repositories/diary-repository";
import { formatDateKey } from "@/presentation/lib/date-helpers";
import {
  fetchDiaryEntry,
  fetchDiaryRange,
  insertDiaryEntry,
  updateDiaryEntry,
} from "@/infrastructure/supabase/database";

export class SupabaseDiaryRepository implements DiaryRepository {
  async findByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<DiaryEntry | null> {
    return fetchDiaryEntry(userId, formatDateKey(date));
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DiaryEntry[]> {
    return fetchDiaryRange(
      userId,
      formatDateKey(startDate),
      formatDateKey(endDate),
    );
  }

  async save(entry: DiaryEntry): Promise<void> {
    return insertDiaryEntry(entry);
  }

  async update(entry: DiaryEntry): Promise<void> {
    return updateDiaryEntry(entry);
  }
}
```

### Step 7: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

### Step 8: Commit

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-diary-repository.ts src/infrastructure/in-memory/repositories/in-memory-diary-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-diary-repository.test.ts
git commit -m "feat: add DiaryRepository implementations (Supabase + in-memory)"
```

---

## Task 3: `WeekPlanRepository` (in-memory + tests + Supabase)

**Files:**
- Create: `src/__tests__/infrastructure/in-memory/repositories/in-memory-week-plan-repository.test.ts`
- Create: `src/infrastructure/in-memory/repositories/in-memory-week-plan-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-week-plan-repository.ts`
- Modify: `src/infrastructure/supabase/database.ts`

### Step 1: Write the failing in-memory test file

Create `src/__tests__/infrastructure/in-memory/repositories/in-memory-week-plan-repository.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InMemoryWeekPlanRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-plan-repository";
import { createWeekPlan } from "@/domain/entities/week-plan";

function makePlan(
  overrides: Partial<Parameters<typeof createWeekPlan>[0]> = {},
) {
  return createWeekPlan({
    id: "wp-1",
    userId: "user-1",
    weekStart: new Date(2026, 3, 13),
    createdAt: new Date(2026, 3, 13, 10, 0),
    ...overrides,
  });
}

describe("InMemoryWeekPlanRepository", () => {
  it("findByUserAndWeek returns null when no plan matches", async () => {
    const repo = new InMemoryWeekPlanRepository();
    expect(
      await repo.findByUserAndWeek("user-1", new Date(2026, 3, 13)),
    ).toBeNull();
  });

  it("save stores a plan, findByUserAndWeek finds it", async () => {
    const repo = new InMemoryWeekPlanRepository();
    const plan = makePlan();
    await repo.save(plan);
    const got = await repo.findByUserAndWeek("user-1", new Date(2026, 3, 13));
    expect(got).toEqual(plan);
  });

  it("findByUserAndWeek does not cross users", async () => {
    const repo = new InMemoryWeekPlanRepository();
    await repo.save(makePlan());
    const got = await repo.findByUserAndWeek("user-2", new Date(2026, 3, 13));
    expect(got).toBeNull();
  });

  it("save throws on duplicate id", async () => {
    const repo = new InMemoryWeekPlanRepository();
    await repo.save(makePlan());
    await expect(repo.save(makePlan())).rejects.toThrow(/already exists/);
  });
});
```

### Step 2: Run the test to verify it fails

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-week-plan-repository.test.ts
```

Expected: FAIL (module not found).

### Step 3: Create the in-memory impl

Create `src/infrastructure/in-memory/repositories/in-memory-week-plan-repository.ts`:

```typescript
import type { WeekPlan } from "@/domain/entities/week-plan";
import type { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { isSameLocalDay } from "@/presentation/lib/date-helpers";

export class InMemoryWeekPlanRepository implements WeekPlanRepository {
  private readonly byId = new Map<string, WeekPlan>();

  async findByUserAndWeek(
    userId: string,
    weekStart: Date,
  ): Promise<WeekPlan | null> {
    for (const p of this.byId.values()) {
      if (p.userId === userId && isSameLocalDay(p.weekStart, weekStart))
        return p;
    }
    return null;
  }

  async save(plan: WeekPlan): Promise<void> {
    if (this.byId.has(plan.id)) {
      throw new Error(`WeekPlan ${plan.id} already exists`);
    }
    this.byId.set(plan.id, plan);
  }
}
```

### Step 4: Run the test to verify it passes

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-week-plan-repository.test.ts
```

Expected: PASS (4 tests).

### Step 5: Add `database.ts` helpers for the Supabase week-plan repo

In `src/infrastructure/supabase/database.ts`, after the existing `getOrCreateWeekPlan` (around line 82), add:

```typescript
interface DbWeekPlan {
  id: string;
  user_id: string;
  week_start: string;
  created_at: string;
}

function dbWeekPlanToEntity(
  db: DbWeekPlan,
): import("@/domain/entities/week-plan").WeekPlan {
  const [y, m, d] = db.week_start.split("-").map(Number);
  return {
    id: db.id,
    userId: db.user_id,
    weekStart: new Date(y, m - 1, d),
    createdAt: new Date(db.created_at),
  };
}

export async function fetchWeekPlan(
  userId: string,
  weekKey: string,
): Promise<import("@/domain/entities/week-plan").WeekPlan | null> {
  const { data, error } = await supabase
    .from("week_plans")
    .select("id, user_id, week_start, created_at")
    .eq("user_id", userId)
    .eq("week_start", weekKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbWeekPlanToEntity(data as DbWeekPlan);
}

export async function insertWeekPlan(
  plan: import("@/domain/entities/week-plan").WeekPlan,
): Promise<void> {
  const y = plan.weekStart.getFullYear();
  const m = String(plan.weekStart.getMonth() + 1).padStart(2, "0");
  const d = String(plan.weekStart.getDate()).padStart(2, "0");
  const { error } = await supabase.from("week_plans").insert({
    id: plan.id,
    user_id: plan.userId,
    week_start: `${y}-${m}-${d}`,
  });
  if (error) throw new Error(error.message);
}
```

### Step 6: Create the Supabase impl

Create `src/infrastructure/supabase/repositories/supabase-week-plan-repository.ts`:

```typescript
import type { WeekPlan } from "@/domain/entities/week-plan";
import type { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { formatDateKey } from "@/presentation/lib/date-helpers";
import {
  fetchWeekPlan,
  insertWeekPlan,
} from "@/infrastructure/supabase/database";

export class SupabaseWeekPlanRepository implements WeekPlanRepository {
  async findByUserAndWeek(
    userId: string,
    weekStart: Date,
  ): Promise<WeekPlan | null> {
    return fetchWeekPlan(userId, formatDateKey(weekStart));
  }

  async save(plan: WeekPlan): Promise<void> {
    return insertWeekPlan(plan);
  }
}
```

### Step 7: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

### Step 8: Commit

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-week-plan-repository.ts src/infrastructure/in-memory/repositories/in-memory-week-plan-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-week-plan-repository.test.ts
git commit -m "feat: add WeekPlanRepository implementations (Supabase + in-memory)"
```

---

## Task 4: `WeekReviewRepository` (in-memory + tests + Supabase)

**Files:**
- Create: `src/__tests__/infrastructure/in-memory/repositories/in-memory-week-review-repository.test.ts`
- Create: `src/infrastructure/in-memory/repositories/in-memory-week-review-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-week-review-repository.ts`
- Modify: `src/infrastructure/supabase/database.ts`

### Step 1: Write the failing in-memory test file

Create `src/__tests__/infrastructure/in-memory/repositories/in-memory-week-review-repository.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InMemoryWeekReviewRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-review-repository";
import { createWeekReview } from "@/domain/entities/week-review";

function makeReview(
  overrides: Partial<Parameters<typeof createWeekReview>[0]> = {},
) {
  return createWeekReview({
    id: "wr-1",
    weekPlanId: "wp-1",
    reflection: "A solid week",
    createdAt: new Date(2026, 3, 13, 10, 0),
    ...overrides,
  });
}

describe("InMemoryWeekReviewRepository", () => {
  it("findByWeekPlan returns null when no review matches", async () => {
    const repo = new InMemoryWeekReviewRepository();
    expect(await repo.findByWeekPlan("wp-1")).toBeNull();
  });

  it("save stores a review, findByWeekPlan finds it", async () => {
    const repo = new InMemoryWeekReviewRepository();
    const r = makeReview();
    await repo.save(r);
    expect(await repo.findByWeekPlan("wp-1")).toEqual(r);
  });

  it("save throws on duplicate id", async () => {
    const repo = new InMemoryWeekReviewRepository();
    await repo.save(makeReview());
    await expect(repo.save(makeReview())).rejects.toThrow(/already exists/);
  });

  it("update replaces the existing review", async () => {
    const repo = new InMemoryWeekReviewRepository();
    await repo.save(makeReview({ reflection: "Old" }));
    await repo.update(makeReview({ reflection: "New" }));
    const got = await repo.findByWeekPlan("wp-1");
    expect(got?.reflection).toBe("New");
  });

  it("update throws if id does not exist", async () => {
    const repo = new InMemoryWeekReviewRepository();
    await expect(repo.update(makeReview())).rejects.toThrow(/not found/);
  });
});
```

### Step 2: Run the test to verify it fails

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-week-review-repository.test.ts
```

Expected: FAIL (module not found).

### Step 3: Create the in-memory impl

Create `src/infrastructure/in-memory/repositories/in-memory-week-review-repository.ts`:

```typescript
import type { WeekReview } from "@/domain/entities/week-review";
import type { WeekReviewRepository } from "@/domain/repositories/week-review-repository";

export class InMemoryWeekReviewRepository implements WeekReviewRepository {
  private readonly byId = new Map<string, WeekReview>();

  async findByWeekPlan(weekPlanId: string): Promise<WeekReview | null> {
    for (const r of this.byId.values()) {
      if (r.weekPlanId === weekPlanId) return r;
    }
    return null;
  }

  async save(review: WeekReview): Promise<void> {
    if (this.byId.has(review.id)) {
      throw new Error(`WeekReview ${review.id} already exists`);
    }
    this.byId.set(review.id, review);
  }

  async update(review: WeekReview): Promise<void> {
    if (!this.byId.has(review.id)) {
      throw new Error(`WeekReview ${review.id} not found`);
    }
    this.byId.set(review.id, review);
  }
}
```

### Step 4: Run the test to verify it passes

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-week-review-repository.test.ts
```

Expected: PASS (5 tests).

### Step 5: Add `database.ts` helpers for the Supabase week-review repo

In `src/infrastructure/supabase/database.ts`, after the existing `upsertReflection` (around line 307), add:

```typescript
interface DbWeekReview {
  id: string;
  week_plan_id: string;
  reflection: string;
  created_at: string;
}

function dbWeekReviewToEntity(
  db: DbWeekReview,
): import("@/domain/entities/week-review").WeekReview {
  return {
    id: db.id,
    weekPlanId: db.week_plan_id,
    reflection: db.reflection,
    createdAt: new Date(db.created_at),
  };
}

export async function fetchWeekReviewByWeekPlanId(
  weekPlanId: string,
): Promise<import("@/domain/entities/week-review").WeekReview | null> {
  const { data, error } = await supabase
    .from("week_reviews")
    .select("id, week_plan_id, reflection, created_at")
    .eq("week_plan_id", weekPlanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbWeekReviewToEntity(data as DbWeekReview);
}

export async function insertWeekReview(
  review: import("@/domain/entities/week-review").WeekReview,
): Promise<void> {
  const { error } = await supabase.from("week_reviews").insert({
    id: review.id,
    week_plan_id: review.weekPlanId,
    reflection: review.reflection,
  });
  if (error) throw new Error(error.message);
}

export async function updateWeekReview(
  review: import("@/domain/entities/week-review").WeekReview,
): Promise<void> {
  const { error } = await supabase
    .from("week_reviews")
    .update({ reflection: review.reflection })
    .eq("id", review.id);
  if (error) throw new Error(error.message);
}
```

### Step 6: Create the Supabase impl

Create `src/infrastructure/supabase/repositories/supabase-week-review-repository.ts`:

```typescript
import type { WeekReview } from "@/domain/entities/week-review";
import type { WeekReviewRepository } from "@/domain/repositories/week-review-repository";
import {
  fetchWeekReviewByWeekPlanId,
  insertWeekReview,
  updateWeekReview,
} from "@/infrastructure/supabase/database";

export class SupabaseWeekReviewRepository implements WeekReviewRepository {
  async findByWeekPlan(weekPlanId: string): Promise<WeekReview | null> {
    return fetchWeekReviewByWeekPlanId(weekPlanId);
  }

  async save(review: WeekReview): Promise<void> {
    return insertWeekReview(review);
  }

  async update(review: WeekReview): Promise<void> {
    return updateWeekReview(review);
  }
}
```

### Step 7: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

### Step 8: Commit

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-week-review-repository.ts src/infrastructure/in-memory/repositories/in-memory-week-review-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-week-review-repository.test.ts
git commit -m "feat: add WeekReviewRepository implementations (Supabase + in-memory)"
```

---

## Task 5: `PlanChangeRepository` (in-memory + tests + Supabase)

**Files:**
- Create: `src/__tests__/infrastructure/in-memory/repositories/in-memory-plan-change-repository.test.ts`
- Create: `src/infrastructure/in-memory/repositories/in-memory-plan-change-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-plan-change-repository.ts`

(No `database.ts` changes — `fetchPlanChangesForWeek` and `insertPlanChange` already return and accept the right shapes.)

### Step 1: Write the failing in-memory test file

Create `src/__tests__/infrastructure/in-memory/repositories/in-memory-plan-change-repository.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InMemoryPlanChangeRepository } from "@/infrastructure/in-memory/repositories/in-memory-plan-change-repository";
import type { PlanChange } from "@/domain/entities/plan-change";

function makeChange(overrides: Partial<PlanChange> = {}): PlanChange {
  return {
    id: "pc-1",
    userId: "user-1",
    weekKey: "2026-04-13",
    dayOfWeek: 1,
    slot: 2,
    blockTitleSnapshot: "Deep Work",
    action: "edit",
    reason: "reason",
    createdAt: "2026-04-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("InMemoryPlanChangeRepository", () => {
  it("listByWeek returns [] when none match", async () => {
    const repo = new InMemoryPlanChangeRepository();
    expect(await repo.listByWeek("user-1", "2026-04-13")).toEqual([]);
  });

  it("create stores a change; listByWeek finds it", async () => {
    const repo = new InMemoryPlanChangeRepository();
    const c = makeChange();
    const created = await repo.create(c);
    expect(created).toEqual(c);
    const list = await repo.listByWeek("user-1", "2026-04-13");
    expect(list).toEqual([c]);
  });

  it("listByWeek filters by user and weekKey", async () => {
    const repo = new InMemoryPlanChangeRepository();
    await repo.create(makeChange({ id: "a", userId: "user-1", weekKey: "2026-04-13" }));
    await repo.create(makeChange({ id: "b", userId: "user-1", weekKey: "2026-04-20" }));
    await repo.create(makeChange({ id: "c", userId: "user-2", weekKey: "2026-04-13" }));
    const list = await repo.listByWeek("user-1", "2026-04-13");
    expect(list.map((x) => x.id)).toEqual(["a"]);
  });

  it("listByWeek returns entries sorted by createdAt ascending", async () => {
    const repo = new InMemoryPlanChangeRepository();
    await repo.create(makeChange({ id: "b", createdAt: "2026-04-13T12:00:00.000Z" }));
    await repo.create(makeChange({ id: "a", createdAt: "2026-04-13T10:00:00.000Z" }));
    const list = await repo.listByWeek("user-1", "2026-04-13");
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
```

### Step 2: Run the test to verify it fails

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-plan-change-repository.test.ts
```

Expected: FAIL (module not found).

### Step 3: Create the in-memory impl

Create `src/infrastructure/in-memory/repositories/in-memory-plan-change-repository.ts`:

```typescript
import type { PlanChange } from "@/domain/entities/plan-change";
import type { PlanChangeRepository } from "@/domain/repositories/plan-change-repository";

export class InMemoryPlanChangeRepository implements PlanChangeRepository {
  private readonly changes: PlanChange[] = [];

  async listByWeek(userId: string, weekKey: string): Promise<PlanChange[]> {
    return this.changes
      .filter((c) => c.userId === userId && c.weekKey === weekKey)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async create(change: PlanChange): Promise<PlanChange> {
    this.changes.push(change);
    return change;
  }
}
```

### Step 4: Run the test to verify it passes

```bash
pnpm test src/__tests__/infrastructure/in-memory/repositories/in-memory-plan-change-repository.test.ts
```

Expected: PASS (4 tests).

### Step 5: Create the Supabase impl

Create `src/infrastructure/supabase/repositories/supabase-plan-change-repository.ts`:

```typescript
import type { PlanChange } from "@/domain/entities/plan-change";
import type { PlanChangeRepository } from "@/domain/repositories/plan-change-repository";
import {
  fetchPlanChangesForWeek,
  insertPlanChange,
} from "@/infrastructure/supabase/database";

export class SupabasePlanChangeRepository implements PlanChangeRepository {
  async listByWeek(userId: string, weekKey: string): Promise<PlanChange[]> {
    return fetchPlanChangesForWeek(userId, weekKey);
  }

  async create(change: PlanChange): Promise<PlanChange> {
    return insertPlanChange(change);
  }
}
```

### Step 6: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

### Step 7: Commit

```bash
git add src/infrastructure/supabase/repositories/supabase-plan-change-repository.ts src/infrastructure/in-memory/repositories/in-memory-plan-change-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-plan-change-repository.test.ts
git commit -m "feat: add PlanChangeRepository implementations (Supabase + in-memory)"
```

---

## Task 6: Push and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin refactor/concrete-repositories
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "refactor: add concrete repository implementations" --body "$(cat <<'EOF'
## Summary

- Add \`Supabase*Repository\` and \`InMemory*Repository\` classes for \`BlockRepository\`, \`DiaryRepository\`, \`WeekPlanRepository\`, \`WeekReviewRepository\`, and \`PlanChangeRepository\`.
- Supabase repos wrap new helpers in \`database.ts\`; existing helpers stay untouched.
- In-memory repos are fully unit-tested and live under \`src/infrastructure/in-memory/repositories/\` (parallel structure to \`src/infrastructure/supabase/repositories/\`).

## Scope discipline

- \`AppStateProvider\` unchanged.
- \`DependencyProvider\` unchanged.
- Existing \`database.ts\` functions unchanged.
- Existing use-case tests unchanged.
- No new entities, no new use cases, no DB migrations.

## What this unblocks

Sub-project #2 can now mount \`DependencyProvider\` and migrate one UI path to route through the new use-case + repository layer.

## Test plan

- [x] \`pnpm lint\` passes
- [x] \`pnpm type-check\` passes
- [x] \`pnpm test\` passes (+28 new in-memory repo tests)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- `BlockRepository` Supabase + in-memory + tests — Task 1 ✓
- `DiaryRepository` Supabase + in-memory + tests — Task 2 ✓
- `WeekPlanRepository` Supabase + in-memory + tests — Task 3 ✓
- `WeekReviewRepository` Supabase + in-memory + tests — Task 4 ✓
- `PlanChangeRepository` Supabase + in-memory + tests — Task 5 ✓
- `AppStateProvider` / `DependencyProvider` unchanged — nothing in any task modifies those files ✓
- Existing `database.ts` functions unchanged — only additions in all tasks ✓
- No existing use-case tests modified — nothing in any task touches `src/__tests__/domain/usecases/` ✓
- File layout under `src/infrastructure/in-memory/repositories/` — reflected in every Task's file list ✓

### 2. Placeholder scan

No TBD / TODO / vague guidance. All code blocks concrete, all commands explicit.

### 3. Type consistency

- `InMemory*Repository` class names match across their definition, test file import, and commit message in every task.
- `BlockRepository.findByWeekPlan(weekPlanId: string)` — in-memory filters `b.weekPlanId === weekPlanId`; Supabase delegates to `fetchBlocksByWeekPlanId(weekPlanId)`; the new `fetchBlocksByWeekPlanId` helper takes `weekPlanId: string`. Consistent.
- `DiaryRepository.findByUserAndDate(userId, date: Date)` — in-memory uses `isSameLocalDay(e.entryDate, date)`; Supabase translates `date` → `formatDateKey(date)` before calling `fetchDiaryEntry(userId, dateKey)`. Consistent.
- `formatDateKey` (single-argument `Date` input) matches the module introduced in the prior sub-project. `isSameLocalDay` same module.
- `PlanChange.createdAt` is `string`, not `Date`. Plan reflects this — `InMemoryPlanChangeRepository.listByWeek` sorts with `localeCompare`, which works on ISO-formatted strings.
- The `save`-throws-on-duplicate and `update`-throws-on-missing semantics are consistent across all in-memory impls that have both.

All checks pass.
