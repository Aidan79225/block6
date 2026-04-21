# Wire `saveDiary` Through `WriteDiaryUseCase` — Design Spec

## Overview

Sub-project #3 of the clean-architecture wiring work. Migrates the second
`AppStateProvider` write method — `saveDiary` — so the logged-in path flows
through `WriteDiaryUseCase` → `SupabaseDiaryRepository` → `database.ts`
instead of calling `database.ts:upsertDiary` directly. This mirrors the PR
#17 pattern for `updateStatus`.

As a small adjunct, introduces `parseDateKey` in `src/lib/date-helpers.ts`
(the symmetric inverse of the existing `formatDateKey`) and replaces two
existing inline duplicates of the same parse pattern inside `database.ts`.

## Goals

- Logged-in `saveDiary` routes through `useCases.writeDiary.execute(...)`.
- Optimistic state update, error notification, and the logged-out
  localStorage branch are unchanged.
- New `parseDateKey(dateKey: string): Date` helper unit-tested.
- `pnpm lint && pnpm type-check && pnpm test` passes.

## Out of Scope

- Migrating any other `AppStateProvider` method. `saveBlock` gets its own
  sub-project next because it runs into the `Block.weekPlanId`
  UUID-vs-weekKey gap. `setReflection`, subtasks, timers, weekly tasks,
  plan-changes, read paths (`getWeekSummary`) — all future work.
- Modifying `migrateLocalToSupabase` at `app-state-provider.tsx:248-254`.
  That one-time migration flow keeps calling `upsertDiary` directly; the
  `upsertDiary` export therefore stays.
- Removing the dead `updateBlockStatus` export from `database.ts` (flagged
  in the PR #17 review — belongs in a later hygiene sweep, not this slice).

---

## `parseDateKey` helper

Add to `src/lib/date-helpers.ts`:

```typescript
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}
```

Returns a `Date` at local midnight on the given calendar date. Symmetric
inverse of `formatDateKey` — `formatDateKey(parseDateKey("2026-04-21"))`
must equal `"2026-04-21"` in any timezone.

### Replace inline duplicates inside `database.ts`

Two existing functions repeat the same parse logic:

- `dbWeekPlanToEntity` — `db.week_start.split("-").map(Number); new Date(y, m - 1, d)`.
- `dbDiaryToEntity` — `db.entry_date.split("-").map(Number); new Date(y, m - 1, d)`.

Both get updated to call `parseDateKey(db.week_start)` / `parseDateKey(db.entry_date)` respectively. Add the import at the top of `database.ts`.

### Tests

Add to `src/__tests__/lib/date-helpers.test.ts`, in a new `describe("parseDateKey", ...)` block:

- Parses `"2026-04-13"` to a `Date` with local Y/M/D = 2026/4/13 at 00:00.
- Pads correctly when the key has leading-zero month/day: `"2026-01-05"`.
- Round-trip with `formatDateKey`: `formatDateKey(parseDateKey(k))` === `k` for a range of sample keys.

---

## `saveDiary` migration

Inside `AppStateProvider`, the logged-in branch of `saveDiary`
(`app-state-provider.tsx:719-737`) currently reads:

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

After:

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

`useCases` is already available at the top of `AppStateProvider` (added in
PR #17). `parseDateKey` is imported from `@/lib/date-helpers`. The
`useCallback` dependency array gains `useCases` (becomes
`[user, notify, useCases]`).

The logged-out `else` branch is unchanged.

## Imports in `AppStateProvider`

- **Add:** `parseDateKey` to the existing `@/lib/date-helpers` import.
- **Leave in place:** `upsertDiary` in the `@/infrastructure/supabase/database` import block — still used by `migrateLocalToSupabase` at line 250.

## Behavioral difference

`WriteDiaryUseCase.execute` internally does `findByUserAndDate` (SELECT)
then `save` or `update` (INSERT or UPDATE). Versus the previous single
upsert via `upsertDiary`, which internally does the same SELECT-then-write
sequence — so DB query count is unchanged at 2 either way.

The use-case path additionally enforces non-empty `bad/good/next` via
`createDiaryEntry`'s constructor (the existing `upsertDiary` did not
validate). If the user submits an empty field the use case will throw; the
existing `.catch(...)` will surface "日記儲存失敗" — a minor UX improvement
(previously this would silently persist empty strings).

The `SupabaseDiaryRepository.update` path (after the ultrareview fix in PR
#15) writes all fields; functionally equivalent.

---

## Testing

- New `parseDateKey` tests in `src/__tests__/lib/date-helpers.test.ts`.
- Existing 128 tests stay green.
- Manual verification (in the plan):
  1. Logged-in: save a diary entry. Reload. Content persists.
  2. Logged-in with empty Bad field: the save path surfaces the error
     notification (new behavior via use-case validation).
  3. Logged-out: save a diary entry. Reload. Content persists in
     localStorage. No network call.
  4. First-login migration flow still works (existing localStorage diary
     entries migrate to Supabase via the untouched `migrateLocalToSupabase`).

---

## Affected Files

- Modify: `src/lib/date-helpers.ts` — add `parseDateKey`.
- Modify: `src/__tests__/lib/date-helpers.test.ts` — add tests for `parseDateKey`.
- Modify: `src/infrastructure/supabase/database.ts` — replace two inline date-parse duplicates with `parseDateKey`.
- Modify: `src/presentation/providers/app-state-provider.tsx` — migrate `saveDiary` logged-in branch; add `parseDateKey` import; update `useCallback` deps.

No other files change. No DB migrations. No other `AppStateProvider`
methods touched.

## Branch

`refactor/wire-save-diary-usecase` (to be created).
