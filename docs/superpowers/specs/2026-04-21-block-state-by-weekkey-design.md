# Restructure Block State to `Record<weekKey, Block[]>` — Design Spec

## Overview

Sub-project #4a of the clean-architecture wiring work. Pure refactor, no
user-visible behavior change. Restructures `AppStateProvider`'s in-memory
block state from a flat `Block[]` (filtered by `b.weekPlanId === weekKey`)
into a keyed `Record<weekKey, Block[]>`. Removes the
`createBlock({ ...block, weekPlanId: weekStart })` hack that forced
server-sourced blocks to carry the weekKey in place of the real
`week_plans.id` UUID. After this PR, server blocks carry their real UUID;
lookup goes through the map key, not `Block.weekPlanId`.

This unblocks sub-project #4b (migrate `saveBlock` through
`UpdateBlockUseCase`), which is currently blocked because the use case
would return a `Block` with a real UUID that wouldn't fit the
filter-by-`weekPlanId` state.

## Goals

- `supaBlocks` becomes `Record<string, Block[]>`.
- Derived `blocksByWeek` is the same shape for logged-in and logged-out
  paths.
- `getBlocksForWeek(weekKey)` becomes `blocksByWeek[weekKey] ?? []` — O(1).
- `fetchBlocksForWeek` and `upsertBlock` in `database.ts` no longer
  override `weekPlanId` to the weekKey; server-sourced blocks retain their
  real `week_plans.id` UUID.
- Every existing `AppStateProvider` method (`saveBlock`, `updateStatus`,
  `swapBlocks`, `moveBlock`, `loadWeek`, `copyPreviousWeekPlan`,
  migration) keeps identical observable behavior.
- `pnpm lint && pnpm type-check && pnpm test` passes; no test changes
  needed.

## Out of Scope

- Migrating `saveBlock` (or any other method) through a use case. That is
  sub-project #4b.
- Touching the `Block` entity shape, the `BlockRepository` interface, or
  either repository implementation.
- Restructuring the `localData.blocks` localStorage layout. Persisted
  shape stays flat `Block[]` for backward compatibility — conversion
  happens in-memory only.
- Subtasks, timers, diary, reflections, weekly tasks, plan changes — none
  of these use `Block.weekPlanId` as a grouping key; all untouched.

---

## State shape change

In `src/presentation/providers/app-state-provider.tsx`:

### Before

```tsx
const [supaBlocks, setSupaBlocks] = useState<Block[]>([]);
// ...
const blocks = isLoggedIn ? supaBlocks : localData.blocks;
```

### After

```tsx
const [supaBlocks, setSupaBlocks] = useState<Record<string, Block[]>>({});

const localBlocksByWeek = useMemo(() => {
  const out: Record<string, Block[]> = {};
  for (const b of localData.blocks) {
    (out[b.weekPlanId] ??= []).push(b);
  }
  return out;
}, [localData.blocks]);

const blocksByWeek = isLoggedIn ? supaBlocks : localBlocksByWeek;
```

`localData.blocks` remains `Block[]` (localStorage format unchanged).
Logged-out blocks still have `weekPlanId = weekKey`, so the in-memory
`groupBy b.weekPlanId` produces the expected `Record<weekKey, Block[]>`.
Server-fetched blocks (after Section 2) have `weekPlanId = UUID`, so
grouping by that field would be wrong for them — but the logged-in path
never uses `localBlocksByWeek`, it goes through `supaBlocks` directly, and
`supaBlocks` is written with weekKey as the map key.

### Consumers

- `getBlocksForWeek(weekKey)` returns `blocksByWeek[weekKey] ?? []`.
- `taskTitleSuggestions`'s `for (const b of blocks)` becomes
  `for (const list of Object.values(blocksByWeek)) for (const b of list)`.
- `getTaskTimeRanking(weekKey, now)`'s first line (currently
  `blocks.filter(b => b.weekPlanId === weekKey)`) becomes
  `blocksByWeek[weekKey] ?? []`.
- `allBlocks: Block[]` — **removed from the context type and return**.
  Grep across `src/` shows zero external consumers.

---

## Remove the `weekPlanId = weekKey` hack

In `src/infrastructure/supabase/database.ts`:

### `fetchBlocksForWeek` (around line 155)

Current tail:

```typescript
return (data as DbBlock[]).map((db) => {
  const block = dbBlockToEntity(db);
  // Use weekStart (date string) as weekPlanId for consistency with local mode
  return createBlock({ ...block, weekPlanId: weekStart });
});
```

Becomes:

```typescript
return (data as DbBlock[]).map((db) => dbBlockToEntity(db));
```

### `upsertBlock` (around lines 159 and 179)

Both branches currently do
`createBlock({ ...entity, weekPlanId: weekStart })` right before returning.
Remove the override in both; return the raw entity from `dbBlockToEntity`.

### Effect

Every `Block` returned from `database.ts` now carries the real
`week_plans.id` UUID in `Block.weekPlanId`. `AppStateProvider` never
queries by `weekPlanId` anymore, so no downstream consumer breaks.

---

## Writer updates

Each `setSupaBlocks(...)` call site switches to the map shape.

### `loadWeek` (around line 397)

```tsx
setSupaBlocks((prev) => ({ ...prev, [weekKey]: fetched }));
```

Replaces the filter-then-concat pattern. Also faster.

### `saveBlock` logged-in (around line 484 and the `.then` reconciliation at ~520)

The initial optimistic update:

```tsx
setSupaBlocks((prev) => {
  const weekBlocks = prev[weekKey] ?? [];
  const existing = weekBlocks.find(
    (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
  );
  if (existing) {
    const updated = createBlock({
      ...existing,
      title,
      description,
      blockType,
    });
    resultBlock = updated;
    return {
      ...prev,
      [weekKey]: weekBlocks.map((b) =>
        b.id === existing.id ? updated : b,
      ),
    };
  }
  const created = createBlock({
    id: crypto.randomUUID(),
    ...newBlockData,
    status: BlockStatus.Planned,
  });
  resultBlock = created;
  return { ...prev, [weekKey]: [...weekBlocks, created] };
});
```

The `.then((saved) => ...)` reconciliation after `upsertBlock`:

```tsx
setSupaBlocks((prev) => ({
  ...prev,
  [weekKey]: (prev[weekKey] ?? []).map((b) =>
    b.dayOfWeek === dayOfWeek && b.slot === slot ? saved : b,
  ),
}));
```

Note: `saved.weekPlanId` is now the real UUID (from Section 2's removal
of the hack). Because state is keyed by `weekKey` and matched by
`dayOfWeek + slot`, the different `weekPlanId` value on the returned
block doesn't break state consistency.

### `updateStatus` logged-in (around line 573)

`updateStatus` only has a `blockId` — must find the block across all weeks.

```tsx
setSupaBlocks((prev) => {
  const out: Record<string, Block[]> = {};
  for (const [wk, list] of Object.entries(prev)) {
    out[wk] = list.map((b) =>
      b.id === blockId ? createBlock({ ...b, status }) : b,
    );
  }
  return out;
});
```

In practice only one week's list actually changes. The iteration is O(all
loaded blocks), same as the existing `prev.map` over the flat array.

### `swapBlocks` (around line 666) and `moveBlock` (around line 702)

Same iteration pattern as `updateStatus` — scan all weeks, map each list,
return a new record. Full implementations shown in the plan.

Note that `swapBlocks` could theoretically touch blocks in two different
weeks (though the UI only ever swaps within the same week). The
iteration-over-all-weeks pattern handles both cases correctly.

### `copyPreviousWeekPlan` (around line 595)

This method already uses direct DB reads (`fetchBlocksForWeek(user.id,
previousWeekKey)`) and `upsertBlock(...)` for writes, then calls
`loadedWeeks.current.delete(currentWeekKey)` + `loadWeek(currentWeekKey)`
in the `finally`. The final `loadWeek` triggers the updated
`setSupaBlocks` logic, which writes the fresh fetched blocks under
`supaBlocks[currentWeekKey]`. No additional changes needed in this method
itself.

### Logged-out writers (`saveBlock`'s `else` branch at ~538, `updateStatus`'s `else` branch at ~584)

**Unchanged.** They read/write `localData.blocks` via `loadFromStorage` /
`saveToStorage`, which still operates on a flat `Block[]`. The
`localBlocksByWeek` derivation takes care of presenting that data in the
new shape to readers.

---

## Migration flow

`migrateLocalToSupabase(userId, data)` iterates `data.blocks` as a flat
array (line 233). Since localStorage format is unchanged, this loop is
untouched.

## Backward compatibility

- Existing users' localStorage: unchanged format, continues to load.
- `Block` entity: unchanged.
- Repository interfaces and implementations: unchanged.
- Use cases: unchanged.
- All five database.ts helpers added in PR #15 (the concrete-repositories
  slice): unchanged.
- Tests: none need updates. None currently exercise `AppStateProvider`'s
  state shape.

## Acknowledged split semantics

After this PR, `Block.weekPlanId` holds:
- Real `week_plans.id` UUID for server-sourced blocks.
- weekKey date string for logged-out-only blocks.

This split is benign because nothing queries by `weekPlanId` anymore.
Writing a comment at the `Block` entity's definition would be noise; the
comment is in this spec and sub-project #4b can rely on it. A future
sub-project (after LocalStorage-backed repos exist) can normalize the
logged-out path.

---

## Testing

- **No new automated tests.** The existing 132 tests stay green — none
  mount `AppStateProvider`, so none observes the state shape.
- **Manual verification** (plan-level Task):
  1. Logged-in: week navigation, block create / edit / status toggle /
     swap / move all work; persists across reload.
  2. Logged-out: same scenarios in an incognito session.
  3. First-login migration: log out, create local blocks, log in, verify
     those blocks land in Supabase.
  4. `copyPreviousWeekPlan` from the review page still works end-to-end.

---

## Affected Files

- Modify: `src/presentation/providers/app-state-provider.tsx` — state
  shape, all `setSupaBlocks` call sites, derived grouping for logged-out,
  `getBlocksForWeek`, `taskTitleSuggestions`, `getTaskTimeRanking`, remove
  `allBlocks` from context.
- Modify: `src/infrastructure/supabase/database.ts` — delete the three
  `createBlock({ ...block, weekPlanId: weekStart })` overrides in
  `fetchBlocksForWeek` and `upsertBlock`.

No other files change. No DB migrations. No new or removed files.

## Branch

`refactor/block-state-by-weekkey` (to be created).
