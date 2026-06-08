# OKR Linkage & Live Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link weekly tasks and blocks to Key Results, and show each KR's live execution stats (linked weekly-task completions + executed blocks) for its cycle's date range, computed on read.

**Architecture:** Builds on Plan 1 (`2026-06-08-okr-foundation.md`). Adds an optional `keyResultId` to `Block` and `WeeklyTask`, a focused `OkrStatsRepository` port whose Supabase implementation does the date-range joins, a `GetCycleOkrViewUseCase` that assembles the cycle tree with computed `KeyResultProgress`, a `ListKeyResultsForWeekUseCase` for the link dropdowns, and edit-time KR dropdowns in the block side panel and the weekly checklist.

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase (Postgres), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-08-okr-integration-design.md`

**Prerequisite:** Plan 1 merged (entities, repos, CRUD use cases, `/okr` page exist).

**Key architectural notes discovered in the codebase (read before starting):**
- `keyResultId` is added as **optional** in the `CreateXInput` types and defaulted to `null` inside the `createX` factory, because existing call sites (`app-state-provider.tsx`, `database.ts`) build blocks/tasks without it. Making it required would break them.
- Weekly tasks have **no repository implementation** — the UI persists them through free functions in `database.ts` via `app-state-provider.tsx`. So weekly-task linking and weekly-task stats use `database.ts` functions, not a repository. Block linking uses the existing `BlockRepository` (it has `update`).
- KR execution stats live behind a new `OkrStatsRepository` port (Supabase-only; the joins are SQL). Use-case tests mock it. There is no in-memory implementation because no in-memory app path needs it.
- Block date filtering joins `blocks → week_plans.week_start`; weekly-task completion filtering joins `weekly_task_completions → weekly_tasks(key_result_id)` — mirroring the existing `fetchWeeklyTaskCompletions` join in `database.ts`.

---

## Task 1: Add `keyResultId` to the Block entity

**Files:**
- Modify: `src/domain/entities/block.ts`
- Modify: `src/__tests__/domain/entities/block.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/__tests__/domain/entities/block.test.ts` (inside the existing `describe`):

```ts
  it("defaults keyResultId to null", () => {
    const block = createBlock({
      id: "b-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "t",
      description: "",
      status: BlockStatus.Planned,
    });
    expect(block.keyResultId).toBeNull();
  });

  it("keeps an explicit keyResultId", () => {
    const block = createBlock({
      id: "b-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "t",
      description: "",
      status: BlockStatus.Planned,
      keyResultId: "k-1",
    });
    expect(block.keyResultId).toBe("k-1");
  });
```

> If `block.test.ts` does not already import `BlockType`/`BlockStatus`/`createBlock`, add them to its imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/block.test.ts`
Expected: FAIL — `keyResultId` does not exist on the returned object / not assignable in input.

- [ ] **Step 3: Modify the entity**

In `src/domain/entities/block.ts`, add `keyResultId` to both interfaces and default it in the factory:

```ts
export interface Block {
  readonly id: string;
  readonly weekPlanId: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
  readonly title: string;
  readonly description: string;
  readonly status: BlockStatus;
  readonly keyResultId: string | null;
}

export interface CreateBlockInput {
  id: string;
  weekPlanId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
  status: BlockStatus;
  keyResultId?: string | null;
}

export function createBlock(input: CreateBlockInput): Block {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7)
    throw new Error("dayOfWeek must be between 1 and 7");
  if (input.slot < 1 || input.slot > 6)
    throw new Error("slot must be between 1 and 6");
  return { ...input, keyResultId: input.keyResultId ?? null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/entities/block.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check the whole project (call sites)**

Run: `pnpm tsc --noEmit`
Expected: PASS — existing `createBlock` call sites compile because `keyResultId` is optional and `{ ...existing, ... }` updates preserve it.

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/block.ts src/__tests__/domain/entities/block.test.ts
git commit -m "feat: add optional keyResultId to Block entity"
```

---

## Task 2: Add `keyResultId` to the WeeklyTask entity

**Files:**
- Modify: `src/domain/entities/weekly-task.ts`
- Modify: `src/__tests__/domain/entities/weekly-task.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/__tests__/domain/entities/weekly-task.test.ts` (inside the existing `describe`):

```ts
  it("defaults keyResultId to null", () => {
    const task = createWeeklyTask({
      id: "t-1",
      userId: "u-1",
      title: "運動",
      position: 0,
      isActive: true,
      createdAt: new Date(),
    });
    expect(task.keyResultId).toBeNull();
  });

  it("keeps an explicit keyResultId", () => {
    const task = createWeeklyTask({
      id: "t-1",
      userId: "u-1",
      title: "運動",
      position: 0,
      isActive: true,
      createdAt: new Date(),
      keyResultId: "k-1",
    });
    expect(task.keyResultId).toBe("k-1");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/weekly-task.test.ts`
Expected: FAIL — `keyResultId` not present.

- [ ] **Step 3: Modify the entity**

In `src/domain/entities/weekly-task.ts`:

```ts
export interface WeeklyTask {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly keyResultId: string | null;
}

export interface CreateWeeklyTaskInput {
  id: string;
  userId: string;
  title: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
  keyResultId?: string | null;
}

export function createWeeklyTask(input: CreateWeeklyTaskInput): WeeklyTask {
  if (!input.title.trim()) {
    throw new Error("WeeklyTask title is required");
  }
  if (input.position < 0) {
    throw new Error("position must be non-negative");
  }
  return { ...input, keyResultId: input.keyResultId ?? null };
}
```

- [ ] **Step 4: Run test + type-check**

Run: `pnpm vitest run src/__tests__/domain/entities/weekly-task.test.ts && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/weekly-task.ts src/__tests__/domain/entities/weekly-task.test.ts
git commit -m "feat: add optional keyResultId to WeeklyTask entity"
```

---

## Task 3: KeyResultProgress view types + OkrStatsRepository port

**Files:**
- Create: `src/domain/entities/key-result-progress.ts`
- Create: `src/domain/repositories/okr-stats-repository.ts`

No test (types + interface only; behaviour is covered by Task 4).

- [ ] **Step 1: Create the view/progress types**

```ts
// src/domain/entities/key-result-progress.ts
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";

export interface KeyResultProgress {
  keyResultId: string;
  manualProgress: number; // currentValue / targetValue, clamped 0..1
  linkedWeeklyTaskCount: number;
  weeklyTaskCompletionCount: number;
  linkedBlockCount: number;
  completedBlockCount: number;
}

export interface KeyResultWithProgress {
  keyResult: KeyResult;
  progress: KeyResultProgress;
}

export interface ObjectiveWithKeyResults {
  objective: Objective;
  keyResults: KeyResultWithProgress[];
}

export interface CycleOkrView {
  cycle: OkrCycle;
  objectives: ObjectiveWithKeyResults[];
}
```

- [ ] **Step 2: Create the stats port**

```ts
// src/domain/repositories/okr-stats-repository.ts
import { Block } from "@/domain/entities/block";

export interface OkrStatsRepository {
  countLinkedWeeklyTasksForKeyResult(keyResultId: string): Promise<number>;
  countWeeklyTaskCompletionsForKeyResult(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<number>;
  findBlocksForKeyResultInRange(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<Block[]>;
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/domain/entities/key-result-progress.ts src/domain/repositories/okr-stats-repository.ts
git commit -m "feat: add KeyResultProgress view types and OkrStatsRepository port"
```

---

## Task 4: GetCycleOkrViewUseCase

**Files:**
- Create: `src/domain/usecases/get-cycle-okr-view.ts`
- Test: `src/__tests__/domain/usecases/get-cycle-okr-view.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/get-cycle-okr-view.test.ts
import { describe, it, expect, vi } from "vitest";
import { GetCycleOkrViewUseCase } from "@/domain/usecases/get-cycle-okr-view";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";
import { Block, BlockStatus, BlockType } from "@/domain/entities/block";

const cycle: OkrCycle = {
  id: "c-1",
  userId: "u-1",
  name: "2026 Q3",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-09-30"),
  createdAt: new Date(),
};

const objective: Objective = {
  id: "o-1",
  cycleId: "c-1",
  title: "健康",
  description: "",
  position: 0,
  createdAt: new Date(),
};

const kr: KeyResult = {
  id: "k-1",
  objectiveId: "o-1",
  title: "讀書",
  unit: "本",
  targetValue: 10,
  currentValue: 5,
  position: 0,
  createdAt: new Date(),
};

const block = (status: BlockStatus): Block => ({
  id: crypto.randomUUID(),
  weekPlanId: "wp-1",
  dayOfWeek: 1,
  slot: 1,
  blockType: BlockType.Core,
  title: "讀書",
  description: "",
  status,
  keyResultId: "k-1",
});

const makeCycleRepo = (): OkrCycleRepository => ({
  findForUser: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});
const makeObjRepo = (): ObjectiveRepository => ({
  findByCycle: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});
const makeKrRepo = (): KeyResultRepository => ({
  findByObjective: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});
const makeStatsRepo = (): OkrStatsRepository => ({
  countLinkedWeeklyTasksForKeyResult: vi.fn(),
  countWeeklyTaskCompletionsForKeyResult: vi.fn(),
  findBlocksForKeyResultInRange: vi.fn(),
});

describe("GetCycleOkrViewUseCase", () => {
  it("assembles the tree and computes progress over the cycle range", async () => {
    const cycleRepo = makeCycleRepo();
    const objRepo = makeObjRepo();
    const krRepo = makeKrRepo();
    const statsRepo = makeStatsRepo();

    vi.mocked(cycleRepo.findById).mockResolvedValue(cycle);
    vi.mocked(objRepo.findByCycle).mockResolvedValue([objective]);
    vi.mocked(krRepo.findByObjective).mockResolvedValue([kr]);
    vi.mocked(statsRepo.countLinkedWeeklyTasksForKeyResult).mockResolvedValue(3);
    vi.mocked(
      statsRepo.countWeeklyTaskCompletionsForKeyResult,
    ).mockResolvedValue(18);
    vi.mocked(statsRepo.findBlocksForKeyResultInRange).mockResolvedValue([
      block(BlockStatus.Completed),
      block(BlockStatus.Completed),
      block(BlockStatus.Planned),
    ]);

    const view = await new GetCycleOkrViewUseCase(
      cycleRepo,
      objRepo,
      krRepo,
      statsRepo,
    ).execute("c-1");

    expect(view.cycle.id).toBe("c-1");
    const prog = view.objectives[0].keyResults[0].progress;
    expect(prog.manualProgress).toBe(0.5);
    expect(prog.linkedWeeklyTaskCount).toBe(3);
    expect(prog.weeklyTaskCompletionCount).toBe(18);
    expect(prog.linkedBlockCount).toBe(3);
    expect(prog.completedBlockCount).toBe(2);

    // Passes the cycle's date range as YYYY-MM-DD keys.
    expect(
      statsRepo.countWeeklyTaskCompletionsForKeyResult,
    ).toHaveBeenCalledWith("k-1", "2026-07-01", "2026-09-30");
    expect(statsRepo.findBlocksForKeyResultInRange).toHaveBeenCalledWith(
      "k-1",
      "2026-07-01",
      "2026-09-30",
    );
  });

  it("throws when the cycle is missing", async () => {
    const cycleRepo = makeCycleRepo();
    vi.mocked(cycleRepo.findById).mockResolvedValue(null);
    await expect(
      new GetCycleOkrViewUseCase(
        cycleRepo,
        makeObjRepo(),
        makeKrRepo(),
        makeStatsRepo(),
      ).execute("nope"),
    ).rejects.toThrow("OkrCycle nope not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/get-cycle-okr-view.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the use case**

```ts
// src/domain/usecases/get-cycle-okr-view.ts
import { BlockStatus } from "@/domain/entities/block";
import { keyResultProgress } from "@/domain/entities/key-result";
import {
  CycleOkrView,
  KeyResultWithProgress,
  ObjectiveWithKeyResults,
} from "@/domain/entities/key-result-progress";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import { formatDateKey } from "@/lib/date-helpers";

export class GetCycleOkrViewUseCase {
  constructor(
    private readonly cycleRepo: OkrCycleRepository,
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly keyResultRepo: KeyResultRepository,
    private readonly statsRepo: OkrStatsRepository,
  ) {}

  async execute(cycleId: string): Promise<CycleOkrView> {
    const cycle = await this.cycleRepo.findById(cycleId);
    if (!cycle) throw new Error(`OkrCycle ${cycleId} not found`);

    const startKey = formatDateKey(cycle.startDate);
    const endKey = formatDateKey(cycle.endDate);

    const objectives = await this.objectiveRepo.findByCycle(cycleId);
    const objectiveViews: ObjectiveWithKeyResults[] = [];

    for (const objective of objectives) {
      const keyResults = await this.keyResultRepo.findByObjective(objective.id);
      const krViews: KeyResultWithProgress[] = [];

      for (const kr of keyResults) {
        const [linkedWeeklyTaskCount, weeklyTaskCompletionCount, blocks] =
          await Promise.all([
            this.statsRepo.countLinkedWeeklyTasksForKeyResult(kr.id),
            this.statsRepo.countWeeklyTaskCompletionsForKeyResult(
              kr.id,
              startKey,
              endKey,
            ),
            this.statsRepo.findBlocksForKeyResultInRange(
              kr.id,
              startKey,
              endKey,
            ),
          ]);

        krViews.push({
          keyResult: kr,
          progress: {
            keyResultId: kr.id,
            manualProgress: keyResultProgress(kr),
            linkedWeeklyTaskCount,
            weeklyTaskCompletionCount,
            linkedBlockCount: blocks.length,
            completedBlockCount: blocks.filter(
              (b) => b.status === BlockStatus.Completed,
            ).length,
          },
        });
      }

      objectiveViews.push({ objective, keyResults: krViews });
    }

    return { cycle, objectives: objectiveViews };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/get-cycle-okr-view.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/get-cycle-okr-view.ts src/__tests__/domain/usecases/get-cycle-okr-view.test.ts
git commit -m "feat: add GetCycleOkrViewUseCase with live progress stats"
```

---

## Task 5: ListKeyResultsForWeekUseCase

**Files:**
- Create: `src/domain/usecases/list-key-results-for-week.ts`
- Test: `src/__tests__/domain/usecases/list-key-results-for-week.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/list-key-results-for-week.test.ts
import { describe, it, expect, vi } from "vitest";
import { ListKeyResultsForWeekUseCase } from "@/domain/usecases/list-key-results-for-week";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";

const cycle: OkrCycle = {
  id: "c-1",
  userId: "u-1",
  name: "Q3",
  startDate: new Date("2026-07-06"),
  endDate: new Date("2026-09-28"),
  createdAt: new Date(),
};
const objective: Objective = {
  id: "o-1",
  cycleId: "c-1",
  title: "健康",
  description: "",
  position: 0,
  createdAt: new Date(),
};
const kr: KeyResult = {
  id: "k-1",
  objectiveId: "o-1",
  title: "讀書",
  unit: "本",
  targetValue: 10,
  currentValue: 0,
  position: 0,
  createdAt: new Date(),
};

const makeCycleRepo = (): OkrCycleRepository => ({
  findForUser: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});
const makeObjRepo = (): ObjectiveRepository => ({
  findByCycle: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});
const makeKrRepo = (): KeyResultRepository => ({
  findByObjective: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

describe("ListKeyResultsForWeekUseCase", () => {
  it("returns KR options from the cycle covering the week", async () => {
    const cycleRepo = makeCycleRepo();
    const objRepo = makeObjRepo();
    const krRepo = makeKrRepo();
    vi.mocked(cycleRepo.findForUser).mockResolvedValue([cycle]);
    vi.mocked(objRepo.findByCycle).mockResolvedValue([objective]);
    vi.mocked(krRepo.findByObjective).mockResolvedValue([kr]);

    const options = await new ListKeyResultsForWeekUseCase(
      cycleRepo,
      objRepo,
      krRepo,
    ).execute("u-1", new Date("2026-08-03")); // a Monday inside the cycle

    expect(options).toEqual([
      { keyResultId: "k-1", title: "讀書", objectiveTitle: "健康" },
    ]);
  });

  it("returns empty when the week is in no cycle", async () => {
    const cycleRepo = makeCycleRepo();
    vi.mocked(cycleRepo.findForUser).mockResolvedValue([cycle]);
    const options = await new ListKeyResultsForWeekUseCase(
      cycleRepo,
      makeObjRepo(),
      makeKrRepo(),
    ).execute("u-1", new Date("2026-12-07")); // outside the cycle
    expect(options).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/list-key-results-for-week.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the use case**

```ts
// src/domain/usecases/list-key-results-for-week.ts
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export interface KeyResultOption {
  keyResultId: string;
  title: string;
  objectiveTitle: string;
}

export class ListKeyResultsForWeekUseCase {
  constructor(
    private readonly cycleRepo: OkrCycleRepository,
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly keyResultRepo: KeyResultRepository,
  ) {}

  async execute(userId: string, weekStart: Date): Promise<KeyResultOption[]> {
    const cycles = await this.cycleRepo.findForUser(userId);
    const ts = weekStart.getTime();
    const cycle = cycles.find(
      (c) => c.startDate.getTime() <= ts && ts <= c.endDate.getTime(),
    );
    if (!cycle) return [];

    const objectives = await this.objectiveRepo.findByCycle(cycle.id);
    const options: KeyResultOption[] = [];
    for (const objective of objectives) {
      const krs = await this.keyResultRepo.findByObjective(objective.id);
      for (const kr of krs) {
        options.push({
          keyResultId: kr.id,
          title: kr.title,
          objectiveTitle: objective.title,
        });
      }
    }
    return options;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/list-key-results-for-week.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/list-key-results-for-week.ts src/__tests__/domain/usecases/list-key-results-for-week.test.ts
git commit -m "feat: add ListKeyResultsForWeekUseCase for link dropdowns"
```

---

## Task 6: LinkBlockToKeyResultUseCase

**Files:**
- Create: `src/domain/usecases/link-block-to-key-result.ts`
- Test: `src/__tests__/domain/usecases/link-block-to-key-result.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/link-block-to-key-result.test.ts
import { describe, it, expect, vi } from "vitest";
import { LinkBlockToKeyResultUseCase } from "@/domain/usecases/link-block-to-key-result";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockStatus, BlockType } from "@/domain/entities/block";

const block: Block = {
  id: "b-1",
  weekPlanId: "wp-1",
  dayOfWeek: 1,
  slot: 1,
  blockType: BlockType.Core,
  title: "讀書",
  description: "",
  status: BlockStatus.Planned,
  keyResultId: null,
};

const makeRepo = (): BlockRepository => ({
  findByWeekPlan: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

describe("LinkBlockToKeyResultUseCase", () => {
  it("sets the keyResultId", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(block);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToKeyResultUseCase(repo).execute(
      "b-1",
      "k-1",
    );
    expect(result.keyResultId).toBe("k-1");
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b-1", keyResultId: "k-1" }),
    );
  });

  it("clears the keyResultId when given null", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue({
      ...block,
      keyResultId: "k-1",
    });
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToKeyResultUseCase(repo).execute(
      "b-1",
      null,
    );
    expect(result.keyResultId).toBeNull();
  });

  it("throws when the block is missing", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new LinkBlockToKeyResultUseCase(repo).execute("nope", "k-1"),
    ).rejects.toThrow("Block nope not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/link-block-to-key-result.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the use case**

```ts
// src/domain/usecases/link-block-to-key-result.ts
import { Block } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export class LinkBlockToKeyResultUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(blockId: string, keyResultId: string | null): Promise<Block> {
    const existing = await this.repo.findById(blockId);
    if (!existing) throw new Error(`Block ${blockId} not found`);
    const updated: Block = { ...existing, keyResultId };
    await this.repo.update(updated);
    return updated;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/link-block-to-key-result.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/link-block-to-key-result.ts src/__tests__/domain/usecases/link-block-to-key-result.test.ts
git commit -m "feat: add LinkBlockToKeyResultUseCase"
```

---

## Task 7: Migration — add `key_result_id` columns

**Files:**
- Create: `supabase/migrations/20260608_okr_linkage.sql` (match the location/style chosen in Plan 1 Task 11)

- [ ] **Step 1: Write the migration**

```sql
-- OKR linkage: attach blocks and weekly tasks to key results
alter table blocks
  add column if not exists key_result_id uuid null
  references key_results(id) on delete set null;
create index if not exists blocks_key_result_id_idx on blocks(key_result_id);

alter table weekly_tasks
  add column if not exists key_result_id uuid null
  references key_results(id) on delete set null;
create index if not exists weekly_tasks_key_result_id_idx
  on weekly_tasks(key_result_id);
```

- [ ] **Step 2: Apply the migration** (Supabase CLI `supabase db push` or SQL editor). Confirm both columns exist and are nullable.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260608_okr_linkage.sql
git commit -m "feat: add key_result_id columns to blocks and weekly_tasks"
```

---

## Task 8: Persistence — map columns, link setters, stats repository

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-okr-stats-repository.ts`

- [ ] **Step 1: Map `key_result_id` on blocks in `database.ts`**

In `DbBlock` add the field, and thread it through `dbBlockToEntity`, `insertBlockRow`, and `updateBlockRow`:

```ts
interface DbBlock {
  id: string;
  week_plan_id: string;
  day_of_week: number;
  slot: number;
  block_type_id: number;
  title: string | null;
  description: string | null;
  status: string;
  key_result_id: string | null;
}
```

In `dbBlockToEntity`, add to the `createBlock({ ... })` call:

```ts
    keyResultId: db.key_result_id ?? null,
```

In `insertBlockRow`, add to the `.insert({ ... })` object:

```ts
    key_result_id: block.keyResultId,
```

In `updateBlockRow`, add to the `.update({ ... })` object:

```ts
    key_result_id: block.keyResultId,
```

> `upsertBlock` does not set `key_result_id` (it edits title/type only); the DB column defaults to null on insert and is preserved on update because that query does not touch the column. No change needed there.

- [ ] **Step 2: Map `key_result_id` on weekly tasks in `database.ts`**

In `DbWeeklyTask` add the field and thread it through `dbWeeklyTaskToEntity`:

```ts
interface DbWeeklyTask {
  id: string;
  user_id: string;
  title: string;
  position: number;
  is_active: boolean;
  created_at: string;
  key_result_id: string | null;
}
```

In `dbWeeklyTaskToEntity`, add to the `createWeeklyTask({ ... })` call:

```ts
    keyResultId: db.key_result_id ?? null,
```

- [ ] **Step 3: Add the weekly-task link setter to `database.ts`**

> Block linking goes through `LinkBlockToKeyResultUseCase` → `BlockRepository.update` → `updateBlockRow` (which now persists `key_result_id` from Step 1), so no block-specific setter is needed here. Weekly tasks have no repository, so they need this free function.

```ts
export async function dbSetWeeklyTaskKeyResult(
  weeklyTaskId: string,
  keyResultId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ key_result_id: keyResultId })
    .eq("id", weeklyTaskId);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Add the stats query functions to `database.ts`**

```ts
export async function countLinkedWeeklyTasks(
  keyResultId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("weekly_tasks")
    .select("id", { count: "exact", head: true })
    .eq("key_result_id", keyResultId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countWeeklyTaskCompletionsForKeyResult(
  keyResultId: string,
  startKey: string,
  endKey: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("weekly_task_completions")
    .select("week_start, weekly_tasks!inner(key_result_id)", {
      count: "exact",
      head: true,
    })
    .eq("weekly_tasks.key_result_id", keyResultId)
    .gte("week_start", startKey)
    .lte("week_start", endKey);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchBlocksForKeyResultInRange(
  keyResultId: string,
  startKey: string,
  endKey: string,
): Promise<Block[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*, week_plans!inner(week_start)")
    .eq("key_result_id", keyResultId)
    .gte("week_plans.week_start", startKey)
    .lte("week_plans.week_start", endKey);
  if (error) throw new Error(error.message);
  return (data as DbBlock[]).map((db) => dbBlockToEntity(db));
}
```

> The `select("*, week_plans!inner(week_start)")` returns the joined column too, but `dbBlockToEntity` only reads the `DbBlock` fields, so the extra nested object is ignored. This mirrors the existing `fetchWeeklyTaskCompletions` join style.

- [ ] **Step 5: Write the stats repository**

```ts
// src/infrastructure/supabase/repositories/supabase-okr-stats-repository.ts
import type { Block } from "@/domain/entities/block";
import type { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import {
  countLinkedWeeklyTasks,
  countWeeklyTaskCompletionsForKeyResult,
  fetchBlocksForKeyResultInRange,
} from "@/infrastructure/supabase/database";

export class SupabaseOkrStatsRepository implements OkrStatsRepository {
  countLinkedWeeklyTasksForKeyResult(keyResultId: string): Promise<number> {
    return countLinkedWeeklyTasks(keyResultId);
  }
  countWeeklyTaskCompletionsForKeyResult(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<number> {
    return countWeeklyTaskCompletionsForKeyResult(keyResultId, startKey, endKey);
  }
  findBlocksForKeyResultInRange(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<Block[]> {
    return fetchBlocksForKeyResultInRange(keyResultId, startKey, endKey);
  }
}
```

- [ ] **Step 6: Type-check, lint, and run the full suite** (entity changes ripple through existing tests)

Run: `pnpm tsc --noEmit && pnpm lint && pnpm vitest run`
Expected: PASS. If any existing test constructs a `Block`/`WeeklyTask` object literal (not via the factory) and now lacks `keyResultId`, add `keyResultId: null` to it.

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-okr-stats-repository.ts
git commit -m "feat: persist key_result_id and add OKR stats queries"
```

---

## Task 9: Wire new use cases + stats repo into the providers

**Files:**
- Modify: `src/presentation/providers/dependency-provider.tsx`
- Modify: `src/presentation/providers/production-dependency-provider.tsx`

- [ ] **Step 1: Extend `dependency-provider.tsx`**

Add imports:

```ts
import { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import { GetCycleOkrViewUseCase } from "@/domain/usecases/get-cycle-okr-view";
import { ListKeyResultsForWeekUseCase } from "@/domain/usecases/list-key-results-for-week";
import { LinkBlockToKeyResultUseCase } from "@/domain/usecases/link-block-to-key-result";
```

Add to the `UseCases` interface:

```ts
  getCycleOkrView: GetCycleOkrViewUseCase;
  listKeyResultsForWeek: ListKeyResultsForWeekUseCase;
  linkBlockToKeyResult: LinkBlockToKeyResultUseCase;
```

Add to the `Repositories` interface:

```ts
  okrStatsRepo: OkrStatsRepository;
```

Add to the `useMemo<UseCases>` object (the OKR repos from Plan 1 are already on `repositories`):

```ts
      getCycleOkrView: new GetCycleOkrViewUseCase(
        repositories.okrCycleRepo,
        repositories.objectiveRepo,
        repositories.keyResultRepo,
        repositories.okrStatsRepo,
      ),
      listKeyResultsForWeek: new ListKeyResultsForWeekUseCase(
        repositories.okrCycleRepo,
        repositories.objectiveRepo,
        repositories.keyResultRepo,
      ),
      linkBlockToKeyResult: new LinkBlockToKeyResultUseCase(
        repositories.blockRepo,
      ),
```

- [ ] **Step 2: Extend `production-dependency-provider.tsx`**

Add import + repo instance:

```ts
import { SupabaseOkrStatsRepository } from "@/infrastructure/supabase/repositories/supabase-okr-stats-repository";
```

In the `useMemo` repositories object:

```ts
      okrStatsRepo: new SupabaseOkrStatsRepository(),
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/presentation/providers/dependency-provider.tsx src/presentation/providers/production-dependency-provider.tsx
git commit -m "feat: wire OKR stats use cases into providers"
```

---

## Task 10: App-state — KR options + link actions

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

This adds the shared state the dropdowns read/write. Weekly-task linking uses a `database.ts` function directly (weekly tasks have no repository); block linking goes through `useCases.linkBlockToKeyResult` and updates the local `supaBlocks` map.

- [ ] **Step 1: Add imports**

Add to the `database.ts` import block:

```ts
  dbSetWeeklyTaskKeyResult,
```

Add a new import:

```ts
import type { KeyResultOption } from "@/domain/usecases/list-key-results-for-week";
```

- [ ] **Step 2: Extend the `AppState` interface**

```ts
  keyResultOptions: KeyResultOption[];
  loadKeyResultOptions: (weekStart: Date) => void;
  linkBlockToKeyResult: (blockId: string, keyResultId: string | null) => void;
  linkWeeklyTaskToKeyResult: (
    id: string,
    keyResultId: string | null,
  ) => void;
```

- [ ] **Step 3: Add state + actions inside `AppStateProvider`**

Add state near the other `useState` calls:

```ts
  const [keyResultOptions, setKeyResultOptions] = useState<KeyResultOption[]>(
    [],
  );
```

Add the three callbacks (place them near `toggleWeeklyTaskCompletion`):

```ts
  const loadKeyResultOptions = useCallback(
    (weekStart: Date) => {
      if (!user) {
        Promise.resolve().then(() => setKeyResultOptions([]));
        return;
      }
      useCases.listKeyResultsForWeek
        .execute(user.id, weekStart)
        .then((opts) => setKeyResultOptions(opts))
        .catch((err) => {
          console.error(err);
          setKeyResultOptions([]);
        });
    },
    [user, useCases],
  );

  const linkBlockToKeyResult = useCallback(
    (blockId: string, keyResultId: string | null) => {
      setSupaBlocks((prev) => {
        const out: Record<string, Block[]> = {};
        for (const [wk, list] of Object.entries(prev)) {
          out[wk] = list.map((b) =>
            b.id === blockId ? createBlock({ ...b, keyResultId }) : b,
          );
        }
        return out;
      });
      useCases.linkBlockToKeyResult
        .execute(blockId, keyResultId)
        .catch((err) => {
          console.error(err);
          notify.error("區塊歸屬 KR 失敗");
        });
    },
    [useCases, notify],
  );

  const linkWeeklyTaskToKeyResult = useCallback(
    (id: string, keyResultId: string | null) => {
      setWeeklyTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, keyResultId } : t)),
      );
      dbSetWeeklyTaskKeyResult(id, keyResultId).catch((err) => {
        console.error(err);
        notify.error("週任務歸屬 KR 失敗");
      });
    },
    [notify],
  );
```

- [ ] **Step 4: Expose them on the context value**

Add to the `<AppStateContext.Provider value={{ ... }}>` object:

```ts
        keyResultOptions,
        loadKeyResultOptions,
        linkBlockToKeyResult,
        linkWeeklyTaskToKeyResult,
```

- [ ] **Step 5: Type-check + commit**

```bash
pnpm tsc --noEmit
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: app-state KR options and link actions"
```

---

## Task 11: OKR page — show live auto-stats

**Files:**
- Modify: `src/presentation/components/okr/okr-page-client.tsx`
- Modify: `src/presentation/components/okr/objective-card.tsx`
- Modify: `src/presentation/components/okr/key-result-row.tsx`

Switch the page from the manual per-objective fetch (Plan 1) to `GetCycleOkrViewUseCase`, and render the two auto-stat lines.

- [ ] **Step 1: `key-result-row.tsx` — accept and render progress**

Replace the file with:

```tsx
// src/presentation/components/okr/key-result-row.tsx
"use client";

import { KeyResult, keyResultProgress } from "@/domain/entities/key-result";
import { KeyResultProgress } from "@/domain/entities/key-result-progress";
import { KeyResultValueEditor } from "./key-result-value-editor";

interface Props {
  keyResult: KeyResult;
  progress: KeyResultProgress;
  onSaveValue: (value: number) => void;
  onDelete: () => void;
}

export function KeyResultRow({
  keyResult,
  progress,
  onSaveValue,
  onDelete,
}: Props) {
  const pct = Math.round(keyResultProgress(keyResult) * 100);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "8px 0",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>
          {keyResult.title}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label="刪除 KR"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          height: "6px",
          borderRadius: "3px",
          background: "var(--color-bg-primary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--color-accent)",
          }}
        />
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
        <KeyResultValueEditor
          currentValue={keyResult.currentValue}
          unit={keyResult.unit}
          targetValue={keyResult.targetValue}
          onSave={onSaveValue}
        />{" "}
        ({pct}%)
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
        🔗 週任務 {progress.linkedWeeklyTaskCount} 個・這季完成{" "}
        {progress.weeklyTaskCompletionCount} 次
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
        ⏱ block 排 {progress.linkedBlockCount}・已執行{" "}
        {progress.completedBlockCount}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `objective-card.tsx` — pass `KeyResultWithProgress`**

Change the imports and the `keyResults` prop type, and pass `progress` into `KeyResultRow`. Replace the import line and the `Props` interface, and update the `.map`:

Replace:

```tsx
import { KeyResult } from "@/domain/entities/key-result";
```

with:

```tsx
import { KeyResultWithProgress } from "@/domain/entities/key-result-progress";
```

Change the prop:

```tsx
  keyResults: KeyResultWithProgress[];
```

Update the render loop:

```tsx
      {keyResults.map(({ keyResult, progress }) => (
        <KeyResultRow
          key={keyResult.id}
          keyResult={keyResult}
          progress={progress}
          onSaveValue={(v) => onSaveKeyResultValue(keyResult.id, v)}
          onDelete={() => onDeleteKeyResult(keyResult.id)}
        />
      ))}
```

- [ ] **Step 3: `okr-page-client.tsx` — load via GetCycleOkrView**

Replace the state + loaders. Remove the `objectives` / `krsByObjective` state and `loadTree`, and use a single `view` state:

Replace the imports of `Objective`/`KeyResult` with:

```tsx
import { CycleOkrView } from "@/domain/entities/key-result-progress";
```

Replace the two state declarations `objectives` and `krsByObjective` with:

```tsx
  const [view, setView] = useState<CycleOkrView | null>(null);
```

Replace `loadTree` with:

```tsx
  const loadView = useCallback(
    async (cycleId: string) => {
      const v = await useCases.getCycleOkrView.execute(cycleId);
      setView(v);
    },
    [useCases],
  );
```

Update the `useEffect` that called `loadTree(selectedId)` to call `loadView(selectedId)` (and update its dependency array to `[selectedId, loadView, notify]`).

Replace `const refresh = () => selectedId && loadTree(selectedId);` with:

```tsx
  const refresh = () => selectedId && loadView(selectedId);
```

Update `handleAddObjective` to call `await loadView(selectedId)` instead of `loadTree`.

Replace the objectives render block with:

```tsx
      {view &&
        view.objectives.map(({ objective, keyResults }) => (
          <ObjectiveCard
            key={objective.id}
            objective={objective}
            keyResults={keyResults}
            onDeleteObjective={async () => {
              await useCases.deleteObjective.execute(objective.id);
              await refresh();
            }}
            onAddKeyResult={async (data) => {
              await useCases.createKeyResult.execute(objective.id, data);
              await refresh();
            }}
            onSaveKeyResultValue={async (krId, value) => {
              await useCases.updateKeyResultValue.execute(krId, value);
              await refresh();
            }}
            onDeleteKeyResult={async (krId) => {
              await useCases.deleteKeyResult.execute(krId);
              await refresh();
            }}
          />
        ))}
```

> Also change the condition that gated the "new objective" input from `selectedId && ...` to `view && ...` (so it shows once the view has loaded). The `ListObjectivesByCycleUseCase` / `ListKeyResultsByObjectiveUseCase` from Plan 1 are no longer used by this page; leave them in place (still injected) — they do no harm.

- [ ] **Step 4: Verify, type-check, lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: PASS.

Run `pnpm dev`, open `/okr`: KRs now show the two extra stat lines (all zeros until linking exists). Editing currentValue still works and refreshes via `GetCycleOkrView`.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/okr/
git commit -m "feat: show live KR auto-stats on the OKR page"
```

---

## Task 12: Block side panel — "Attach to KR" dropdown

**Files:**
- Modify: `src/presentation/components/side-panel/block-editor.tsx`
- Modify: `src/presentation/components/side-panel/side-panel.tsx`
- Modify: `src/app/page.tsx`

The dropdown appears only when the block already exists (it needs a block id). It reads `keyResultOptions` from app-state and calls `linkBlockToKeyResult`.

- [ ] **Step 1: `block-editor.tsx` — add the dropdown**

Add to `BlockEditorProps`:

```tsx
  blockId: string | null;
  keyResultId: string | null;
  keyResultOptions: { keyResultId: string; title: string; objectiveTitle: string }[];
  onLinkKeyResult: (keyResultId: string | null) => void;
```

Destructure the new props in the component signature, then render the dropdown just before the 儲存 button (only when `blockId` is set):

```tsx
      {blockId && keyResultOptions.length > 0 && (
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
            歸屬 KR
          </label>
          <select
            value={keyResultId ?? ""}
            onChange={(e) => onLinkKeyResult(e.target.value || null)}
            style={{
              width: "100%",
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "8px",
              fontSize: "14px",
            }}
          >
            <option value="">— 不歸屬 —</option>
            {keyResultOptions.map((opt) => (
              <option key={opt.keyResultId} value={opt.keyResultId}>
                {opt.objectiveTitle} / {opt.title}
              </option>
            ))}
          </select>
        </div>
      )}
```

- [ ] **Step 2: `side-panel.tsx` — thread the props through**

Add to `SidePanelProps`:

```tsx
  keyResultOptions: {
    keyResultId: string;
    title: string;
    objectiveTitle: string;
  }[];
  onLinkBlockKeyResult: (keyResultId: string | null) => void;
```

Destructure them in the component signature. Then pass them to `<BlockEditor ... />`:

```tsx
      <BlockEditor
        key={`editor-${dayOfWeek}-${slot}`}
        blockId={block?.id ?? null}
        title={block?.title ?? ""}
        description={block?.description ?? ""}
        blockType={block?.blockType ?? BlockType.General}
        keyResultId={block?.keyResultId ?? null}
        keyResultOptions={keyResultOptions}
        onLinkKeyResult={onLinkBlockKeyResult}
        onSave={onSaveBlock}
      />
```

- [ ] **Step 3: `app/page.tsx` — supply options and handler, load options for the week**

Add `keyResultOptions`, `loadKeyResultOptions`, `linkBlockToKeyResult` to the `useAppState()` destructure.

Add an effect to load options when the week changes (near the other `loadWeek` effect):

```tsx
  useEffect(() => {
    loadKeyResultOptions(weekStart);
  }, [weekStart, loadKeyResultOptions]);
```

Pass the two new props on `<SidePanel ... />`:

```tsx
            keyResultOptions={keyResultOptions}
            onLinkBlockKeyResult={(keyResultId) => {
              if (selectedBlock) linkBlockToKeyResult(selectedBlock.id, keyResultId);
            }}
```

- [ ] **Step 4: Verify, type-check, lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: PASS.

Run `pnpm dev`: with a cycle covering the current week and at least one KR, open an existing block in the side panel → "歸屬 KR" dropdown lists KRs grouped as `Objective / KR`. Select one; reopen the block → selection persists. On `/okr`, the KR's "block 排 / 已執行" updates (set the block status to completed to see 已執行 increment).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/side-panel/block-editor.tsx src/presentation/components/side-panel/side-panel.tsx src/app/page.tsx
git commit -m "feat: attach blocks to a key result from the side panel"
```

---

## Task 13: Weekly checklist — "Attach to KR" dropdown

**Files:**
- Modify: `src/presentation/components/checklist/weekly-checklist-panel.tsx`
- Modify: `src/presentation/components/checklist/floating-checklist-button.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: `weekly-checklist-panel.tsx` — add props + per-row dropdown**

Add to `Props`:

```tsx
  keyResultOptions: {
    keyResultId: string;
    title: string;
    objectiveTitle: string;
  }[];
  onLinkKeyResult: (id: string, keyResultId: string | null) => void;
```

Pass them into each `SortableRow`. Extend `SortableRow`'s prop type with the same two fields, and render a compact `<select>` after the title span (inside the row container, before the delete button):

```tsx
      {keyResultOptions.length > 0 && (
        <select
          value={task.keyResultId ?? ""}
          onChange={(e) => onLinkKeyResult(task.id, e.target.value || null)}
          aria-label="歸屬 KR"
          style={{
            maxWidth: "96px",
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
            fontSize: "11px",
            padding: "2px",
          }}
        >
          <option value="">—</option>
          {keyResultOptions.map((opt) => (
            <option key={opt.keyResultId} value={opt.keyResultId}>
              {opt.title}
            </option>
          ))}
        </select>
      )}
```

In the `WeeklyChecklistPanel` body, destructure the two new props and pass them to each `SortableRow`:

```tsx
            <SortableRow
              key={task.id}
              task={task}
              checked={completedIds.has(task.id)}
              onEdit={onEdit}
              onToggle={onToggle}
              onDisable={onDisable}
              keyResultOptions={keyResultOptions}
              onLinkKeyResult={onLinkKeyResult}
            />
```

- [ ] **Step 2: `floating-checklist-button.tsx` — pass-through**

`FloatingChecklistButton` spreads `...props` into `WeeklyChecklistPanel`, so add the two fields to its `Props` interface so they type-check and forward:

```tsx
  keyResultOptions: {
    keyResultId: string;
    title: string;
    objectiveTitle: string;
  }[];
  onLinkKeyResult: (id: string, keyResultId: string | null) => void;
```

No body change is needed (they ride along in `...props`).

- [ ] **Step 3: `app/page.tsx` — supply props to both checklist usages**

Add `linkWeeklyTaskToKeyResult` to the `useAppState()` destructure (and `keyResultOptions` is already destructured from Task 12).

On the mobile `<WeeklyChecklistPanel ... />` and the desktop `<FloatingChecklistButton ... />`, add:

```tsx
            keyResultOptions={keyResultOptions}
            onLinkKeyResult={linkWeeklyTaskToKeyResult}
```

- [ ] **Step 4: Verify, type-check, lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: PASS.

Run `pnpm dev`: open the weekly checklist (desktop floating button or mobile 清單 tab). Each task row shows a small KR selector. Attach a task to a KR, check it complete for this week → on `/okr` the KR's "週任務 ... 這季完成 N 次" reflects it.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/checklist/weekly-checklist-panel.tsx src/presentation/components/checklist/floating-checklist-button.tsx src/app/page.tsx
git commit -m "feat: attach weekly tasks to a key result from the checklist"
```

---

## Task 14: Full test + build gate

- [ ] **Step 1: Whole suite**

Run: `pnpm vitest run`
Expected: PASS (all OKR + existing tests).

- [ ] **Step 2: Type-check, lint, build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 3: End-to-end manual smoke (logged in)**

- Create cycle covering this week + an objective + a KR (target e.g. 10).
- Side panel: attach an existing block to the KR; set its status completed.
- Checklist: attach a weekly task to the KR; check it complete this week.
- `/okr`: KR shows manual progress, 週任務 1 個・完成 1 次, block 排 1・已執行 1.
- Delete the KR → block/task remain (detached), and reopening them shows "— 不歸屬 —".

- [ ] **Step 4: Commit (only if fixups were needed)**

```bash
git add -A
git commit -m "chore: OKR linkage & stats green (tests + lint + build)"
```

---

## Done — Plan 2 outcome

OKR is fully integrated: weekly tasks and blocks attach to Key Results via edit-time dropdowns, and each KR shows manual progress plus live, always-accurate execution stats (linked weekly-task completions and executed blocks) for its cycle's date range. Deleting a KR detaches its tasks/blocks without deleting them.
