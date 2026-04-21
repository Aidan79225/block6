# Wire `saveDiary` Through `WriteDiaryUseCase` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `AppStateProvider.saveDiary` (logged-in branch) through `WriteDiaryUseCase`, and DRY up the `parseDateKey` pattern in `database.ts` via a new helper.

**Architecture:** Add `parseDateKey(dateKey: string): Date` to `src/lib/date-helpers.ts` — the symmetric inverse of the existing `formatDateKey`. Use it in `dbDiaryToEntity` and `dbWeekPlanToEntity` (replacing inline duplicates). Import it into `AppStateProvider` and call `useCases.writeDiary.execute({...})` in the logged-in branch of `saveDiary`. The logged-out branch, optimistic state update, and one-time localStorage→Supabase migration are unchanged.

**Tech Stack:** TypeScript strict, Vitest. No new runtime dependencies. No DB migrations.

**Prerequisite:** Be on branch `refactor/wire-save-diary-usecase` (`git checkout -b refactor/wire-save-diary-usecase` before Task 1).

---

## File Structure

```
src/
  lib/
    date-helpers.ts                                                     (modify)
  __tests__/
    lib/
      date-helpers.test.ts                                              (modify)
  infrastructure/
    supabase/
      database.ts                                                       (modify)
  presentation/
    providers/
      app-state-provider.tsx                                            (modify)
```

No new files. No existing tests touched outside `date-helpers.test.ts`.

---

## Task 1: Add `parseDateKey` to `date-helpers` (TDD)

**Files:**
- Modify: `src/__tests__/lib/date-helpers.test.ts`
- Modify: `src/lib/date-helpers.ts`

### Step 1: Write failing tests

In `src/__tests__/lib/date-helpers.test.ts`, update the top-of-file import block to include `parseDateKey`:

```typescript
import {
  getMonday,
  getCellDate,
  formatDateKey,
  isSameLocalDay,
  parseDateKey,
} from "@/lib/date-helpers";
```

Then add a new `describe` block at the end of the outer `describe("date-helpers", ...)` block, right after the `isSameLocalDay` block (around line 89, before the closing `});`):

```typescript
  describe("parseDateKey", () => {
    it("parses YYYY-MM-DD to a Date at local midnight with matching Y/M/D", () => {
      const d = parseDateKey("2026-04-13");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(3); // zero-indexed April
      expect(d.getDate()).toBe(13);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    });

    it("handles zero-padded month and day", () => {
      const d = parseDateKey("2026-01-05");
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(5);
    });

    it("round-trips with formatDateKey", () => {
      const samples = ["2026-01-05", "2026-04-13", "2026-12-31"];
      for (const k of samples) {
        expect(formatDateKey(parseDateKey(k))).toBe(k);
      }
    });
  });
```

### Step 2: Run tests to verify they fail

```bash
pnpm test src/__tests__/lib/date-helpers.test.ts
```

Expected: the three new tests fail because `parseDateKey` is not exported (the import line at the top would also be an error).

### Step 3: Add the implementation

In `src/lib/date-helpers.ts`, after the existing `isSameLocalDay` function (after line 30), add:

```typescript

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}
```

### Step 4: Run tests to verify they pass

```bash
pnpm test src/__tests__/lib/date-helpers.test.ts
```

Expected: all tests (including the 3 new ones) pass.

### Step 5: Commit

```bash
git add src/lib/date-helpers.ts src/__tests__/lib/date-helpers.test.ts
git commit -m "feat: add parseDateKey helper (inverse of formatDateKey)"
```

---

## Task 2: Use `parseDateKey` in `database.ts` — remove inline duplicates

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

### Step 1: Add the import

In `src/infrastructure/supabase/database.ts`, find the existing import from `@/lib/date-helpers` (there may not be one yet — check with grep). If there is no existing one, add this near the other `@/domain/...` / `@/lib/...` imports at the top of the file:

```typescript
import { parseDateKey } from "@/lib/date-helpers";
```

If there is already an `@/lib/date-helpers` import, extend its named-import list to include `parseDateKey`.

### Step 2: Replace `dbWeekPlanToEntity`'s inline parse

Find the function around line 93:

```typescript
function dbWeekPlanToEntity(db: DbWeekPlan): WeekPlan {
  const [y, m, d] = db.week_start.split("-").map(Number);
  return {
    id: db.id,
    userId: db.user_id,
    weekStart: new Date(y, m - 1, d),
    createdAt: new Date(db.created_at),
  };
}
```

Replace with:

```typescript
function dbWeekPlanToEntity(db: DbWeekPlan): WeekPlan {
  return {
    id: db.id,
    userId: db.user_id,
    weekStart: parseDateKey(db.week_start),
    createdAt: new Date(db.created_at),
  };
}
```

### Step 3: Replace `dbDiaryToEntity`'s inline parse

Find the function around line 366:

```typescript
function dbDiaryToEntity(db: DbDiaryFull): DiaryEntry {
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
```

Replace with:

```typescript
function dbDiaryToEntity(db: DbDiaryFull): DiaryEntry {
  return {
    id: db.id,
    userId: db.user_id,
    entryDate: parseDateKey(db.entry_date),
    bad: db.bad,
    good: db.good,
    next: db.next,
    createdAt: new Date(db.created_at),
  };
}
```

### Step 4: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. The in-memory repo tests continue to assert the same `entryDate` / `weekStart` shape, which `parseDateKey` preserves (it's the exact same arithmetic, just extracted).

### Step 5: Commit

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "refactor: use parseDateKey in database.ts entity mappers"
```

---

## Task 3: Migrate `AppStateProvider.saveDiary` to `WriteDiaryUseCase`

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

### Step 1: Add `parseDateKey` to the `@/lib/date-helpers` import

Find the existing import at the top of the file (it currently imports `formatDateKey`):

```typescript
import { formatDateKey } from "@/lib/date-helpers";
```

Replace with:

```typescript
import { formatDateKey, parseDateKey } from "@/lib/date-helpers";
```

### Step 2: Replace the `upsertDiary` call inside `saveDiary`'s logged-in branch

Find `saveDiary` (around lines 719-737). Current logged-in branch:

```tsx
if (user) {
  setSupaDiary((prev) => ({
    ...prev,
    [dateKey]: { bad, good, next },
  }));
  upsertDiary(user.id, dateKey, bad, good, next).catch((err) => {
    console.error(err);
    notify.error("日記儲存失敗");
  });
}
```

Replace with:

```tsx
if (user) {
  setSupaDiary((prev) => ({
    ...prev,
    [dateKey]: { bad, good, next },
  }));
  useCases.writeDiary
    .execute({
      userId: user.id,
      entryDate: parseDateKey(dateKey),
      bad,
      good,
      next,
    })
    .catch((err) => {
      console.error(err);
      notify.error("日記儲存失敗");
    });
}
```

### Step 3: Update the `useCallback` dependency array

Directly after the body of `saveDiary`, the dependency array is `[user, notify]`. Update it to `[user, notify, useCases]`. The full `useCallback` shape should end with:

```tsx
}, [user, notify, useCases]);
```

### Step 4: Do NOT remove the `upsertDiary` import

`upsertDiary` is still used by `migrateLocalToSupabase` around line 250 (the one-time on-first-login migration). The import must remain.

Verify with:

```bash
grep -n "upsertDiary" src/presentation/providers/app-state-provider.tsx
```

Expected output (two lines — the import line, and the line 250 migration call; nothing else):

```
26:  upsertDiary,
250:      await upsertDiary(userId, dateKey, entry.bad, entry.good, entry.next);
```

If a third match appears (inside `saveDiary`), Step 2 didn't replace it — fix before continuing.

### Step 5: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass; 131 tests (128 baseline + 3 new `parseDateKey` tests).

### Step 6: Commit

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "refactor: route saveDiary through WriteDiaryUseCase"
```

---

## Task 4: Manual verification + push + PR

### Step 1: Start dev server

```bash
pnpm dev
```

### Step 2: Verify four scenarios

1. **Logged-in happy path.** Log in. On today's cell, fill in Bad/Good/Next and click 儲存. The side panel shows the new values. Reload the page. Expected: values persist from Supabase.
2. **Logged-in validation.** With all three fields non-empty, save works. Then try saving with ONE field blank — expect the error toast "日記儲存失敗" (this is new behavior: `WriteDiaryUseCase` calls `createDiaryEntry` which throws on empty fields).
3. **Logged-out.** Log out (or use incognito). Save a diary entry on today. Reload. Expected: the entry persists in localStorage.
4. **First-login migration.** If possible, log out and build a diary entry while logged-out. Then log in. Expected: the entry migrates to Supabase via the untouched `migrateLocalToSupabase` (not through the use case). Skip if you don't have a clean test account.

### Step 3: Push

```bash
git push -u origin refactor/wire-save-diary-usecase
```

### Step 4: Open PR

```bash
gh pr create --title "refactor: wire saveDiary through WriteDiaryUseCase" --body "$(cat <<'EOF'
## Summary

- Add \`parseDateKey\` to \`src/lib/date-helpers.ts\` — the symmetric inverse of \`formatDateKey\`.
- Use \`parseDateKey\` in \`dbWeekPlanToEntity\` and \`dbDiaryToEntity\`, removing two inline duplicates.
- Route the logged-in branch of \`AppStateProvider.saveDiary\` through \`useCases.writeDiary.execute(...)\` instead of calling \`database.ts:upsertDiary\` directly.

## What this unblocks

Sub-project #4 will migrate \`saveBlock\` (requires resolving the \`Block.weekPlanId\` UUID-vs-weekKey gap). Sub-project #5+ can then tackle \`setReflection\`, read paths, subtasks, and so on.

## Behavioral difference

The use-case path validates non-empty \`bad / good / next\` via \`createDiaryEntry\` — if any field is empty, the save surfaces the existing "日記儲存失敗" toast instead of silently persisting empty strings. Query count is unchanged (both paths SELECT then INSERT/UPDATE).

## Scope discipline

- Logged-out branch unchanged.
- \`migrateLocalToSupabase\` one-time migration unchanged (still calls \`upsertDiary\` directly).
- No other \`AppStateProvider\` methods migrated.
- \`upsertDiary\` export stays (still used by the migration).

## Test plan

- [x] \`pnpm lint\` passes
- [x] \`pnpm type-check\` passes
- [x] \`pnpm test\` passes (131/131; +3 new parseDateKey tests)
- [x] Manual: logged-in save persists across reload; empty-field save surfaces the error toast; logged-out save persists via localStorage.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Add `parseDateKey` with 3 tests (round-trip, zero padding, literal-value) — Task 1 ✓
- Replace inline parse in `dbWeekPlanToEntity` — Task 2, Step 2 ✓
- Replace inline parse in `dbDiaryToEntity` — Task 2, Step 3 ✓
- Import `parseDateKey` into `AppStateProvider` — Task 3, Step 1 ✓
- Replace `upsertDiary(...)` with `useCases.writeDiary.execute({...})` in logged-in branch of `saveDiary` — Task 3, Step 2 ✓
- Update `useCallback` deps to include `useCases` — Task 3, Step 3 ✓
- Keep `upsertDiary` import (still used by `migrateLocalToSupabase`) — Task 3, Step 4 verification ✓
- Logged-out branch unchanged — preserved in the replacement snippet ✓
- No other `AppStateProvider` methods touched — explicit in the plan ✓
- Manual verification — Task 4, Step 2 ✓
- Push + PR — Task 4, Steps 3-4 ✓

### 2. Placeholder scan

No TBD / TODO / vague references. All commands explicit; every code block is a complete, directly-pasteable snippet.

### 3. Type consistency

- `parseDateKey(dateKey: string): Date` — signature matches the definition in Task 1, the two call sites in Task 2 (pass `db.week_start` and `db.entry_date`, both strings), and the one call in Task 3 (`parseDateKey(dateKey)` where `dateKey: string` from `saveDiary`'s params).
- `useCases.writeDiary.execute({userId, entryDate, bad, good, next})` matches `WriteDiaryUseCase.execute`'s `WriteDiaryInput` exactly (`userId: string, entryDate: Date, bad: string, good: string, next: string`).
- `useCases` is already in scope from PR #17 (added to `AppStateProvider` in that slice).

All checks pass.
