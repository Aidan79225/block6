# Restructure Block State to `Record<weekKey, Block[]>` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `AppStateProvider`'s in-memory block state from `Block[]` (filtered by `weekPlanId`) to `Record<weekKey, Block[]>` (keyed by the map), and drop the `createBlock({ ...block, weekPlanId: weekStart })` override in `database.ts` so server-sourced blocks carry their real `week_plans.id` UUID.

**Architecture:** Task 1 restructures the state shape and all its writers/readers in one atomic commit — same behavior, different data shape. Task 2 removes the three `weekPlanId = weekStart` overrides in `database.ts`; because state is now keyed by weekKey (not filtered by `Block.weekPlanId`), removing the override is behavior-preserving. Both tasks leave the app fully working at every SHA. No use-case migration in this PR.

**Tech Stack:** TypeScript strict, React, Vitest. No new runtime dependencies. No DB migrations.

**Prerequisite:** Be on branch `refactor/block-state-by-weekkey` (`git checkout -b refactor/block-state-by-weekkey` before Task 1).

---

## File Structure

```
src/
  presentation/
    providers/
      app-state-provider.tsx                                            (modify)
  infrastructure/
    supabase/
      database.ts                                                       (modify)
```

No new files. No test files touched. `localData.blocks` localStorage layout is unchanged.

---

## Task 1: Restructure `AppStateProvider` state to map shape

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

### Step 1: Change the `supaBlocks` state type

Find the declaration (around line 304):

```tsx
const [supaBlocks, setSupaBlocks] = useState<Block[]>([]);
```

Replace with:

```tsx
const [supaBlocks, setSupaBlocks] = useState<Record<string, Block[]>>({});
```

### Step 2: Add the derived `blocksByWeek` / replace the `blocks` binding

Find the current selection (around line 331):

```tsx
const blocks = isLoggedIn ? supaBlocks : localData.blocks;
```

Replace with:

```tsx
const localBlocksByWeek = useMemo(() => {
  const out: Record<string, Block[]> = {};
  for (const b of localData.blocks) {
    (out[b.weekPlanId] ??= []).push(b);
  }
  return out;
}, [localData.blocks]);

const blocksByWeek: Record<string, Block[]> = isLoggedIn
  ? supaBlocks
  : localBlocksByWeek;
```

### Step 3: Update `taskTitleSuggestions` to iterate the map

Find (around line 335):

```tsx
const taskTitleSuggestions = useMemo<TitleSuggestion[]>(() => {
  const counts = new Map<string, number>();
  for (const b of blocks) {
    const title = b.title.trim();
    if (!title) continue;
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}, [blocks]);
```

Replace with:

```tsx
const taskTitleSuggestions = useMemo<TitleSuggestion[]>(() => {
  const counts = new Map<string, number>();
  for (const list of Object.values(blocksByWeek)) {
    for (const b of list) {
      const title = b.title.trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}, [blocksByWeek]);
```

### Step 4: Update `loadWeek` to write the map

Find (around line 399):

```tsx
setSupaBlocks((prev) => {
  const withoutThisWeek = prev.filter(
    (b) => b.weekPlanId !== weekKey,
  );
  return [...withoutThisWeek, ...fetched];
});
```

Replace with:

```tsx
setSupaBlocks((prev) => ({ ...prev, [weekKey]: fetched }));
```

### Step 5: Update `getBlocksForWeek` to be an O(1) lookup

Find (around line 457):

```tsx
const getBlocksForWeek = useCallback(
  (weekKey: string): Block[] => {
    return blocks.filter((b) => b.weekPlanId === weekKey);
  },
  [blocks],
);
```

Replace with:

```tsx
const getBlocksForWeek = useCallback(
  (weekKey: string): Block[] => {
    return blocksByWeek[weekKey] ?? [];
  },
  [blocksByWeek],
);
```

### Step 6: Update `saveBlock`'s logged-in optimistic write

Find (around line 482, starting with `if (user) {`):

```tsx
if (user) {
  let resultBlock: Block | null = null;
  setSupaBlocks((prev) => {
    const existing = prev.find(
      (b) =>
        b.weekPlanId === weekKey &&
        b.dayOfWeek === dayOfWeek &&
        b.slot === slot,
    );
    if (existing) {
      const updated = createBlock({
        ...existing,
        title,
        description,
        blockType,
      });
      resultBlock = updated;
      return prev.map((b) => (b.id === existing.id ? updated : b));
    }
    const created = createBlock({
      id: crypto.randomUUID(),
      ...newBlockData,
      status: BlockStatus.Planned,
    });
    resultBlock = created;
    return [...prev, created];
  });
```

Replace the body of the `if (user) {` branch up through `upsertBlock(` with:

```tsx
if (user) {
  let resultBlock: Block | null = null;
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

The `upsertBlock(...).then(...)` block that follows (around lines 519-528) also needs updating. Current:

```tsx
.then((saved) => {
  setSupaBlocks((prev) =>
    prev.map((b) =>
      b.weekPlanId === weekKey &&
      b.dayOfWeek === dayOfWeek &&
      b.slot === slot
        ? saved
        : b,
    ),
  );
})
```

Replace with:

```tsx
.then((saved) => {
  setSupaBlocks((prev) => ({
    ...prev,
    [weekKey]: (prev[weekKey] ?? []).map((b) =>
      b.dayOfWeek === dayOfWeek && b.slot === slot ? saved : b,
    ),
  }));
})
```

### Step 7: Update `updateStatus`'s logged-in write

Find (around line 569-580):

```tsx
const updateStatus = useCallback(
  (blockId: string, status: BlockStatus) => {
    if (user) {
      setSupaBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        ),
      );
      useCases.updateBlockStatus.execute(blockId, status).catch((err) => {
        console.error(err);
        notify.error("狀態更新失敗");
      });
    } else {
```

Replace the `setSupaBlocks(...)` call above (two lines) with:

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

Everything after `useCases.updateBlockStatus.execute(...)` stays. The logged-out branch (the `else`) stays unchanged.

### Step 8: Update `swapBlocks`'s optimistic write

Find (around line 664):

```tsx
const swapBlocks = useCallback(
  async (idA: string, idB: string) => {
    setSupaBlocks((prev) => {
      const a = prev.find((b) => b.id === idA);
      const b = prev.find((b) => b.id === idB);
      if (!a || !b) return prev;
      return prev.map((block) => {
        if (block.id === idA) {
          return createBlock({
            ...block,
            dayOfWeek: b.dayOfWeek,
            slot: b.slot,
          });
        }
        if (block.id === idB) {
          return createBlock({
            ...block,
            dayOfWeek: a.dayOfWeek,
            slot: a.slot,
          });
        }
        return block;
      });
    });
```

Replace the `setSupaBlocks((prev) => { ... });` call (the entire callback, not the wrapper) with:

```tsx
    setSupaBlocks((prev) => {
      const flat = Object.values(prev).flat();
      const a = flat.find((b) => b.id === idA);
      const b = flat.find((b) => b.id === idB);
      if (!a || !b) return prev;
      const out: Record<string, Block[]> = {};
      for (const [wk, list] of Object.entries(prev)) {
        out[wk] = list.map((block) => {
          if (block.id === idA) {
            return createBlock({
              ...block,
              dayOfWeek: b.dayOfWeek,
              slot: b.slot,
            });
          }
          if (block.id === idB) {
            return createBlock({
              ...block,
              dayOfWeek: a.dayOfWeek,
              slot: a.slot,
            });
          }
          return block;
        });
      }
      return out;
    });
```

The rest of `swapBlocks` (the `if (user) { await swapBlocksInDb(...) ... }` block) stays.

### Step 9: Update `moveBlock`'s optimistic write

Find (around line 702):

```tsx
setSupaBlocks((prev) =>
  prev.map((block) =>
    block.id === id ? createBlock({ ...block, dayOfWeek, slot }) : block,
  ),
);
```

Replace with:

```tsx
setSupaBlocks((prev) => {
  const out: Record<string, Block[]> = {};
  for (const [wk, list] of Object.entries(prev)) {
    out[wk] = list.map((block) =>
      block.id === id ? createBlock({ ...block, dayOfWeek, slot }) : block,
    );
  }
  return out;
});
```

### Step 10: Update `getTaskTimeRanking`'s filter

Find (around line 1028):

```tsx
const weekBlocks = blocks.filter((b) => b.weekPlanId === weekKey);
```

Replace with:

```tsx
const weekBlocks = blocksByWeek[weekKey] ?? [];
```

The enclosing `useCallback`'s dependency array (currently `[blocks, timerSessions, ...]`) must be updated to reference `blocksByWeek` instead of `blocks` — change the `blocks` entry to `blocksByWeek`.

### Step 11: Remove `allBlocks` from the context type and return value

Find (around line 60):

```tsx
interface AppState {
  allBlocks: Block[];
  getBlocksForWeek: ...
```

Remove the `allBlocks: Block[];` line only.

Find (around line 1164):

```tsx
        allBlocks: blocks,
        getBlocksForWeek,
```

Remove the `allBlocks: blocks,` line only.

### Step 12: Remove the stale `blocks` binding

After steps 2-11, the `const blocks = ...` expression from Step 2 was replaced with `blocksByWeek`. The original `blocks` local variable no longer exists. Verify:

```bash
grep -n "const blocks = " src/presentation/providers/app-state-provider.tsx
```

Expected: zero matches. (If matches remain, find and remove — Step 2 should have done it.)

Also verify no residual `blocks.filter(` / `blocks.find(` / `blocks.map(` / `b.weekPlanId === weekKey` references:

```bash
grep -n "blocks\.filter\|blocks\.find\|blocks\.map\|blocks\.push\|weekPlanId === weekKey" src/presentation/providers/app-state-provider.tsx
```

Expected: zero matches. (Any match means a writer/reader was missed.)

### Step 13: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all 132 tests still pass. No test file is modified; this is a pure refactor of `AppStateProvider`.

### Step 14: Commit

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "refactor: restructure block state to Record<weekKey, Block[]>"
```

---

## Task 2: Remove the `weekPlanId = weekStart` override in `database.ts`

After Task 1, state lookup is by weekKey map key, not by `Block.weekPlanId` equality. We can now safely return blocks from Supabase with their real `week_plans.id` UUID in `weekPlanId`.

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

### Step 1: Fix `fetchBlocksForWeek`

Find the tail of the function (around lines 155-159):

```typescript
  if (error) throw new Error(error.message);
  return (data as DbBlock[]).map((db) => {
    const block = dbBlockToEntity(db);
    // Use weekStart (date string) as weekPlanId for consistency with local mode
    return createBlock({ ...block, weekPlanId: weekStart });
  });
}
```

Replace with:

```typescript
  if (error) throw new Error(error.message);
  return (data as DbBlock[]).map((db) => dbBlockToEntity(db));
}
```

### Step 2: Fix `upsertBlock`'s update branch

Find the update-path return (around line 159):

```typescript
    console.log("[BLOCK6] update result:", { data, error });
    if (error) throw new Error(error.message);
    const updated = dbBlockToEntity(data as DbBlock);
    return createBlock({ ...updated, weekPlanId: weekStart });
  }
```

Replace with:

```typescript
    console.log("[BLOCK6] update result:", { data, error });
    if (error) throw new Error(error.message);
    return dbBlockToEntity(data as DbBlock);
  }
```

### Step 3: Fix `upsertBlock`'s insert branch

Find the insert-path return (around line 179):

```typescript
  console.log("[BLOCK6] insert result:", { data, error });
  if (error) throw new Error(error.message);
  const inserted = dbBlockToEntity(data as DbBlock);
  return createBlock({ ...inserted, weekPlanId: weekStart });
}
```

Replace with:

```typescript
  console.log("[BLOCK6] insert result:", { data, error });
  if (error) throw new Error(error.message);
  return dbBlockToEntity(data as DbBlock);
}
```

### Step 4: Verify no other overrides

```bash
grep -n "weekPlanId: weekStart" src/infrastructure/supabase/database.ts
```

Expected: zero matches.

### Step 5: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all 132 tests still pass. No test references `fetchBlocksForWeek` or `upsertBlock` directly.

### Step 6: Commit

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "refactor: stop overriding Block.weekPlanId to weekStart in database.ts"
```

---

## Task 3: Manual verification + push + PR + merge

### Step 1: Start dev server

```bash
pnpm dev
```

### Step 2: Verify logged-in paths

Log in to a test Supabase account.

1. **Week navigation.** Click prev/next week. Blocks load correctly for each week.
2. **Create a block.** Click an empty slot, fill in title, 儲存. Side panel shows the new block. Reload the page. Block persists.
3. **Edit a block.** Click an existing block, change the title, 儲存. Reload. New title persists.
4. **Status toggle.** Toggle a block's status (planned → completed). Reload. Status persists.
5. **Swap.** Drag-swap two blocks. Reload. Both blocks stay in their swapped positions.
6. **Move.** Drag-move a block to an empty slot. Reload. Block is in the new slot.
7. **Review page.** Go to `/review` (or wherever). Completion stats, task-time-ranking, and plan-changes log all populate correctly.
8. **`copyPreviousWeekPlan`.** From the review page, trigger the copy-last-week action. Blocks from the previous week land in the current week.

### Step 3: Verify logged-out paths

Open an incognito window or log out.

1. **Create a block locally.** Same flow as above. Block saves to localStorage.
2. **Toggle, swap, move.** All work.
3. **Reload.** All state persists via localStorage.

### Step 4: Verify first-login migration

1. In a clean logged-out browser, create a few local blocks.
2. Log in. The on-first-login migration runs — local blocks transfer to Supabase.
3. Reload. Those blocks are now in Supabase-backed state.

### Step 5: Push

```bash
git push -u origin refactor/block-state-by-weekkey
```

### Step 6: Open PR

```bash
gh pr create --title "refactor: restructure block state to Record<weekKey, Block[]>" --body "$(cat <<'EOF'
## Summary

- Change \`supaBlocks\` state from \`Block[]\` to \`Record<string, Block[]>\` keyed by weekKey.
- Derive a matching \`localBlocksByWeek\` for logged-out state (groups \`localData.blocks\` by \`b.weekPlanId\`, which is still weekKey for local-only blocks).
- \`getBlocksForWeek(weekKey)\` becomes an O(1) map lookup.
- Update all \`setSupaBlocks\` call sites (\`loadWeek\`, \`saveBlock\`, \`updateStatus\`, \`swapBlocks\`, \`moveBlock\`) to produce and consume the map shape.
- Remove the three \`createBlock({ ...block, weekPlanId: weekStart })\` overrides in \`database.ts:fetchBlocksForWeek\` and \`database.ts:upsertBlock\`. Server-sourced blocks now carry their real \`week_plans.id\` UUID.
- Drop the unused \`allBlocks: Block[]\` field from the \`AppState\` context.

## What this unblocks

Sub-project #4b can now migrate \`saveBlock\` through \`UpdateBlockUseCase\`. Because state no longer filters by \`Block.weekPlanId\`, the use case's return value (which carries the real UUID) drops into state without further reconciliation.

## Scope discipline

- Pure refactor — no user-visible behavior change.
- localStorage layout unchanged (still flat \`Block[]\`).
- \`Block\` entity unchanged.
- Repositories and use cases unchanged.
- No test changes (no test mounts \`AppStateProvider\`).
- Logged-out write paths unchanged.

## Test plan

- [x] \`pnpm lint\` passes
- [x] \`pnpm type-check\` passes
- [x] \`pnpm test\` passes (132/132)
- [x] Manual: week navigation, create/edit/status/swap/move blocks, copy-last-week, review page, logged-out flow, first-login migration — all work; content persists across reload.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 7: Merge when CI is green

```bash
gh pr merge <PR_NUMBER> --merge
git checkout master && git pull
```

---

## Self-Review

### 1. Spec coverage

- `supaBlocks` → `Record<string, Block[]>` — Task 1, Step 1 ✓
- `localBlocksByWeek` derived via `useMemo` — Task 1, Step 2 ✓
- `blocksByWeek` unified binding — Task 1, Step 2 ✓
- `getBlocksForWeek` O(1) lookup — Task 1, Step 5 ✓
- `taskTitleSuggestions` iterates the map — Task 1, Step 3 ✓
- `getTaskTimeRanking` uses `blocksByWeek[weekKey]` — Task 1, Step 10 ✓
- `allBlocks` removed from context — Task 1, Step 11 ✓
- `loadWeek` uses key-set pattern — Task 1, Step 4 ✓
- `saveBlock` logged-in optimistic + `.then` reconciliation — Task 1, Step 6 ✓
- `updateStatus` logged-in — Task 1, Step 7 ✓
- `swapBlocks` — Task 1, Step 8 ✓
- `moveBlock` — Task 1, Step 9 ✓
- `copyPreviousWeekPlan` — untouched by this plan; relies on `loadWeek` rewrite indirectly (covered by manual Task 3 Step 2.8) ✓
- Remove three `weekPlanId = weekStart` overrides — Task 2, Steps 1-3 ✓
- No test changes — plan specifies "no test files touched" ✓
- Logged-out path unchanged — Task 1 Steps 6/7 explicitly preserve `else` branches ✓
- Manual verification covers all scenarios the spec lists — Task 3, Steps 2-4 ✓

### 2. Placeholder scan

No TBD / TODO / "similar to". Each code change shows both the "before" and "after" exactly.

### 3. Type consistency

- `supaBlocks: Record<string, Block[]>` type matches every `setSupaBlocks((prev) => Record<string, Block[]>)` call (Steps 4, 6, 7, 8, 9).
- `blocksByWeek: Record<string, Block[]>` consistent across all readers (Steps 3, 5, 10).
- `localBlocksByWeek`'s shape and its `useMemo` dep `[localData.blocks]` match the unchanged logged-out writers.
- `Object.entries(prev)` / `Object.values(prev).flat()` correctly typed against `Record<string, Block[]>`.
- All mutating callbacks return a new `Record<string, Block[]>`; no accidental `Block[]` leaks through.

All checks pass.
