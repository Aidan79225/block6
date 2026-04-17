# Unified Date Helpers — Design Spec

## Overview

Eliminate the UTC-vs-local inconsistency that currently runs through the
codebase's calendar-date handling. Introduce a single presentation-layer
module of pure helpers that treat every calendar date as **local time**, and
migrate all existing callers to use it. The small domain-layer rule that
validates `weekStart` is also flipped from UTC to local for consistency.

## Motivation

Three date patterns coexist today:

1. **UTC for week identity** — `getMonday` in `use-week-plan.ts`,
   `createWeekPlan` validation, `AppStateProvider`'s prev-week iteration.
2. **Local for cell/today comparison** — `page.tsx` and `review/page.tsx`.
3. **Local for display** — `week-navigator`, `block-timer`.

In timezones west of UTC, the UTC-based `weekStart` resolves to the user's
local Sunday evening, which makes the week-nav label show the wrong date and
breaks `isLockedDay` / `isDiaryEditableDay` comparisons. In timezones east of
UTC, querying the app before 08:00 local Monday returns the *previous*
week's Monday, because UTC is still Sunday.

A unified convention makes this class of bug impossible and keeps future
calendar code simple.

## Convention

**All calendar dates are local time.** An instant timestamp (e.g. a
`created_at` going to the database) still uses UTC via `toISOString()`, but
anything that represents a calendar day — "which Monday", "which Friday",
"is this cell today" — is in the user's local timezone.

## Goals

- One `date-helpers.ts` module, four exported functions, fully tested.
- All calendar-date call sites migrated to the helpers.
- Existing `pnpm lint && pnpm type-check && pnpm test` keeps passing.
- localStorage keys remain bit-identical for the common case — no user data
  migration.

## Out of Scope

- Display helpers in `week-navigator.tsx` / `block-timer.tsx` that already
  use local methods for pure formatting.
- Database / entity timestamp fields (`createdAt`, `started_at`, `ended_at`)
  — these are instants, not calendar dates. UTC via `toISOString()` stays.
- User-configurable timezones. The user's local timezone is always the
  device timezone.
- Renaming or restructuring the `AppStateProvider` that will happen in
  project-improvement #1 (architecture) later.

---

## Module: `src/presentation/lib/date-helpers.ts`

Pure functions, zero framework imports. Full exported API:

```typescript
/** Monday at 00:00 local time of the week containing `date`. */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Cell date for day-of-week 1 (Monday) through 7 (Sunday), at 00:00 local. */
export function getCellDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" using local calendar fields. */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when a and b fall on the same local calendar day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
```

**Design decisions:**

- `getCellDate` anchors to `00:00` local. That removes the latent
  time-of-day invariant the past-diary-readonly code review flagged, and
  makes `getCellDate(...).getTime() < someMidnight.getTime()` mean what it
  reads.
- `formatDateKey` takes a `Date` directly, not `(weekStart, dayOfWeek)`.
  Callers compose `formatDateKey(getCellDate(weekStart, dow))` — two small
  helpers beat one overloaded one.
- `isSameLocalDay` replaces the four-line inline `year/month/date` compare
  duplicated across `isDiaryEditableDay`, `isLockedDay`, and elsewhere.

---

## Migrations

### `src/presentation/hooks/use-week-plan.ts:4-11`

Delete the inline `getMonday`. Import from the new module.

### `src/app/page.tsx:29-33, 35-54, 56-62, 64-76`

`formatDateKey` and `getCellDate` — delete both inline helpers; import from
the module.

`isDiaryEditableDay(cellDate, now)` — rewrites to use `isSameLocalDay`:

```typescript
function isDiaryEditableDay(cellDate: Date, now: Date): boolean {
  const diaryDay = new Date(now);
  if (diaryDay.getHours() < 8) {
    diaryDay.setDate(diaryDay.getDate() - 1);
  }
  return isSameLocalDay(cellDate, diaryDay);
}
```

`getDiaryMode` — unchanged in logic; the `startOfToday` midnight normalization
stays. It still imports `isDiaryEditableDay` from the same file.

`isLockedDay(weekStart, dayOfWeek, now)` — refactor signature to
`isLockedDay(cellDate, now)` for symmetry with the other helpers, and use
`isSameLocalDay`:

```typescript
function isLockedDay(cellDate: Date, now: Date): boolean {
  return isSameLocalDay(cellDate, now);
}
```

The single call site that still passes `(weekStart, dayOfWeek, now)` gets
updated to compute `cellDate` with `getCellDate`.

### `src/app/page.tsx:241`

`const weekKey = weekStart.toISOString().split("T")[0];` →
`const weekKey = formatDateKey(weekStart);`

### `src/app/review/page.tsx:36, 51-52, 86-92`

Same two substitutions as `page.tsx`: replace any `setDate` + `toISOString`
pair with `getCellDate(weekStart, dow)` + `formatDateKey(...)`, and replace
the raw `weekStart.toISOString().split("T")[0]` with `formatDateKey`.

### `src/presentation/providers/app-state-provider.tsx:595-598`

```typescript
prev.setUTCDate(prev.getUTCDate() - 7);
const previousWeekKey = prev.toISOString().split("T")[0];
```

becomes

```typescript
prev.setDate(prev.getDate() - 7);
const previousWeekKey = formatDateKey(prev);
```

### `src/domain/entities/week-plan.ts:15`

`if (input.weekStart.getUTCDay() !== 1)` → `if (input.weekStart.getDay() !== 1)`.

The `WeekPlan` entity's validation is weak anyway (only runs in tests, no
production consumer), but keeping it on UTC would contradict the stated
convention and trip up anyone wiring the entity to real presentation code in
the future #1 work.

---

## localStorage & DB Keys — No Migration

Traced for both UTC+8 and UTC-5:

- **UTC+8 (Taiwan), Monday 10:00 local**
  - Current code: `weekStart = 2026-04-13 00:00 UTC = 08:00 local`. Cell for
    Tuesday = 2026-04-14 08:00 local. `toISOString().split("T")[0]` →
    `"2026-04-14"`.
  - New code: `weekStart = 2026-04-13 00:00 local`. Cell for Tuesday =
    `2026-04-14 00:00 local`. `formatDateKey` → `"2026-04-14"`. Same.

- **UTC-5 (EST), Monday 09:00 local**
  - Current code: `weekStart = 2026-04-13 00:00 UTC = 2026-04-12 19:00 local`.
    Cell for Tuesday (Monday's `setDate(+1)` in local) = `2026-04-13 19:00
    local = 2026-04-14 00:00 UTC`. `toISOString` → `"2026-04-14"`.
  - New code: `weekStart = 2026-04-13 00:00 local`. Cell for Tuesday =
    `2026-04-14 00:00 local`. `formatDateKey` → `"2026-04-14"`. Same.

The only case where current and new keys could diverge is the "early Monday
morning in UTC+8" edge case, where current code returns the *previous*
Monday (a latent bug) and new code returns the correct Monday. Any user who
actually opened the app in that window last week would have old keys stored
against the wrong week. This is a pre-existing bug, not something the
refactor introduces; users affected (if any) would simply see an empty week
when they navigate to the correct Monday and can re-enter data. We accept
this.

---

## Testing

### New: `src/__tests__/presentation/lib/date-helpers.test.ts`

Test each function with concrete `Date` inputs. No timer mocks, no global
`Date` mocks.

- **`getMonday`**
  - Wednesday → returns that week's Monday at 00:00.
  - Sunday → returns the *previous* Monday (Sunday is day 0).
  - Monday 03:00 → same day, normalized to 00:00.
  - Monday 23:59 → same day, normalized to 00:00.

- **`getCellDate`**
  - `getCellDate(monday, 1)` → that Monday at 00:00.
  - `getCellDate(monday, 7)` → the following Sunday at 00:00.
  - Time-of-day in `weekStart` is stripped (normalizes to 00:00).

- **`formatDateKey`**
  - `2026-04-13 00:00 local` → `"2026-04-13"`.
  - January 5 → `"YYYY-01-05"` (padding).

- **`isSameLocalDay`**
  - Two times on the same local date → true.
  - Two times across midnight → false.

### Existing test suite

All 89 existing tests must continue to pass — no expected changes to any
test file outside the new one.

---

## Affected Files

- Create: `src/presentation/lib/date-helpers.ts`
- Create: `src/__tests__/presentation/lib/date-helpers.test.ts`
- Modify: `src/presentation/hooks/use-week-plan.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/review/page.tsx`
- Modify: `src/presentation/providers/app-state-provider.tsx`
- Modify: `src/domain/entities/week-plan.ts`

No DB changes, no infrastructure changes.

## Branch

`refactor/unified-date-helpers` (to be created).
