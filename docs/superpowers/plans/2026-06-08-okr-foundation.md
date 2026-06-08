# OKR Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the OKR data layer (cycles → objectives → key results) with CRUD use cases, Supabase + in-memory persistence, and an `/okr` page where the user manages goals and updates manual KR progress.

**Architecture:** Clean Architecture, matching the existing repo. Pure domain entities with factory-validators (`createX`), repository interfaces in `domain/repositories`, in-memory + Supabase implementations in `infrastructure/`, one-class-per-use-case injected via the dependency provider, React UI in `presentation/`. This plan delivers manual-only KRs; linkage and auto-stats come in Plan 2 (`2026-06-08-okr-linkage-stats.md`).

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase (Postgres), Vitest + React Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-08-okr-integration-design.md`

**Conventions to follow (observed in codebase):**
- Entities expose a `createX(input)` factory that validates and returns a frozen-style object (`{ ...input }`).
- Use cases generate ids with `crypto.randomUUID()` and timestamps with `new Date()`.
- In-memory repos use a `private readonly byId = new Map()`; `add`/`save` throws if id exists, `update` throws if id missing.
- Supabase repo classes delegate to free functions in `infrastructure/supabase/database.ts`.
- Use-case unit tests build a repo mock with `vi.fn()` for each interface method.
- Run a single test file with: `pnpm vitest run <path>`.

---

## Task 1: OkrCycle entity

**Files:**
- Create: `src/domain/entities/okr-cycle.ts`
- Test: `src/__tests__/domain/entities/okr-cycle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/entities/okr-cycle.test.ts
import { describe, it, expect } from "vitest";
import { createOkrCycle } from "@/domain/entities/okr-cycle";

describe("OkrCycle", () => {
  const base = {
    id: "c-1",
    userId: "u-1",
    name: "2026 Q3",
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-09-30"),
    createdAt: new Date(),
  };

  it("creates a cycle", () => {
    const cycle = createOkrCycle(base);
    expect(cycle.name).toBe("2026 Q3");
    expect(cycle.userId).toBe("u-1");
  });

  it("rejects blank name", () => {
    expect(() => createOkrCycle({ ...base, name: "  " })).toThrow(
      "OkrCycle name is required",
    );
  });

  it("rejects endDate not after startDate", () => {
    expect(() =>
      createOkrCycle({ ...base, endDate: new Date("2026-07-01") }),
    ).toThrow("endDate must be after startDate");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/okr-cycle.test.ts`
Expected: FAIL — cannot resolve `@/domain/entities/okr-cycle`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/entities/okr-cycle.ts
export interface OkrCycle {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly createdAt: Date;
}

export interface CreateOkrCycleInput {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export function createOkrCycle(input: CreateOkrCycleInput): OkrCycle {
  if (!input.name.trim()) throw new Error("OkrCycle name is required");
  if (input.endDate.getTime() <= input.startDate.getTime())
    throw new Error("endDate must be after startDate");
  return { ...input };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/entities/okr-cycle.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/okr-cycle.ts src/__tests__/domain/entities/okr-cycle.test.ts
git commit -m "feat: add OkrCycle entity"
```

---

## Task 2: Objective entity

**Files:**
- Create: `src/domain/entities/objective.ts`
- Test: `src/__tests__/domain/entities/objective.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/entities/objective.test.ts
import { describe, it, expect } from "vitest";
import { createObjective } from "@/domain/entities/objective";

describe("Objective", () => {
  const base = {
    id: "o-1",
    cycleId: "c-1",
    title: "提升健康",
    description: "",
    position: 0,
    createdAt: new Date(),
  };

  it("creates an objective", () => {
    const obj = createObjective(base);
    expect(obj.title).toBe("提升健康");
    expect(obj.cycleId).toBe("c-1");
  });

  it("rejects blank title", () => {
    expect(() => createObjective({ ...base, title: " " })).toThrow(
      "Objective title is required",
    );
  });

  it("rejects negative position", () => {
    expect(() => createObjective({ ...base, position: -1 })).toThrow(
      "position must be non-negative",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/objective.test.ts`
Expected: FAIL — cannot resolve `@/domain/entities/objective`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/entities/objective.ts
export interface Objective {
  readonly id: string;
  readonly cycleId: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateObjectiveInput {
  id: string;
  cycleId: string;
  title: string;
  description: string;
  position: number;
  createdAt: Date;
}

export function createObjective(input: CreateObjectiveInput): Objective {
  if (!input.title.trim()) throw new Error("Objective title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/entities/objective.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/objective.ts src/__tests__/domain/entities/objective.test.ts
git commit -m "feat: add Objective entity"
```

---

## Task 3: KeyResult entity (+ progress helper)

**Files:**
- Create: `src/domain/entities/key-result.ts`
- Test: `src/__tests__/domain/entities/key-result.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/entities/key-result.test.ts
import { describe, it, expect } from "vitest";
import { createKeyResult, keyResultProgress } from "@/domain/entities/key-result";

describe("KeyResult", () => {
  const base = {
    id: "k-1",
    objectiveId: "o-1",
    title: "讀完 12 本書",
    unit: "本",
    targetValue: 12,
    currentValue: 6,
    position: 0,
    createdAt: new Date(),
  };

  it("creates a key result", () => {
    const kr = createKeyResult(base);
    expect(kr.title).toBe("讀完 12 本書");
    expect(kr.unit).toBe("本");
  });

  it("rejects blank title", () => {
    expect(() => createKeyResult({ ...base, title: "" })).toThrow(
      "KeyResult title is required",
    );
  });

  it("rejects non-positive targetValue", () => {
    expect(() => createKeyResult({ ...base, targetValue: 0 })).toThrow(
      "targetValue must be positive",
    );
  });

  it("rejects negative currentValue", () => {
    expect(() => createKeyResult({ ...base, currentValue: -1 })).toThrow(
      "currentValue must be non-negative",
    );
  });

  it("rejects negative position", () => {
    expect(() => createKeyResult({ ...base, position: -1 })).toThrow(
      "position must be non-negative",
    );
  });

  it("computes progress as current/target", () => {
    expect(keyResultProgress(createKeyResult(base))).toBe(0.5);
  });

  it("clamps progress to a max of 1", () => {
    expect(
      keyResultProgress(createKeyResult({ ...base, currentValue: 20 })),
    ).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/key-result.test.ts`
Expected: FAIL — cannot resolve `@/domain/entities/key-result`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/entities/key-result.ts
export interface KeyResult {
  readonly id: string;
  readonly objectiveId: string;
  readonly title: string;
  readonly unit: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateKeyResultInput {
  id: string;
  objectiveId: string;
  title: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  position: number;
  createdAt: Date;
}

export function createKeyResult(input: CreateKeyResultInput): KeyResult {
  if (!input.title.trim()) throw new Error("KeyResult title is required");
  if (input.targetValue <= 0) throw new Error("targetValue must be positive");
  if (input.currentValue < 0)
    throw new Error("currentValue must be non-negative");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input };
}

export function keyResultProgress(kr: KeyResult): number {
  return Math.max(0, Math.min(1, kr.currentValue / kr.targetValue));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/entities/key-result.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/key-result.ts src/__tests__/domain/entities/key-result.test.ts
git commit -m "feat: add KeyResult entity with progress helper"
```

---

## Task 4: Repository interfaces

**Files:**
- Create: `src/domain/repositories/okr-cycle-repository.ts`
- Create: `src/domain/repositories/objective-repository.ts`
- Create: `src/domain/repositories/key-result-repository.ts`

No test (interfaces only — covered by the in-memory repo tests in Tasks 5–7).

- [ ] **Step 1: Write the three interfaces**

```ts
// src/domain/repositories/okr-cycle-repository.ts
import { OkrCycle } from "@/domain/entities/okr-cycle";

export interface OkrCycleRepository {
  findForUser(userId: string): Promise<OkrCycle[]>;
  findById(id: string): Promise<OkrCycle | null>;
  add(cycle: OkrCycle): Promise<void>;
  update(cycle: OkrCycle): Promise<void>;
  delete(id: string): Promise<void>;
}
```

```ts
// src/domain/repositories/objective-repository.ts
import { Objective } from "@/domain/entities/objective";

export interface ObjectiveRepository {
  findByCycle(cycleId: string): Promise<Objective[]>;
  findById(id: string): Promise<Objective | null>;
  add(objective: Objective): Promise<void>;
  update(objective: Objective): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
```

```ts
// src/domain/repositories/key-result-repository.ts
import { KeyResult } from "@/domain/entities/key-result";

export interface KeyResultRepository {
  findByObjective(objectiveId: string): Promise<KeyResult[]>;
  findById(id: string): Promise<KeyResult | null>;
  add(keyResult: KeyResult): Promise<void>;
  update(keyResult: KeyResult): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
```

> Note: KR `currentValue` updates reuse `update(...)` (the value use case loads the entity, swaps the field, and calls `update`). No separate repo method is needed.

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/domain/repositories/okr-cycle-repository.ts src/domain/repositories/objective-repository.ts src/domain/repositories/key-result-repository.ts
git commit -m "feat: add OKR repository interfaces"
```

---

## Task 5: In-memory OkrCycleRepository

**Files:**
- Create: `src/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.ts`
- Test: `src/__tests__/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.test.ts
import { describe, it, expect } from "vitest";
import { InMemoryOkrCycleRepository } from "@/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository";
import { createOkrCycle, OkrCycle } from "@/domain/entities/okr-cycle";

const cycle = (id: string, userId: string): OkrCycle =>
  createOkrCycle({
    id,
    userId,
    name: `cycle-${id}`,
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-09-30"),
    createdAt: new Date(),
  });

describe("InMemoryOkrCycleRepository", () => {
  it("adds and finds by user", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await repo.add(cycle("c-2", "u-2"));
    const found = await repo.findForUser("u-1");
    expect(found.map((c) => c.id)).toEqual(["c-1"]);
  });

  it("finds by id and returns null when missing", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    expect((await repo.findById("c-1"))?.id).toBe("c-1");
    expect(await repo.findById("nope")).toBeNull();
  });

  it("updates an existing cycle", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await repo.update({ ...cycle("c-1", "u-1"), name: "renamed" });
    expect((await repo.findById("c-1"))?.name).toBe("renamed");
  });

  it("deletes a cycle", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await repo.delete("c-1");
    expect(await repo.findById("c-1")).toBeNull();
  });

  it("throws when adding a duplicate id", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await expect(repo.add(cycle("c-1", "u-1"))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.ts
import type { OkrCycle } from "@/domain/entities/okr-cycle";
import type { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class InMemoryOkrCycleRepository implements OkrCycleRepository {
  private readonly byId = new Map<string, OkrCycle>();

  async findForUser(userId: string): Promise<OkrCycle[]> {
    return [...this.byId.values()].filter((c) => c.userId === userId);
  }

  async findById(id: string): Promise<OkrCycle | null> {
    return this.byId.get(id) ?? null;
  }

  async add(cycle: OkrCycle): Promise<void> {
    if (this.byId.has(cycle.id))
      throw new Error(`OkrCycle ${cycle.id} already exists`);
    this.byId.set(cycle.id, cycle);
  }

  async update(cycle: OkrCycle): Promise<void> {
    if (!this.byId.has(cycle.id))
      throw new Error(`OkrCycle ${cycle.id} not found`);
    this.byId.set(cycle.id, cycle);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository.test.ts
git commit -m "feat: add in-memory OkrCycle repository"
```

---

## Task 6: In-memory ObjectiveRepository

**Files:**
- Create: `src/infrastructure/in-memory/repositories/in-memory-objective-repository.ts`
- Test: `src/__tests__/infrastructure/in-memory/repositories/in-memory-objective-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/infrastructure/in-memory/repositories/in-memory-objective-repository.test.ts
import { describe, it, expect } from "vitest";
import { InMemoryObjectiveRepository } from "@/infrastructure/in-memory/repositories/in-memory-objective-repository";
import { createObjective, Objective } from "@/domain/entities/objective";

const obj = (id: string, cycleId: string, position: number): Objective =>
  createObjective({
    id,
    cycleId,
    title: `obj-${id}`,
    description: "",
    position,
    createdAt: new Date(),
  });

describe("InMemoryObjectiveRepository", () => {
  it("finds by cycle sorted by position", async () => {
    const repo = new InMemoryObjectiveRepository();
    await repo.add(obj("o-2", "c-1", 1));
    await repo.add(obj("o-1", "c-1", 0));
    await repo.add(obj("o-3", "c-2", 0));
    const found = await repo.findByCycle("c-1");
    expect(found.map((o) => o.id)).toEqual(["o-1", "o-2"]);
  });

  it("reorders objectives by id order", async () => {
    const repo = new InMemoryObjectiveRepository();
    await repo.add(obj("o-1", "c-1", 0));
    await repo.add(obj("o-2", "c-1", 1));
    await repo.reorder(["o-2", "o-1"]);
    const found = await repo.findByCycle("c-1");
    expect(found.map((o) => o.id)).toEqual(["o-2", "o-1"]);
  });

  it("deletes an objective", async () => {
    const repo = new InMemoryObjectiveRepository();
    await repo.add(obj("o-1", "c-1", 0));
    await repo.delete("o-1");
    expect(await repo.findById("o-1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-objective-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/infrastructure/in-memory/repositories/in-memory-objective-repository.ts
import type { Objective } from "@/domain/entities/objective";
import type { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class InMemoryObjectiveRepository implements ObjectiveRepository {
  private readonly byId = new Map<string, Objective>();

  async findByCycle(cycleId: string): Promise<Objective[]> {
    return [...this.byId.values()]
      .filter((o) => o.cycleId === cycleId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<Objective | null> {
    return this.byId.get(id) ?? null;
  }

  async add(objective: Objective): Promise<void> {
    if (this.byId.has(objective.id))
      throw new Error(`Objective ${objective.id} already exists`);
    this.byId.set(objective.id, objective);
  }

  async update(objective: Objective): Promise<void> {
    if (!this.byId.has(objective.id))
      throw new Error(`Objective ${objective.id} not found`);
    this.byId.set(objective.id, objective);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const existing = this.byId.get(id);
      if (existing) this.byId.set(id, { ...existing, position: index });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-objective-repository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/in-memory/repositories/in-memory-objective-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-objective-repository.test.ts
git commit -m "feat: add in-memory Objective repository"
```

---

## Task 7: In-memory KeyResultRepository

**Files:**
- Create: `src/infrastructure/in-memory/repositories/in-memory-key-result-repository.ts`
- Test: `src/__tests__/infrastructure/in-memory/repositories/in-memory-key-result-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/infrastructure/in-memory/repositories/in-memory-key-result-repository.test.ts
import { describe, it, expect } from "vitest";
import { InMemoryKeyResultRepository } from "@/infrastructure/in-memory/repositories/in-memory-key-result-repository";
import { createKeyResult, KeyResult } from "@/domain/entities/key-result";

const kr = (id: string, objectiveId: string, position: number): KeyResult =>
  createKeyResult({
    id,
    objectiveId,
    title: `kr-${id}`,
    unit: "本",
    targetValue: 10,
    currentValue: 0,
    position,
    createdAt: new Date(),
  });

describe("InMemoryKeyResultRepository", () => {
  it("finds by objective sorted by position", async () => {
    const repo = new InMemoryKeyResultRepository();
    await repo.add(kr("k-2", "o-1", 1));
    await repo.add(kr("k-1", "o-1", 0));
    await repo.add(kr("k-3", "o-2", 0));
    const found = await repo.findByObjective("o-1");
    expect(found.map((k) => k.id)).toEqual(["k-1", "k-2"]);
  });

  it("updates currentValue via update", async () => {
    const repo = new InMemoryKeyResultRepository();
    await repo.add(kr("k-1", "o-1", 0));
    const existing = await repo.findById("k-1");
    await repo.update({ ...existing!, currentValue: 5 });
    expect((await repo.findById("k-1"))?.currentValue).toBe(5);
  });

  it("reorders key results by id order", async () => {
    const repo = new InMemoryKeyResultRepository();
    await repo.add(kr("k-1", "o-1", 0));
    await repo.add(kr("k-2", "o-1", 1));
    await repo.reorder(["k-2", "k-1"]);
    expect((await repo.findByObjective("o-1")).map((k) => k.id)).toEqual([
      "k-2",
      "k-1",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-key-result-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/infrastructure/in-memory/repositories/in-memory-key-result-repository.ts
import type { KeyResult } from "@/domain/entities/key-result";
import type { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class InMemoryKeyResultRepository implements KeyResultRepository {
  private readonly byId = new Map<string, KeyResult>();

  async findByObjective(objectiveId: string): Promise<KeyResult[]> {
    return [...this.byId.values()]
      .filter((k) => k.objectiveId === objectiveId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<KeyResult | null> {
    return this.byId.get(id) ?? null;
  }

  async add(keyResult: KeyResult): Promise<void> {
    if (this.byId.has(keyResult.id))
      throw new Error(`KeyResult ${keyResult.id} already exists`);
    this.byId.set(keyResult.id, keyResult);
  }

  async update(keyResult: KeyResult): Promise<void> {
    if (!this.byId.has(keyResult.id))
      throw new Error(`KeyResult ${keyResult.id} not found`);
    this.byId.set(keyResult.id, keyResult);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const existing = this.byId.get(id);
      if (existing) this.byId.set(id, { ...existing, position: index });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-key-result-repository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/in-memory/repositories/in-memory-key-result-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-key-result-repository.test.ts
git commit -m "feat: add in-memory KeyResult repository"
```

---

## Task 8: Cycle CRUD use cases

**Files:**
- Create: `src/domain/usecases/create-okr-cycle.ts`
- Create: `src/domain/usecases/update-okr-cycle.ts`
- Create: `src/domain/usecases/delete-okr-cycle.ts`
- Create: `src/domain/usecases/list-okr-cycles.ts`
- Test: `src/__tests__/domain/usecases/okr-cycle-usecases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/okr-cycle-usecases.test.ts
import { describe, it, expect, vi } from "vitest";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { CreateOkrCycleUseCase } from "@/domain/usecases/create-okr-cycle";
import { UpdateOkrCycleUseCase } from "@/domain/usecases/update-okr-cycle";
import { DeleteOkrCycleUseCase } from "@/domain/usecases/delete-okr-cycle";
import { ListOkrCyclesUseCase } from "@/domain/usecases/list-okr-cycles";
import { OkrCycle } from "@/domain/entities/okr-cycle";

const makeRepo = (): OkrCycleRepository => ({
  findForUser: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

const start = new Date("2026-07-01");
const end = new Date("2026-09-30");

describe("Cycle use cases", () => {
  it("creates a cycle", async () => {
    const repo = makeRepo();
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateOkrCycleUseCase(repo).execute(
      "u-1",
      "2026 Q3",
      start,
      end,
    );
    expect(result.name).toBe("2026 Q3");
    expect(result.userId).toBe("u-1");
    expect(typeof result.id).toBe("string");
    expect(repo.add).toHaveBeenCalledOnce();
  });

  it("updates an existing cycle", async () => {
    const repo = makeRepo();
    const existing: OkrCycle = {
      id: "c-1",
      userId: "u-1",
      name: "old",
      startDate: start,
      endDate: end,
      createdAt: new Date(),
    };
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateOkrCycleUseCase(repo).execute("c-1", {
      name: "new",
      startDate: start,
      endDate: end,
    });
    expect(result.name).toBe("new");
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("throws when updating a missing cycle", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new UpdateOkrCycleUseCase(repo).execute("nope", {
        name: "x",
        startDate: start,
        endDate: end,
      }),
    ).rejects.toThrow("OkrCycle nope not found");
  });

  it("deletes a cycle", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteOkrCycleUseCase(repo).execute("c-1");
    expect(repo.delete).toHaveBeenCalledWith("c-1");
  });

  it("lists cycles for a user", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findForUser).mockResolvedValue([]);
    await new ListOkrCyclesUseCase(repo).execute("u-1");
    expect(repo.findForUser).toHaveBeenCalledWith("u-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/okr-cycle-usecases.test.ts`
Expected: FAIL — use-case modules not found.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/domain/usecases/create-okr-cycle.ts
import { OkrCycle, createOkrCycle } from "@/domain/entities/okr-cycle";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class CreateOkrCycleUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(
    userId: string,
    name: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OkrCycle> {
    const cycle = createOkrCycle({
      id: crypto.randomUUID(),
      userId,
      name,
      startDate,
      endDate,
      createdAt: new Date(),
    });
    await this.repo.add(cycle);
    return cycle;
  }
}
```

```ts
// src/domain/usecases/update-okr-cycle.ts
import { OkrCycle, createOkrCycle } from "@/domain/entities/okr-cycle";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export interface UpdateOkrCycleInput {
  name: string;
  startDate: Date;
  endDate: Date;
}

export class UpdateOkrCycleUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(id: string, input: UpdateOkrCycleInput): Promise<OkrCycle> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`OkrCycle ${id} not found`);
    const updated = createOkrCycle({
      id: existing.id,
      userId: existing.userId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

```ts
// src/domain/usecases/delete-okr-cycle.ts
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class DeleteOkrCycleUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
```

```ts
// src/domain/usecases/list-okr-cycles.ts
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class ListOkrCyclesUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(userId: string): Promise<OkrCycle[]> {
    return this.repo.findForUser(userId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/okr-cycle-usecases.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/create-okr-cycle.ts src/domain/usecases/update-okr-cycle.ts src/domain/usecases/delete-okr-cycle.ts src/domain/usecases/list-okr-cycles.ts src/__tests__/domain/usecases/okr-cycle-usecases.test.ts
git commit -m "feat: add OKR cycle CRUD use cases"
```

---

## Task 9: Objective CRUD use cases

**Files:**
- Create: `src/domain/usecases/create-objective.ts`
- Create: `src/domain/usecases/update-objective.ts`
- Create: `src/domain/usecases/delete-objective.ts`
- Create: `src/domain/usecases/reorder-objectives.ts`
- Test: `src/__tests__/domain/usecases/objective-usecases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/objective-usecases.test.ts
import { describe, it, expect, vi } from "vitest";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { CreateObjectiveUseCase } from "@/domain/usecases/create-objective";
import { UpdateObjectiveUseCase } from "@/domain/usecases/update-objective";
import { DeleteObjectiveUseCase } from "@/domain/usecases/delete-objective";
import { ReorderObjectivesUseCase } from "@/domain/usecases/reorder-objectives";
import { Objective } from "@/domain/entities/objective";

const makeRepo = (): ObjectiveRepository => ({
  findByCycle: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

describe("Objective use cases", () => {
  it("creates an objective appended after existing ones", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByCycle).mockResolvedValue([
      { id: "o-1", position: 0 } as Objective,
    ]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateObjectiveUseCase(repo).execute(
      "c-1",
      "新目標",
    );
    expect(result.cycleId).toBe("c-1");
    expect(result.position).toBe(1);
    expect(repo.add).toHaveBeenCalledOnce();
  });

  it("updates title and description", async () => {
    const repo = makeRepo();
    const existing: Objective = {
      id: "o-1",
      cycleId: "c-1",
      title: "old",
      description: "",
      position: 0,
      createdAt: new Date(),
    };
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateObjectiveUseCase(repo).execute("o-1", {
      title: "new",
      description: "desc",
    });
    expect(result.title).toBe("new");
    expect(result.description).toBe("desc");
  });

  it("deletes an objective", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteObjectiveUseCase(repo).execute("o-1");
    expect(repo.delete).toHaveBeenCalledWith("o-1");
  });

  it("reorders objectives", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderObjectivesUseCase(repo).execute(["o-2", "o-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["o-2", "o-1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/objective-usecases.test.ts`
Expected: FAIL — use-case modules not found.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/domain/usecases/create-objective.ts
import { Objective, createObjective } from "@/domain/entities/objective";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class CreateObjectiveUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(
    cycleId: string,
    title: string,
    description = "",
  ): Promise<Objective> {
    const siblings = await this.repo.findByCycle(cycleId);
    const objective = createObjective({
      id: crypto.randomUUID(),
      cycleId,
      title,
      description,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(objective);
    return objective;
  }
}
```

```ts
// src/domain/usecases/update-objective.ts
import { Objective, createObjective } from "@/domain/entities/objective";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export interface UpdateObjectiveInput {
  title: string;
  description: string;
}

export class UpdateObjectiveUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(id: string, input: UpdateObjectiveInput): Promise<Objective> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`Objective ${id} not found`);
    const updated = createObjective({
      id: existing.id,
      cycleId: existing.cycleId,
      title: input.title,
      description: input.description,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

```ts
// src/domain/usecases/delete-objective.ts
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class DeleteObjectiveUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
```

```ts
// src/domain/usecases/reorder-objectives.ts
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class ReorderObjectivesUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/objective-usecases.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/create-objective.ts src/domain/usecases/update-objective.ts src/domain/usecases/delete-objective.ts src/domain/usecases/reorder-objectives.ts src/__tests__/domain/usecases/objective-usecases.test.ts
git commit -m "feat: add OKR objective CRUD use cases"
```

---

## Task 10: KeyResult CRUD use cases (+ value update)

**Files:**
- Create: `src/domain/usecases/create-key-result.ts`
- Create: `src/domain/usecases/update-key-result.ts`
- Create: `src/domain/usecases/update-key-result-value.ts`
- Create: `src/domain/usecases/delete-key-result.ts`
- Create: `src/domain/usecases/reorder-key-results.ts`
- Test: `src/__tests__/domain/usecases/key-result-usecases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/key-result-usecases.test.ts
import { describe, it, expect, vi } from "vitest";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { CreateKeyResultUseCase } from "@/domain/usecases/create-key-result";
import { UpdateKeyResultUseCase } from "@/domain/usecases/update-key-result";
import { UpdateKeyResultValueUseCase } from "@/domain/usecases/update-key-result-value";
import { DeleteKeyResultUseCase } from "@/domain/usecases/delete-key-result";
import { ReorderKeyResultsUseCase } from "@/domain/usecases/reorder-key-results";
import { KeyResult } from "@/domain/entities/key-result";

const makeRepo = (): KeyResultRepository => ({
  findByObjective: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

const existing = (over: Partial<KeyResult> = {}): KeyResult => ({
  id: "k-1",
  objectiveId: "o-1",
  title: "讀完 12 本書",
  unit: "本",
  targetValue: 12,
  currentValue: 3,
  position: 0,
  createdAt: new Date(),
  ...over,
});

describe("KeyResult use cases", () => {
  it("creates a KR appended after existing ones", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByObjective).mockResolvedValue([existing()]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateKeyResultUseCase(repo).execute("o-1", {
      title: "跑 100 公里",
      unit: "公里",
      targetValue: 100,
    });
    expect(result.objectiveId).toBe("o-1");
    expect(result.currentValue).toBe(0);
    expect(result.position).toBe(1);
  });

  it("updates title, unit and target", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing());
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateKeyResultUseCase(repo).execute("k-1", {
      title: "讀完 20 本書",
      unit: "本",
      targetValue: 20,
    });
    expect(result.title).toBe("讀完 20 本書");
    expect(result.targetValue).toBe(20);
    expect(result.currentValue).toBe(3); // preserved
  });

  it("updates only currentValue", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing());
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateKeyResultValueUseCase(repo).execute("k-1", 7);
    expect(result.currentValue).toBe(7);
    expect(result.targetValue).toBe(12); // preserved
  });

  it("throws when updating a missing KR", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new UpdateKeyResultValueUseCase(repo).execute("nope", 1),
    ).rejects.toThrow("KeyResult nope not found");
  });

  it("deletes a KR", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteKeyResultUseCase(repo).execute("k-1");
    expect(repo.delete).toHaveBeenCalledWith("k-1");
  });

  it("reorders KRs", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderKeyResultsUseCase(repo).execute(["k-2", "k-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["k-2", "k-1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/key-result-usecases.test.ts`
Expected: FAIL — use-case modules not found.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/domain/usecases/create-key-result.ts
import { KeyResult, createKeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export interface CreateKeyResultData {
  title: string;
  unit: string;
  targetValue: number;
}

export class CreateKeyResultUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(
    objectiveId: string,
    data: CreateKeyResultData,
  ): Promise<KeyResult> {
    const siblings = await this.repo.findByObjective(objectiveId);
    const keyResult = createKeyResult({
      id: crypto.randomUUID(),
      objectiveId,
      title: data.title,
      unit: data.unit,
      targetValue: data.targetValue,
      currentValue: 0,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(keyResult);
    return keyResult;
  }
}
```

```ts
// src/domain/usecases/update-key-result.ts
import { KeyResult, createKeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export interface UpdateKeyResultInput {
  title: string;
  unit: string;
  targetValue: number;
}

export class UpdateKeyResultUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(id: string, input: UpdateKeyResultInput): Promise<KeyResult> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`KeyResult ${id} not found`);
    const updated = createKeyResult({
      id: existing.id,
      objectiveId: existing.objectiveId,
      title: input.title,
      unit: input.unit,
      targetValue: input.targetValue,
      currentValue: existing.currentValue,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

```ts
// src/domain/usecases/update-key-result-value.ts
import { KeyResult, createKeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class UpdateKeyResultValueUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(id: string, currentValue: number): Promise<KeyResult> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`KeyResult ${id} not found`);
    const updated = createKeyResult({
      id: existing.id,
      objectiveId: existing.objectiveId,
      title: existing.title,
      unit: existing.unit,
      targetValue: existing.targetValue,
      currentValue,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

```ts
// src/domain/usecases/delete-key-result.ts
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class DeleteKeyResultUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
```

```ts
// src/domain/usecases/reorder-key-results.ts
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class ReorderKeyResultsUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/key-result-usecases.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/create-key-result.ts src/domain/usecases/update-key-result.ts src/domain/usecases/update-key-result-value.ts src/domain/usecases/delete-key-result.ts src/domain/usecases/reorder-key-results.ts src/__tests__/domain/usecases/key-result-usecases.test.ts
git commit -m "feat: add OKR key-result CRUD use cases"
```

---

## Task 11: Supabase migration SQL

**Files:**
- Create: `supabase/migrations/20260608_okr_foundation.sql` (if a `supabase/migrations` folder doesn't exist, create it; otherwise match the existing migration-file naming you find there)

> Verify the migrations location first: `git ls-files supabase` and check the design doc `docs/superpowers/specs/2026-04-13-block6-time-manager-design.md`. If the project applies SQL by hand via the Supabase dashboard rather than migration files, save this SQL as `docs/superpowers/specs/sql/20260608_okr_foundation.sql` instead and note it in the spec.

- [ ] **Step 1: Write the migration**

```sql
-- OKR foundation: cycles, objectives, key_results
create table if not exists okr_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists okr_cycles_user_id_idx on okr_cycles(user_id);

create table if not exists objectives (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references okr_cycles(id) on delete cascade,
  title text not null,
  description text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists objectives_cycle_id_idx on objectives(cycle_id);

create table if not exists key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id) on delete cascade,
  title text not null,
  unit text not null default '',
  target_value numeric not null,
  current_value numeric not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists key_results_objective_id_idx on key_results(objective_id);

-- Row Level Security: match the policy style used by existing tables.
alter table okr_cycles enable row level security;
alter table objectives enable row level security;
alter table key_results enable row level security;

create policy "own okr_cycles" on okr_cycles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own objectives" on objectives
  for all using (
    exists (select 1 from okr_cycles c where c.id = cycle_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from okr_cycles c where c.id = cycle_id and c.user_id = auth.uid())
  );

create policy "own key_results" on key_results
  for all using (
    exists (
      select 1 from objectives o join okr_cycles c on c.id = o.cycle_id
      where o.id = objective_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from objectives o join okr_cycles c on c.id = o.cycle_id
      where o.id = objective_id and c.user_id = auth.uid()
    )
  );
```

> Before finalizing the RLS policies, open an existing table's policy definition (check the Supabase dashboard or any existing migration) and align wording/structure. The intent: a user can only touch OKR rows belonging to their own cycles.

- [ ] **Step 2: Apply the migration**

Apply via your normal flow (Supabase CLI `supabase db push`, or paste into the Supabase SQL editor). Confirm the three tables exist with the expected columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260608_okr_foundation.sql
git commit -m "feat: add OKR foundation DB migration"
```

---

## Task 12: Supabase repository implementations + database functions

**Files:**
- Modify: `src/infrastructure/supabase/database.ts` (append an "OKR" section)
- Create: `src/infrastructure/supabase/repositories/supabase-okr-cycle-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-objective-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-key-result-repository.ts`

No unit test (Supabase impls are integration-level; the in-memory repos already cover the contract). Type-check is the gate.

- [ ] **Step 1: Append database functions to `database.ts`**

Add at the end of `src/infrastructure/supabase/database.ts`:

```ts
// --- OKR: cycles ---

import type { OkrCycle } from "@/domain/entities/okr-cycle";
import { createOkrCycle } from "@/domain/entities/okr-cycle";
import type { Objective } from "@/domain/entities/objective";
import { createObjective } from "@/domain/entities/objective";
import type { KeyResult } from "@/domain/entities/key-result";
import { createKeyResult } from "@/domain/entities/key-result";

interface DbOkrCycle {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

function dbOkrCycleToEntity(db: DbOkrCycle): OkrCycle {
  return createOkrCycle({
    id: db.id,
    userId: db.user_id,
    name: db.name,
    startDate: parseDateKey(db.start_date),
    endDate: parseDateKey(db.end_date),
    createdAt: new Date(db.created_at),
  });
}

export async function fetchOkrCyclesForUser(
  userId: string,
): Promise<OkrCycle[]> {
  const { data, error } = await supabase
    .from("okr_cycles")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbOkrCycle[]).map(dbOkrCycleToEntity);
}

export async function fetchOkrCycleById(id: string): Promise<OkrCycle | null> {
  const { data, error } = await supabase
    .from("okr_cycles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbOkrCycleToEntity(data as DbOkrCycle);
}

export async function insertOkrCycle(cycle: OkrCycle): Promise<void> {
  const { error } = await supabase.from("okr_cycles").insert({
    id: cycle.id,
    user_id: cycle.userId,
    name: cycle.name,
    start_date: formatDateKey(cycle.startDate),
    end_date: formatDateKey(cycle.endDate),
  });
  if (error) throw new Error(error.message);
}

export async function updateOkrCycleRow(cycle: OkrCycle): Promise<void> {
  const { error } = await supabase
    .from("okr_cycles")
    .update({
      name: cycle.name,
      start_date: formatDateKey(cycle.startDate),
      end_date: formatDateKey(cycle.endDate),
    })
    .eq("id", cycle.id);
  if (error) throw new Error(error.message);
}

export async function deleteOkrCycleRow(id: string): Promise<void> {
  const { error } = await supabase.from("okr_cycles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- OKR: objectives ---

interface DbObjective {
  id: string;
  cycle_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

function dbObjectiveToEntity(db: DbObjective): Objective {
  return createObjective({
    id: db.id,
    cycleId: db.cycle_id,
    title: db.title,
    description: db.description ?? "",
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchObjectivesByCycle(
  cycleId: string,
): Promise<Objective[]> {
  const { data, error } = await supabase
    .from("objectives")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbObjective[]).map(dbObjectiveToEntity);
}

export async function fetchObjectiveById(
  id: string,
): Promise<Objective | null> {
  const { data, error } = await supabase
    .from("objectives")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbObjectiveToEntity(data as DbObjective);
}

export async function insertObjective(objective: Objective): Promise<void> {
  const { error } = await supabase.from("objectives").insert({
    id: objective.id,
    cycle_id: objective.cycleId,
    title: objective.title,
    description: objective.description,
    position: objective.position,
  });
  if (error) throw new Error(error.message);
}

export async function updateObjectiveRow(objective: Objective): Promise<void> {
  const { error } = await supabase
    .from("objectives")
    .update({
      title: objective.title,
      description: objective.description,
      position: objective.position,
    })
    .eq("id", objective.id);
  if (error) throw new Error(error.message);
}

export async function deleteObjectiveRow(id: string): Promise<void> {
  const { error } = await supabase.from("objectives").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderObjectiveRows(
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("objectives")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- OKR: key results ---

interface DbKeyResult {
  id: string;
  objective_id: string;
  title: string;
  unit: string;
  target_value: number;
  current_value: number;
  position: number;
  created_at: string;
}

function dbKeyResultToEntity(db: DbKeyResult): KeyResult {
  return createKeyResult({
    id: db.id,
    objectiveId: db.objective_id,
    title: db.title,
    unit: db.unit ?? "",
    targetValue: Number(db.target_value),
    currentValue: Number(db.current_value),
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchKeyResultsByObjective(
  objectiveId: string,
): Promise<KeyResult[]> {
  const { data, error } = await supabase
    .from("key_results")
    .select("*")
    .eq("objective_id", objectiveId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbKeyResult[]).map(dbKeyResultToEntity);
}

export async function fetchKeyResultById(
  id: string,
): Promise<KeyResult | null> {
  const { data, error } = await supabase
    .from("key_results")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbKeyResultToEntity(data as DbKeyResult);
}

export async function insertKeyResult(kr: KeyResult): Promise<void> {
  const { error } = await supabase.from("key_results").insert({
    id: kr.id,
    objective_id: kr.objectiveId,
    title: kr.title,
    unit: kr.unit,
    target_value: kr.targetValue,
    current_value: kr.currentValue,
    position: kr.position,
  });
  if (error) throw new Error(error.message);
}

export async function updateKeyResultRow(kr: KeyResult): Promise<void> {
  const { error } = await supabase
    .from("key_results")
    .update({
      title: kr.title,
      unit: kr.unit,
      target_value: kr.targetValue,
      current_value: kr.currentValue,
      position: kr.position,
    })
    .eq("id", kr.id);
  if (error) throw new Error(error.message);
}

export async function deleteKeyResultRow(id: string): Promise<void> {
  const { error } = await supabase.from("key_results").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderKeyResultRows(
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("key_results")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}
```

> The `import` statements above must be moved to the top of `database.ts` with the other imports (TypeScript hoists `import` but ESLint will flag mid-file imports). Place them alongside the existing entity imports.

- [ ] **Step 2: Write the three Supabase repositories**

```ts
// src/infrastructure/supabase/repositories/supabase-okr-cycle-repository.ts
import type { OkrCycle } from "@/domain/entities/okr-cycle";
import type { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import {
  fetchOkrCyclesForUser,
  fetchOkrCycleById,
  insertOkrCycle,
  updateOkrCycleRow,
  deleteOkrCycleRow,
} from "@/infrastructure/supabase/database";

export class SupabaseOkrCycleRepository implements OkrCycleRepository {
  findForUser(userId: string): Promise<OkrCycle[]> {
    return fetchOkrCyclesForUser(userId);
  }
  findById(id: string): Promise<OkrCycle | null> {
    return fetchOkrCycleById(id);
  }
  add(cycle: OkrCycle): Promise<void> {
    return insertOkrCycle(cycle);
  }
  update(cycle: OkrCycle): Promise<void> {
    return updateOkrCycleRow(cycle);
  }
  delete(id: string): Promise<void> {
    return deleteOkrCycleRow(id);
  }
}
```

```ts
// src/infrastructure/supabase/repositories/supabase-objective-repository.ts
import type { Objective } from "@/domain/entities/objective";
import type { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import {
  fetchObjectivesByCycle,
  fetchObjectiveById,
  insertObjective,
  updateObjectiveRow,
  deleteObjectiveRow,
  reorderObjectiveRows,
} from "@/infrastructure/supabase/database";

export class SupabaseObjectiveRepository implements ObjectiveRepository {
  findByCycle(cycleId: string): Promise<Objective[]> {
    return fetchObjectivesByCycle(cycleId);
  }
  findById(id: string): Promise<Objective | null> {
    return fetchObjectiveById(id);
  }
  add(objective: Objective): Promise<void> {
    return insertObjective(objective);
  }
  update(objective: Objective): Promise<void> {
    return updateObjectiveRow(objective);
  }
  delete(id: string): Promise<void> {
    return deleteObjectiveRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderObjectiveRows(orderedIds);
  }
}
```

```ts
// src/infrastructure/supabase/repositories/supabase-key-result-repository.ts
import type { KeyResult } from "@/domain/entities/key-result";
import type { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import {
  fetchKeyResultsByObjective,
  fetchKeyResultById,
  insertKeyResult,
  updateKeyResultRow,
  deleteKeyResultRow,
  reorderKeyResultRows,
} from "@/infrastructure/supabase/database";

export class SupabaseKeyResultRepository implements KeyResultRepository {
  findByObjective(objectiveId: string): Promise<KeyResult[]> {
    return fetchKeyResultsByObjective(objectiveId);
  }
  findById(id: string): Promise<KeyResult | null> {
    return fetchKeyResultById(id);
  }
  add(keyResult: KeyResult): Promise<void> {
    return insertKeyResult(keyResult);
  }
  update(keyResult: KeyResult): Promise<void> {
    return updateKeyResultRow(keyResult);
  }
  delete(id: string): Promise<void> {
    return deleteKeyResultRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderKeyResultRows(orderedIds);
  }
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-okr-cycle-repository.ts src/infrastructure/supabase/repositories/supabase-objective-repository.ts src/infrastructure/supabase/repositories/supabase-key-result-repository.ts
git commit -m "feat: add Supabase OKR repositories and DB functions"
```

---

## Task 13: Wire OKR use cases into the dependency provider

**Files:**
- Modify: `src/presentation/providers/dependency-provider.tsx`
- Modify: `src/presentation/providers/production-dependency-provider.tsx`

- [ ] **Step 1: Extend `dependency-provider.tsx`**

Add imports (top of file, alongside existing imports):

```ts
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { CreateOkrCycleUseCase } from "@/domain/usecases/create-okr-cycle";
import { UpdateOkrCycleUseCase } from "@/domain/usecases/update-okr-cycle";
import { DeleteOkrCycleUseCase } from "@/domain/usecases/delete-okr-cycle";
import { ListOkrCyclesUseCase } from "@/domain/usecases/list-okr-cycles";
import { CreateObjectiveUseCase } from "@/domain/usecases/create-objective";
import { UpdateObjectiveUseCase } from "@/domain/usecases/update-objective";
import { DeleteObjectiveUseCase } from "@/domain/usecases/delete-objective";
import { ReorderObjectivesUseCase } from "@/domain/usecases/reorder-objectives";
import { CreateKeyResultUseCase } from "@/domain/usecases/create-key-result";
import { UpdateKeyResultUseCase } from "@/domain/usecases/update-key-result";
import { UpdateKeyResultValueUseCase } from "@/domain/usecases/update-key-result-value";
import { DeleteKeyResultUseCase } from "@/domain/usecases/delete-key-result";
import { ReorderKeyResultsUseCase } from "@/domain/usecases/reorder-key-results";
import { ListObjectivesByCycleUseCase } from "@/domain/usecases/list-objectives-by-cycle";
import { ListKeyResultsByObjectiveUseCase } from "@/domain/usecases/list-key-results-by-objective";
```

> Two small read use cases (`ListObjectivesByCycleUseCase`, `ListKeyResultsByObjectiveUseCase`) are needed by the page in Task 14. Create them now as trivial wrappers (see Step 1a) — they keep the page free of direct repo access, matching the existing pattern where the page only touches use cases.

- [ ] **Step 1a: Create the two read use cases**

```ts
// src/domain/usecases/list-objectives-by-cycle.ts
import { Objective } from "@/domain/entities/objective";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class ListObjectivesByCycleUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}
  execute(cycleId: string): Promise<Objective[]> {
    return this.repo.findByCycle(cycleId);
  }
}
```

```ts
// src/domain/usecases/list-key-results-by-objective.ts
import { KeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class ListKeyResultsByObjectiveUseCase {
  constructor(private readonly repo: KeyResultRepository) {}
  execute(objectiveId: string): Promise<KeyResult[]> {
    return this.repo.findByObjective(objectiveId);
  }
}
```

- [ ] **Step 1b: Extend the `UseCases` interface, `Repositories` interface, and the `useMemo` factory**

In `dependency-provider.tsx`, add to the `UseCases` interface:

```ts
  createOkrCycle: CreateOkrCycleUseCase;
  updateOkrCycle: UpdateOkrCycleUseCase;
  deleteOkrCycle: DeleteOkrCycleUseCase;
  listOkrCycles: ListOkrCyclesUseCase;
  createObjective: CreateObjectiveUseCase;
  updateObjective: UpdateObjectiveUseCase;
  deleteObjective: DeleteObjectiveUseCase;
  reorderObjectives: ReorderObjectivesUseCase;
  listObjectivesByCycle: ListObjectivesByCycleUseCase;
  createKeyResult: CreateKeyResultUseCase;
  updateKeyResult: UpdateKeyResultUseCase;
  updateKeyResultValue: UpdateKeyResultValueUseCase;
  deleteKeyResult: DeleteKeyResultUseCase;
  reorderKeyResults: ReorderKeyResultsUseCase;
  listKeyResultsByObjective: ListKeyResultsByObjectiveUseCase;
```

Add to the `Repositories` interface:

```ts
  okrCycleRepo: OkrCycleRepository;
  objectiveRepo: ObjectiveRepository;
  keyResultRepo: KeyResultRepository;
```

Add to the `useMemo<UseCases>` object:

```ts
      createOkrCycle: new CreateOkrCycleUseCase(repositories.okrCycleRepo),
      updateOkrCycle: new UpdateOkrCycleUseCase(repositories.okrCycleRepo),
      deleteOkrCycle: new DeleteOkrCycleUseCase(repositories.okrCycleRepo),
      listOkrCycles: new ListOkrCyclesUseCase(repositories.okrCycleRepo),
      createObjective: new CreateObjectiveUseCase(repositories.objectiveRepo),
      updateObjective: new UpdateObjectiveUseCase(repositories.objectiveRepo),
      deleteObjective: new DeleteObjectiveUseCase(repositories.objectiveRepo),
      reorderObjectives: new ReorderObjectivesUseCase(repositories.objectiveRepo),
      listObjectivesByCycle: new ListObjectivesByCycleUseCase(
        repositories.objectiveRepo,
      ),
      createKeyResult: new CreateKeyResultUseCase(repositories.keyResultRepo),
      updateKeyResult: new UpdateKeyResultUseCase(repositories.keyResultRepo),
      updateKeyResultValue: new UpdateKeyResultValueUseCase(
        repositories.keyResultRepo,
      ),
      deleteKeyResult: new DeleteKeyResultUseCase(repositories.keyResultRepo),
      reorderKeyResults: new ReorderKeyResultsUseCase(
        repositories.keyResultRepo,
      ),
      listKeyResultsByObjective: new ListKeyResultsByObjectiveUseCase(
        repositories.keyResultRepo,
      ),
```

- [ ] **Step 2: Extend `production-dependency-provider.tsx`**

Add imports and repo instances:

```ts
import { SupabaseOkrCycleRepository } from "@/infrastructure/supabase/repositories/supabase-okr-cycle-repository";
import { SupabaseObjectiveRepository } from "@/infrastructure/supabase/repositories/supabase-objective-repository";
import { SupabaseKeyResultRepository } from "@/infrastructure/supabase/repositories/supabase-key-result-repository";
```

In the `useMemo` repositories object, add:

```ts
      okrCycleRepo: new SupabaseOkrCycleRepository(),
      objectiveRepo: new SupabaseObjectiveRepository(),
      keyResultRepo: new SupabaseKeyResultRepository(),
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/providers/dependency-provider.tsx src/presentation/providers/production-dependency-provider.tsx src/domain/usecases/list-objectives-by-cycle.ts src/domain/usecases/list-key-results-by-objective.ts
git commit -m "feat: wire OKR use cases into dependency provider"
```

---

## Task 14: `/okr` page + components + header link

**Files:**
- Create: `src/app/okr/page.tsx`
- Create: `src/presentation/components/okr/okr-page-client.tsx`
- Create: `src/presentation/components/okr/cycle-selector.tsx`
- Create: `src/presentation/components/okr/objective-card.tsx`
- Create: `src/presentation/components/okr/key-result-row.tsx`
- Create: `src/presentation/components/okr/key-result-value-editor.tsx`
- Modify: `src/presentation/components/header/header.tsx` (add an OKR link)

This task wires real data end-to-end. It is split into smaller commits because it is the largest unit. Manual verification (not a unit test) gates each UI commit — render the page and confirm behaviour, consistent with how the existing pages are built (the project has no component tests for pages).

- [ ] **Step 1: KeyResultValueEditor — inline number edit**

```tsx
// src/presentation/components/okr/key-result-value-editor.tsx
"use client";

import { useState } from "react";

interface Props {
  currentValue: number;
  unit: string;
  targetValue: number;
  onSave: (value: number) => void;
}

export function KeyResultValueEditor({
  currentValue,
  unit,
  targetValue,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(currentValue));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(currentValue));
          setEditing(true);
        }}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: "13px",
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        {currentValue} / {targetValue} {unit}
      </button>
    );
  }

  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
  };

  return (
    <input
      type="number"
      min={0}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      style={{
        width: "72px",
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-primary)",
        padding: "2px 6px",
        fontSize: "13px",
      }}
    />
  );
}
```

- [ ] **Step 2: KeyResultRow — manual progress bar (auto-stat lines added in Plan 2)**

```tsx
// src/presentation/components/okr/key-result-row.tsx
"use client";

import { KeyResult, keyResultProgress } from "@/domain/entities/key-result";
import { KeyResultValueEditor } from "./key-result-value-editor";

interface Props {
  keyResult: KeyResult;
  onSaveValue: (value: number) => void;
  onDelete: () => void;
}

export function KeyResultRow({ keyResult, onSaveValue, onDelete }: Props) {
  const progress = keyResultProgress(keyResult);
  const pct = Math.round(progress * 100);

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
    </div>
  );
}
```

- [ ] **Step 3: ObjectiveCard — title + KR list + "add KR"**

```tsx
// src/presentation/components/okr/objective-card.tsx
"use client";

import { useState } from "react";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";
import { KeyResultRow } from "./key-result-row";

interface Props {
  objective: Objective;
  keyResults: KeyResult[];
  onDeleteObjective: () => void;
  onAddKeyResult: (data: {
    title: string;
    unit: string;
    targetValue: number;
  }) => void;
  onSaveKeyResultValue: (keyResultId: string, value: number) => void;
  onDeleteKeyResult: (keyResultId: string) => void;
}

export function ObjectiveCard({
  objective,
  keyResults,
  onDeleteObjective,
  onAddKeyResult,
  onSaveKeyResultValue,
  onDeleteKeyResult,
}: Props) {
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");

  const submit = () => {
    const targetValue = Number(target);
    if (!title.trim() || Number.isNaN(targetValue) || targetValue <= 0) return;
    onAddKeyResult({ title: title.trim(), unit: unit.trim(), targetValue });
    setTitle("");
    setUnit("");
    setTarget("");
  };

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{objective.title}</h3>
        <button
          type="button"
          onClick={onDeleteObjective}
          style={{
            background: "none",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
            padding: "2px 8px",
          }}
        >
          刪除目標
        </button>
      </div>

      {keyResults.map((kr) => (
        <KeyResultRow
          key={kr.id}
          keyResult={kr}
          onSaveValue={(v) => onSaveKeyResultValue(kr.id, v)}
          onDelete={() => onDeleteKeyResult(kr.id)}
        />
      ))}

      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
        <input
          placeholder="KR 標題"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle(2)}
        />
        <input
          placeholder="單位"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={inputStyle(1)}
        />
        <input
          placeholder="目標值"
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={inputStyle(1)}
        />
        <button type="button" onClick={submit} style={addButtonStyle}>
          ＋
        </button>
      </div>
    </div>
  );
}

function inputStyle(flex: number): React.CSSProperties {
  return {
    flex,
    minWidth: 0,
    background: "var(--color-bg-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text-primary)",
    padding: "4px 8px",
    fontSize: "13px",
  };
}

const addButtonStyle: React.CSSProperties = {
  background: "var(--color-accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  color: "#fff",
  cursor: "pointer",
  padding: "4px 10px",
};
```

- [ ] **Step 4: CycleSelector — switch cycle + create cycle**

```tsx
// src/presentation/components/okr/cycle-selector.tsx
"use client";

import { useState } from "react";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { formatDateKey } from "@/lib/date-helpers";

interface Props {
  cycles: OkrCycle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, startDate: Date, endDate: Date) => void;
}

export function CycleSelector({
  cycles,
  selectedId,
  onSelect,
  onCreate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const submit = () => {
    if (!name.trim() || !start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate.getTime() <= startDate.getTime()) return;
    onCreate(name.trim(), startDate, endDate);
    setName("");
    setStart("");
    setEnd("");
    setShowForm(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            flex: 1,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            padding: "6px 10px",
            fontSize: "14px",
          }}
        >
          {cycles.length === 0 && <option value="">尚無週期</option>}
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({formatDateKey(c.startDate)} ~ {formatDateKey(c.endDate)})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          style={{
            background: "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#fff",
            cursor: "pointer",
            padding: "6px 12px",
            fontSize: "13px",
          }}
        >
          ＋ 新增週期
        </button>
      </div>
      {showForm && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <input
            placeholder="週期名稱 (例 2026 Q3)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={cellStyle}
          />
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={cellStyle}
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={cellStyle}
          />
          <button type="button" onClick={submit} style={cellStyle}>
            建立
          </button>
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  background: "var(--color-bg-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  padding: "6px 10px",
  fontSize: "13px",
};
```

- [ ] **Step 5: OkrPageClient — orchestration**

```tsx
// src/presentation/components/okr/okr-page-client.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import { useNotify } from "@/presentation/providers/notification-provider";
import { CycleSelector } from "./cycle-selector";
import { ObjectiveCard } from "./objective-card";

export function OkrPageClient() {
  const { user } = useAuth();
  const useCases = useUseCases();
  const notify = useNotify();

  const [cycles, setCycles] = useState<OkrCycle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [krsByObjective, setKrsByObjective] = useState<
    Record<string, KeyResult[]>
  >({});
  const [newObjectiveTitle, setNewObjectiveTitle] = useState("");

  const loadCycles = useCallback(async () => {
    if (!user) return;
    const list = await useCases.listOkrCycles.execute(user.id);
    setCycles(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
  }, [user, useCases]);

  const loadTree = useCallback(
    async (cycleId: string) => {
      const objs = await useCases.listObjectivesByCycle.execute(cycleId);
      setObjectives(objs);
      const entries = await Promise.all(
        objs.map(async (o) => {
          const krs = await useCases.listKeyResultsByObjective.execute(o.id);
          return [o.id, krs] as const;
        }),
      );
      setKrsByObjective(Object.fromEntries(entries));
    },
    [useCases],
  );

  useEffect(() => {
    loadCycles().catch((e) => {
      console.error(e);
      notify.error("載入 OKR 週期失敗");
    });
  }, [loadCycles, notify]);

  useEffect(() => {
    if (selectedId) {
      loadTree(selectedId).catch((e) => {
        console.error(e);
        notify.error("載入目標失敗");
      });
    }
  }, [selectedId, loadTree, notify]);

  const handleCreateCycle = async (
    name: string,
    startDate: Date,
    endDate: Date,
  ) => {
    if (!user) return;
    const created = await useCases.createOkrCycle.execute(
      user.id,
      name,
      startDate,
      endDate,
    );
    await loadCycles();
    setSelectedId(created.id);
  };

  const handleAddObjective = async () => {
    if (!selectedId || !newObjectiveTitle.trim()) return;
    await useCases.createObjective.execute(selectedId, newObjectiveTitle.trim());
    setNewObjectiveTitle("");
    await loadTree(selectedId);
  };

  const refresh = () => selectedId && loadTree(selectedId);

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
          }}
        >
          OKR
        </h1>
        <Link
          href="/"
          style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
        >
          &larr; 回到儀表板
        </Link>
      </div>

      <CycleSelector
        cycles={cycles}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={(n, s, e) =>
          handleCreateCycle(n, s, e).catch((err) => {
            console.error(err);
            notify.error("建立週期失敗");
          })
        }
      />

      {selectedId &&
        objectives.map((obj) => (
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            keyResults={krsByObjective[obj.id] ?? []}
            onDeleteObjective={async () => {
              await useCases.deleteObjective.execute(obj.id);
              await refresh();
            }}
            onAddKeyResult={async (data) => {
              await useCases.createKeyResult.execute(obj.id, data);
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

      {selectedId && (
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            placeholder="新增目標標題"
            value={newObjectiveTitle}
            onChange={(e) => setNewObjectiveTitle(e.target.value)}
            style={{
              flex: 1,
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
              padding: "8px 12px",
              fontSize: "14px",
            }}
          />
          <button
            type="button"
            onClick={() =>
              handleAddObjective().catch((err) => {
                console.error(err);
                notify.error("新增目標失敗");
              })
            }
            style={{
              background: "var(--color-accent)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              cursor: "pointer",
              padding: "8px 16px",
            }}
          >
            ＋ 目標
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: The route**

```tsx
// src/app/okr/page.tsx
"use client";

import { OkrPageClient } from "@/presentation/components/okr/okr-page-client";

export default function OkrPage() {
  return <OkrPageClient />;
}
```

- [ ] **Step 7: Header link to `/okr`**

In `src/presentation/components/header/header.tsx`, add a `Link` to `/okr` near the title. Add `import Link from "next/link";` at the top, then place this immediately after the `The Block 6` title button (before `<WeekNavigator ... />`):

```tsx
      <Link
        href="/okr"
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        OKR
      </Link>
```

- [ ] **Step 8: Verify, type-check, lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: PASS.

Then run the app and manually verify:
Run: `pnpm dev`
- Navigate to `/okr`.
- Create a cycle → it appears in the selector and is selected.
- Add an objective → its card appears.
- Add a KR (title + unit + target) → progress bar shows 0%.
- Click the `current / target` number, type a value, press Enter → bar and % update.
- Delete a KR / objective → it disappears.
- Reload the page → data persists (Supabase).

- [ ] **Step 9: Commit**

```bash
git add src/app/okr/page.tsx src/presentation/components/okr/ src/presentation/components/header/header.tsx
git commit -m "feat: add OKR page with cycle/objective/key-result management"
```

---

## Task 15: Full test + build gate

- [ ] **Step 1: Run the whole suite**

Run: `pnpm vitest run`
Expected: PASS — all existing tests plus the new OKR entity / repo / use-case tests.

- [ ] **Step 2: Type-check, lint, build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit (only if any fixups were needed)**

```bash
git add -A
git commit -m "chore: OKR foundation green (tests + lint + build)"
```

---

## Done — Plan 1 outcome

After this plan: a user can create OKR cycles, add objectives and key results, and update KR progress manually. Data persists via Supabase and is fully covered by entity/repo/use-case tests. **Linkage to weekly tasks/blocks and live auto-stats are Plan 2** (`docs/superpowers/plans/2026-06-08-okr-linkage-stats.md`).
