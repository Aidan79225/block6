# Concrete Repository Implementations — Design Spec

## Overview

Write concrete implementations for the five `*Repository` interfaces under
`src/domain/repositories/` that have either a matching use case or a near-term
consumer: `BlockRepository`, `DiaryRepository`, `WeekPlanRepository`,
`WeekReviewRepository`, `PlanChangeRepository`. Each interface gets a Supabase
impl (wrapping existing `database.ts` helpers) and an in-memory impl that
replaces the ad-hoc mocks currently defined inline across use-case tests.

This is sub-project #1 of the larger "wire DependencyProvider + route UI
through use cases" effort. Nothing is consumed yet — this slice unblocks
sub-project #2 which will mount `DependencyProvider` and migrate the first UI
path to go through use cases.

## Goals

- Five `Supabase*Repository` classes, each a thin wrapper over existing or
  newly-added `database.ts` helpers.
- Five `InMemory*Repository` classes, each a simple in-memory map backed by
  the domain entity shape.
- Each in-memory repo covered by a dedicated unit test file.
- The five existing use-case test files stop defining inline mock repos and
  use the new `InMemory*Repository` classes instead. Net line count goes
  down.
- `pnpm lint && pnpm type-check && pnpm test` passes.

## Out of Scope

- Mounting `DependencyProvider` anywhere. Still disconnected after this PR,
  same as today.
- Touching `AppStateProvider` or any UI code.
- Building LocalStorage-backed repos for the logged-out path. That's a
  separate potential sub-project.
- Creating new use cases or entities. The scaffolding already exists.
- Creating a `LogPlanChangeUseCase` class — `logPlanChange` is currently a
  pure function with no repo dependency, and converting it is a separate
  decision that belongs with sub-project #2's work.
- Replacing or deleting any existing `database.ts` functions. The Supabase
  repos call into `database.ts`; `AppStateProvider` continues to call
  `database.ts` directly. `database.ts` becomes a shared foundation, not
  redundant.

---

## File Layout

```
src/infrastructure/
  supabase/
    repositories/
      supabase-block-repository.ts
      supabase-diary-repository.ts
      supabase-week-plan-repository.ts
      supabase-week-review-repository.ts
      supabase-plan-change-repository.ts
  in-memory/
    repositories/
      in-memory-block-repository.ts
      in-memory-diary-repository.ts
      in-memory-week-plan-repository.ts
      in-memory-week-review-repository.ts
      in-memory-plan-change-repository.ts
```

Supabase repos live under the existing `src/infrastructure/supabase/` layer.
In-memory repos live under a new `src/infrastructure/in-memory/` sibling —
not under `src/__tests__/` — because they're genuine implementations of the
same abstraction, not test doubles. That placement also keeps the door open
for reusing them in a future offline/demo mode without moving the files.

Tests:

```
src/__tests__/infrastructure/
  in-memory/
    repositories/
      in-memory-block-repository.test.ts
      in-memory-diary-repository.test.ts
      in-memory-week-plan-repository.test.ts
      in-memory-week-review-repository.test.ts
      in-memory-plan-change-repository.test.ts
```

No tests for the Supabase repos. They are thin translation shims — testing
them meaningfully requires mocking `supabase.from(...)` chains or a live DB,
both of which cost more than they catch. The next sub-project's use-case
integrations will exercise the mapping end-to-end.

---

## Signature Reconciliation

The repository interfaces in `src/domain/repositories/` and the existing
functions in `src/infrastructure/supabase/database.ts` don't align 1:1. The
new Supabase repos translate between the two. Where a direct wrap isn't
possible, add a new helper to `database.ts` that returns the richer shape.
**No existing `database.ts` function changes signature or behavior.**

| Repo method | Existing `database.ts` | Action |
|---|---|---|
| `BlockRepository.findById(id)` | none | Add `fetchBlockById(id): Promise<Block \| null>` |
| `BlockRepository.findByWeekPlan(weekPlanId)` | `fetchBlocksForWeek(userId, weekKey)` | Add `fetchBlocksByWeekPlanId(weekPlanId): Promise<Block[]>` |
| `BlockRepository.save(block)` / `update(block)` | `upsertBlock(...)` | Wrap (upsert serves both) |
| `DiaryRepository.findByUserAndDate(userId, date)` | `fetchDiary(userId, dateKey)` | Wrap; convert `date` → `dateKey` via `formatDateKey` |
| `DiaryRepository.findByUserAndDateRange(userId, start, end)` | none | Add `fetchDiaryRange(userId, startKey, endKey): Promise<DiaryEntry[]>` |
| `DiaryRepository.save(entry)` / `update(entry)` | `upsertDiary(userId, dateKey, bad, good, next)` | Extend an `upsertDiaryEntry(entry: DiaryEntry)` wrapper that also writes `id` and `createdAt` |
| `WeekPlanRepository.findByUserAndWeek(userId, weekStart)` | `getOrCreateWeekPlan` returns only id | Add `fetchWeekPlan(userId, weekKey): Promise<WeekPlan \| null>` returning the full row |
| `WeekPlanRepository.save(plan)` | none explicit | Add `insertWeekPlan(plan: WeekPlan)` |
| `WeekReviewRepository.findByWeekPlan(weekPlanId)` | `fetchReflection(userId, weekKey)` returns text only | Add `fetchWeekReviewByWeekPlanId(weekPlanId): Promise<WeekReview \| null>` |
| `WeekReviewRepository.save` / `update` | `upsertReflection(userId, weekKey, text)` | Add `upsertWeekReview(review: WeekReview)` wrapper that writes id and createdAt along with reflection. The `week_reviews` table already has those columns (per the original schema); existing `upsertReflection` just doesn't expose them, so no schema change is required |
| `PlanChangeRepository.listByWeek(userId, weekKey)` | `fetchPlanChangesForWeek(userId, weekKey)` | Direct wrap |
| `PlanChangeRepository.create(change)` | `insertPlanChange(change)` | Direct wrap |

**Guideline:** A Supabase repo method should either wrap a `database.ts`
helper or delegate to one. It should NOT call `supabase.from(...)` directly
— if signatures don't match, add the helper first, then wrap.

---

## In-Memory Repositories

Each `InMemory*Repository` implements its interface with a simple
`Map<string, Entity>` keyed by `id` (or composite keys where natural, e.g.,
`${userId}:${dateKey}` for diary entries).

Responsibilities:
- Store entities in memory.
- Honor the interface: save/update/find behavior as specified by the
  interface's prose and use-case test expectations.
- No validation beyond what the entity's `create*` factory already enforces.
- `save` throws if called with an id that already exists; `update` throws if
  called with an id that doesn't exist. (Matches typical repo semantics and
  helps catch caller bugs in tests.)

Example (`InMemoryBlockRepository`):

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

The other four in-memory repos follow the same pattern, keyed by whatever
the interface's primary finder needs.

---

## Test Migration

The five use-case test files currently define inline mock repos:

- `src/__tests__/domain/usecases/update-block.test.ts`
- `src/__tests__/domain/usecases/update-block-status.test.ts`
- `src/__tests__/domain/usecases/write-diary.test.ts`
- `src/__tests__/domain/usecases/get-week-summary.test.ts`
- `src/__tests__/domain/usecases/create-week-review.test.ts`
- `src/__tests__/domain/usecases/create-week-plan.test.ts`

Six files total.

Each file stops declaring a local `makeRepo` / `mockRepo` object literal and
imports the corresponding `InMemory*Repository` class instead. Existing test
cases retain identical behavior — the only change is where the repo comes
from.

---

## `DependencyProvider` — Unchanged in This PR

The `DependencyProvider` in `src/presentation/providers/dependency-provider.tsx`
stays exactly as it is. It remains unmounted. Sub-project #2 will decide
whether to add `PlanChangeRepository` to its `Repositories` type (and
potentially introduce a `LogPlanChangeUseCase` class to consume it) when
it's time to actually mount the provider.

---

## Testing Strategy

- **New:** one test file per in-memory repo (~5–8 test cases each).
- **Updated:** six use-case test files swap inline mocks for `InMemory*Repository` imports.
- **No tests for Supabase repos.**
- `pnpm test` total count increases by the in-memory test count minus the slight consolidation from switching mock definitions (net +30–50 tests).

---

## Affected Files

Create (10):
- `src/infrastructure/supabase/repositories/supabase-{block,diary,week-plan,week-review,plan-change}-repository.ts`
- `src/infrastructure/in-memory/repositories/in-memory-{block,diary,week-plan,week-review,plan-change}-repository.ts`

Create (5 test files):
- `src/__tests__/infrastructure/in-memory/repositories/in-memory-{block,diary,week-plan,week-review,plan-change}-repository.test.ts`

Modify (1):
- `src/infrastructure/supabase/database.ts` — add the missing helpers
  (`fetchBlockById`, `fetchBlocksByWeekPlanId`, `fetchDiaryRange`,
  `upsertDiaryEntry`, `fetchWeekPlan`, `insertWeekPlan`,
  `fetchWeekReviewByWeekPlanId`). Existing functions stay untouched.

Modify (6):
- `src/__tests__/domain/usecases/{update-block,update-block-status,write-diary,get-week-summary,create-week-review,create-week-plan}.test.ts`
  — replace inline mock repos with `InMemory*Repository` imports.

No other files change. No DB migrations.

## Branch

`refactor/concrete-repositories` (to be created).
