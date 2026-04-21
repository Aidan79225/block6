# Wire `saveBlock` Through `UpdateBlockUseCase` — Design Spec

## Overview

Sub-project #4b of the clean-architecture wiring work. Migrates
`AppStateProvider.saveBlock`'s logged-in branch from a direct
`database.ts:upsertBlock` call to
`useCases.updateBlock.execute({...})` — routing through
`SupabaseBlockRepository` and `UpdateBlockUseCase`.

This is the last pending write method on the `blocks` table. It was
previously blocked by the `Block.weekPlanId` UUID-vs-weekKey gap;
sub-project #4a decoupled state lookup from `weekPlanId` so the migration
now becomes a mirror of the `updateStatus` (PR #17) and `saveDiary`
(PR #18) slices.

## Goals

- Logged-in `saveBlock` calls `useCases.updateBlock.execute(...)` instead
  of `upsertBlock(...)`.
- The weekKey-to-`week_plans.id` resolution happens once at the call site
  via the existing `getOrCreateWeekPlan` helper.
- The existing optimistic `setSupaBlocks` update, the `.then((saved) => …)`
  state reconciliation by `dayOfWeek + slot`, and the `.catch` with
  `notify.error("區塊儲存失敗")` behaviors are preserved.
- `pnpm lint && pnpm type-check && pnpm test` passes. No new tests.

## Out of Scope

- `copyPreviousWeekPlan`, `swapBlocks`, `moveBlock`, `setReflection`,
  subtasks, timers, weekly tasks, plan changes — none migrated here.
- `upsertBlock` export in `database.ts` — stays. Still used by
  `migrateLocalToSupabase` (line 235) and `copyPreviousWeekPlan` (line 633).
- `DependencyProvider`, repositories, use cases, entities — untouched.
- LocalStorage-path `saveBlock` (`else` branch, lines ~542-571) — unchanged.
- Any change to the `Block` entity or Block.weekPlanId semantics.

---

## Migration

Inside `AppStateProvider`, `saveBlock`'s `if (user) { ... }` branch (around
lines 488-541) currently does:

```tsx
if (user) {
  let resultBlock: Block | null = null;
  setSupaBlocks((prev) => { /* optimistic map update */ });

  upsertBlock(
    user.id,
    weekKey,
    dayOfWeek,
    slot,
    blockType,
    title,
    description,
  )
    .then((saved) => {
      setSupaBlocks((prev) => ({
        ...prev,
        [weekKey]: (prev[weekKey] ?? []).map((b) =>
          b.dayOfWeek === dayOfWeek && b.slot === slot ? saved : b,
        ),
      }));
    })
    .catch((err) => {
      console.error(err);
      notify.error("區塊儲存失敗");
    });

  return resultBlock!;
}
```

After:

```tsx
if (user) {
  let resultBlock: Block | null = null;
  setSupaBlocks((prev) => { /* optimistic map update — UNCHANGED */ });

  getOrCreateWeekPlan(user.id, weekKey)
    .then((weekPlanId) =>
      useCases.updateBlock.execute({
        weekPlanId,
        dayOfWeek,
        slot,
        blockType,
        title,
        description,
      }),
    )
    .then((saved) => {
      setSupaBlocks((prev) => ({
        ...prev,
        [weekKey]: (prev[weekKey] ?? []).map((b) =>
          b.dayOfWeek === dayOfWeek && b.slot === slot ? saved : b,
        ),
      }));
    })
    .catch((err) => {
      console.error(err);
      notify.error("區塊儲存失敗");
    });

  return resultBlock!;
}
```

### Imports

- **Add** `getOrCreateWeekPlan` to the existing `@/infrastructure/supabase/database` import block (it currently imports `upsertBlock`, `fetchBlocksForWeek`, etc. — just extend the named-imports list).
- **Keep** `upsertBlock` in the import list — still used at line 235 (`migrateLocalToSupabase`) and line 633 (`copyPreviousWeekPlan`).
- `useCases` is already in scope from PR #17.

### `useCallback` dependencies

Extend from `[user, notify]` to `[user, notify, useCases]`.

### Optimistic-state semantics

The optimistic path creates a Block with `weekPlanId = weekKey` (the
existing pattern). After the use case returns, the reconciled block has
`weekPlanId = real UUID`. Nothing queries `weekPlanId` anymore
(`blocksByWeek[weekKey]` is the only lookup path after #4a), so the
transient mismatch is benign. This mirrors what #4a already does for the
pre-existing `upsertBlock` path post-PR #19.

### Behavioral difference

- Same round-trip count: one SELECT on `week_plans` (inside
  `getOrCreateWeekPlan`, or zero if the week plan already exists), plus
  one SELECT on `blocks` (inside `UpdateBlockUseCase.execute` →
  `findByWeekPlan`) plus one INSERT or UPDATE. The pre-existing
  `upsertBlock` helper had the same shape.
- Same error surface: network / DB errors route to the existing
  `.catch` → `notify.error("區塊儲存失敗")`.
- `UpdateBlockUseCase`'s new-block path generates its own
  `crypto.randomUUID()` for the DB id. The optimistic state holds a
  client-generated random id until the `.then(saved)` reconciliation
  flips it to the use-case-generated id. This is identical in shape to
  the pre-existing behavior under `upsertBlock` — both paths swap the
  optimistic id for a server-determined id on reconciliation.

---

## Testing

No new automated tests.

- `UpdateBlockUseCase.execute` is already covered by
  `src/__tests__/domain/usecases/update-block.test.ts`.
- `InMemoryBlockRepository` has its own test file.
- `SupabaseBlockRepository` is a thin adapter — not directly tested.
- An integration test that mounts `AppStateProvider` would need mocked
  auth + Supabase; the setup cost exceeds the defect surface for a single
  call-site migration, matching the established pattern from PR #17 and
  PR #18.

### Manual verification (in the plan)

1. **Logged-in create.** Click an empty slot, fill in title, 儲存. Block
   appears optimistically. Reload. Block persists.
2. **Logged-in edit.** Change title of an existing block, 儲存. New title
   shows. Reload. Update persists.
3. **Network inspection.** Devtools Network tab during save confirms:
   a lookup on `week_plans` (via `getOrCreateWeekPlan`), then a SELECT on
   `blocks`, then an INSERT or UPDATE on `blocks`.
4. **Error path.** With the dev server running, temporarily disable the
   network for one save. The error toast fires. (Optional; existing
   `.catch` pattern is unchanged.)
5. **Logged-out.** Incognito window. Same scenarios persist via
   localStorage. No network calls.
6. **First-login migration.** Build a couple of local blocks logged-out,
   then log in. The migration runs via the untouched `migrateLocalToSupabase`
   + `upsertBlock` path.

---

## Affected Files

- Modify: `src/presentation/providers/app-state-provider.tsx` — migrate
  `saveBlock`'s logged-in branch; add `getOrCreateWeekPlan` to the
  database import; extend `useCallback` deps.

No other files change. No DB migrations.

## Branch

`refactor/wire-save-block-usecase` (to be created).
