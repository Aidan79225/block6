# Wire `saveBlock` Through `UpdateBlockUseCase` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `AppStateProvider.saveBlock`'s logged-in branch through `UpdateBlockUseCase` (via `SupabaseBlockRepository`), resolving `weekKey → week_plans.id` once via the existing `getOrCreateWeekPlan` helper. Mirror of the PR #17 / PR #18 slices.

**Architecture:** Add `getOrCreateWeekPlan` to `AppStateProvider`'s `@/infrastructure/supabase/database` import. In `saveBlock`'s logged-in branch, replace the `upsertBlock(user.id, weekKey, ...)` call with a chained promise: `getOrCreateWeekPlan(user.id, weekKey)` → `useCases.updateBlock.execute({weekPlanId: UUID, ...})` → reconcile state by `dayOfWeek + slot`. Optimistic state update, error handling, and the logged-out branch are unchanged.

**Tech Stack:** TypeScript strict, React, Vitest. No new runtime dependencies. No DB migrations. No new tests.

**Prerequisite:** Be on branch `refactor/wire-save-block-usecase` (`git checkout -b refactor/wire-save-block-usecase` before Task 1).

---

## File Structure

```
src/
  presentation/
    providers/
      app-state-provider.tsx                                            (modify)
```

No new files. No other file touched.

---

## Task 1: Migrate `saveBlock`'s logged-in branch

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

### Step 1: Add `getOrCreateWeekPlan` to the database imports

In `src/presentation/providers/app-state-provider.tsx`, find the multi-line import block pulling from `@/infrastructure/supabase/database` (starts around line 21). Locate the `upsertBlock,` line and add `getOrCreateWeekPlan,` immediately above it (alphabetical ordering is not required; nearby is fine):

```typescript
import {
  fetchBlocksForWeek,
  getOrCreateWeekPlan,
  upsertBlock,
  updateBlockStatus,
  // ... rest of the existing imports
```

(If `updateBlockStatus` is no longer in the import list — it was removed in PR #17 — don't add it back; just add `getOrCreateWeekPlan`.)

### Step 2: Replace the `upsertBlock` call in `saveBlock`'s logged-in branch

Find the `.then` / `.catch` chain after the optimistic `setSupaBlocks(...)` call inside `saveBlock`'s `if (user) { ... }` branch (around lines 519-539). Current code:

```tsx
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
```

Replace with:

```tsx
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
```

The optimistic `setSupaBlocks(...)` call above this chain is unchanged. `return resultBlock!;` at the end of the `if (user)` branch is unchanged.

### Step 3: Update the `useCallback` dependency array

At the bottom of the `saveBlock` `useCallback`, the dependency array is currently `[user, notify]`. Change it to:

```tsx
}, [user, notify, useCases]);
```

### Step 4: Verify `upsertBlock` is still imported and still referenced

`upsertBlock` stays because `migrateLocalToSupabase` (line 234) and `copyPreviousWeekPlan` (line 643) still call it. Confirm with:

```bash
grep -n "upsertBlock" src/presentation/providers/app-state-provider.tsx
```

Expected: exactly three matches —
- the import line (around line 24),
- the `migrateLocalToSupabase` call (around line 234),
- the `copyPreviousWeekPlan` call (around line 643).

If a fourth match appears inside `saveBlock`, Step 2 didn't replace it — fix before continuing.

### Step 5: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all 132 tests still pass. No test file is modified; this is a pure logged-in-writer migration with identical shape to PR #17 and PR #18.

### Step 6: Commit

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "refactor: route saveBlock through UpdateBlockUseCase"
```

---

## Task 2: Manual verification + push + PR

### Step 1: Start dev server

```bash
pnpm dev
```

### Step 2: Verify

1. **Logged-in create.** Log in. Click an empty slot, fill in title / description / type, 儲存. The block appears optimistically. Reload the page. Expected: block persists from Supabase.
2. **Logged-in edit.** Click an existing block, change title and type, 儲存. Reload. Expected: new values persist.
3. **Network inspection.** Open devtools → Network. On a save, expect to see: one SELECT on `week_plans` (+ possibly one INSERT if the week plan didn't exist), one SELECT on `blocks`, one INSERT or UPDATE on `blocks`. No other endpoints hit for a block save.
4. **No console errors.** Console should be clean during all save operations.
5. **Logged-out.** Log out / use incognito. Create, edit blocks — all persist via localStorage. No network calls for block operations.
6. **Migration (optional).** If you have a clean test account, build a couple of blocks logged-out, log in — the migration should transfer them to Supabase via the untouched `migrateLocalToSupabase` (which still calls `upsertBlock` directly).

### Step 3: Push

```bash
git push -u origin refactor/wire-save-block-usecase
```

### Step 4: Open PR

```bash
gh pr create --title "refactor: wire saveBlock through UpdateBlockUseCase" --body "$(cat <<'EOF'
## Summary

- Add \`getOrCreateWeekPlan\` to \`AppStateProvider\`'s \`@/infrastructure/supabase/database\` import.
- Route the logged-in branch of \`AppStateProvider.saveBlock\` through \`useCases.updateBlock.execute(...)\` instead of calling \`database.ts:upsertBlock\` directly.
- Resolve \`weekKey → week_plans.id\` once at the call site via the existing \`getOrCreateWeekPlan\` helper.
- The optimistic \`setSupaBlocks\`, the \`.then(saved)\` reconciliation by \`dayOfWeek + slot\`, and the \`.catch\` error toast are all preserved.

## What this completes

With PR #17 (\`updateStatus\`), PR #18 (\`saveDiary\`), and this PR (\`saveBlock\`), the three primary write operations on the side-panel flow now route through use cases. The remaining migrations are \`setReflection\` (→ \`CreateWeekReviewUseCase\`), the various read paths, and the domains that still need use cases (subtasks, timers, weekly tasks, plan changes).

## Scope discipline

- Logged-out branch unchanged.
- \`migrateLocalToSupabase\` (line 235) and \`copyPreviousWeekPlan\` (line 643) still call \`upsertBlock\` directly — intentionally out of scope.
- No repository, use case, or entity changes.
- No test changes.

## Test plan

- [x] \`pnpm lint\` passes
- [x] \`pnpm type-check\` passes
- [x] \`pnpm test\` passes (132/132)
- [x] Manual: logged-in create / edit persists; logged-out persists via localStorage; first-login migration still works.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Add `getOrCreateWeekPlan` to the database import — Task 1, Step 1 ✓
- Replace `upsertBlock(user.id, weekKey, ...)` with `getOrCreateWeekPlan + useCases.updateBlock.execute` chain — Task 1, Step 2 ✓
- Preserve optimistic `setSupaBlocks`, `.catch` error toast, and `return resultBlock!` — Task 1, Step 2 (explicit "unchanged" callouts) ✓
- Extend `useCallback` deps to include `useCases` — Task 1, Step 3 ✓
- Keep `upsertBlock` import alive — Task 1, Step 4 (grep verification) ✓
- No other methods migrated — plan only touches `saveBlock`'s `if (user)` branch ✓
- No tests — plan deliberately omits ✓
- Manual verification scenarios — Task 2, Step 2 ✓

### 2. Placeholder scan

No TBD / TODO / vague references. Every code block is complete.

### 3. Type consistency

- `useCases.updateBlock.execute({weekPlanId, dayOfWeek, slot, blockType, title, description})` matches `UpdateBlockUseCase`'s `UpdateBlockInput` interface exactly.
- `getOrCreateWeekPlan(userId: string, weekStart: string): Promise<string>` — returns the week plan's UUID as a string, which lines up with `updateBlock.execute`'s `weekPlanId: string` input.
- `saved` from `useCases.updateBlock.execute(...)` is typed `Block` — the reconciliation `setSupaBlocks` writer expects `Block[]` inside each bucket; type-check will verify.
- `useCases` is already in scope from PR #17 (`const useCases = useUseCases();` at the top of `AppStateProvider`).

All checks pass.
