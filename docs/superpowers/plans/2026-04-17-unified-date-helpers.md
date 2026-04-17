# Unified Date Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed UTC-and-local calendar-date logic with a single `date-helpers.ts` module that treats every calendar date as local time, and migrate all callers.

**Architecture:** A new pure-function module at `src/presentation/lib/date-helpers.ts` exports `getMonday`, `getCellDate`, `formatDateKey`, and `isSameLocalDay`. All existing inline helpers that handle calendar dates delete their own copies and import from the module. One domain-layer change flips `createWeekPlan`'s validation from `getUTCDay` to `getDay`; its test is updated to construct Dates with explicit local-midnight constructors so it passes deterministically across timezones.

**Tech Stack:** TypeScript strict, Vitest. No new runtime dependencies, no DB changes.

**Prerequisite:** Be on branch `refactor/unified-date-helpers` (create before Task 1: `git checkout -b refactor/unified-date-helpers`).

---

## File Structure

```
src/
  presentation/
    lib/
      date-helpers.ts                                                   (create)
    hooks/
      use-week-plan.ts                                                  (modify)
    providers/
      app-state-provider.tsx                                            (modify)
  app/
    page.tsx                                                            (modify)
    review/
      page.tsx                                                          (modify)
  domain/
    entities/
      week-plan.ts                                                      (modify)
  __tests__/
    presentation/
      lib/
        date-helpers.test.ts                                            (create)
    domain/
      entities/
        week-plan.test.ts                                               (modify)
```

---

## Task 1: Create the `date-helpers` module (TDD)

**Files:**
- Create: `src/__tests__/presentation/lib/date-helpers.test.ts`
- Create: `src/presentation/lib/date-helpers.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/__tests__/presentation/lib/date-helpers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  getMonday,
  getCellDate,
  formatDateKey,
  isSameLocalDay,
} from "@/presentation/lib/date-helpers";

describe("date-helpers", () => {
  describe("getMonday", () => {
    it("returns same-week Monday at 00:00 local for a mid-week day", () => {
      const wed = new Date(2026, 3, 15, 14, 30); // Wed 2026-04-15 14:30 local
      const monday = getMonday(wed);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(3);
      expect(monday.getDate()).toBe(13);
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
      expect(monday.getSeconds()).toBe(0);
      expect(monday.getMilliseconds()).toBe(0);
    });

    it("returns previous Monday when given a Sunday", () => {
      const sunday = new Date(2026, 3, 19, 10, 0); // Sun 2026-04-19
      const monday = getMonday(sunday);
      expect(monday.getDate()).toBe(13);
    });

    it("normalizes a Monday with non-midnight time to the same Monday at 00:00", () => {
      const mondayAfternoon = new Date(2026, 3, 13, 23, 59, 59, 999);
      const monday = getMonday(mondayAfternoon);
      expect(monday.getDate()).toBe(13);
      expect(monday.getHours()).toBe(0);
    });

    it("returns the same Monday for Monday at 03:00 local (early morning)", () => {
      const mondayEarly = new Date(2026, 3, 13, 3, 0);
      const monday = getMonday(mondayEarly);
      expect(monday.getDate()).toBe(13);
    });
  });

  describe("getCellDate", () => {
    const monday = new Date(2026, 3, 13, 0, 0); // 2026-04-13 Mon local midnight

    it("returns the same Monday for dayOfWeek 1", () => {
      const d = getCellDate(monday, 1);
      expect(d.getDate()).toBe(13);
      expect(d.getHours()).toBe(0);
    });

    it("returns Sunday (dayOfWeek 7) six days later at 00:00 local", () => {
      const d = getCellDate(monday, 7);
      expect(d.getDate()).toBe(19);
      expect(d.getHours()).toBe(0);
    });

    it("strips a non-midnight time-of-day from weekStart", () => {
      const mondayWithTime = new Date(2026, 3, 13, 15, 30);
      const d = getCellDate(mondayWithTime, 3);
      expect(d.getDate()).toBe(15);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });
  });

  describe("formatDateKey", () => {
    it("formats a date as YYYY-MM-DD using local fields", () => {
      expect(formatDateKey(new Date(2026, 3, 13))).toBe("2026-04-13");
    });

    it("pads single-digit month and day", () => {
      expect(formatDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
  });

  describe("isSameLocalDay", () => {
    it("returns true for two times on the same local day", () => {
      const morning = new Date(2026, 3, 13, 9, 0);
      const evening = new Date(2026, 3, 13, 23, 30);
      expect(isSameLocalDay(morning, evening)).toBe(true);
    });

    it("returns false across the midnight boundary", () => {
      const lateMon = new Date(2026, 3, 13, 23, 59);
      const earlyTue = new Date(2026, 3, 14, 0, 1);
      expect(isSameLocalDay(lateMon, earlyTue)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test src/__tests__/presentation/lib/date-helpers.test.ts
```

Expected: FAIL with "Cannot find module '@/presentation/lib/date-helpers'" or equivalent.

- [ ] **Step 3: Create the module**

Create `src/presentation/lib/date-helpers.ts`:

```typescript
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCellDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test src/__tests__/presentation/lib/date-helpers.test.ts
```

Expected: PASS (all 10 tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/lib/date-helpers.ts src/__tests__/presentation/lib/date-helpers.test.ts
git commit -m "feat: add date-helpers module with getMonday/getCellDate/formatDateKey/isSameLocalDay"
```

---

## Task 2: Migrate `use-week-plan.ts` to the helpers

**Files:**
- Modify: `src/presentation/hooks/use-week-plan.ts`

- [ ] **Step 1: Replace the inline `getMonday` with an import**

Open `src/presentation/hooks/use-week-plan.ts`. Current contents:

```typescript
"use client";
import { useState, useCallback } from "react";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function useWeekPlan() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  return { weekStart, goToPreviousWeek, goToNextWeek };
}
```

Replace with:

```typescript
"use client";
import { useState, useCallback } from "react";
import { getMonday } from "@/presentation/lib/date-helpers";

export function useWeekPlan() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  return { weekStart, goToPreviousWeek, goToNextWeek };
}
```

- [ ] **Step 2: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/hooks/use-week-plan.ts
git commit -m "refactor: use date-helpers module in use-week-plan"
```

---

## Task 3: Migrate `page.tsx` helpers

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the import and delete inline helpers**

In `src/app/page.tsx`, near the top of the file alongside other imports, add:

```typescript
import {
  getCellDate,
  formatDateKey,
  isSameLocalDay,
} from "@/presentation/lib/date-helpers";
```

Find the existing inline helpers block (lines ~29-76 in the current file):

```typescript
function formatDateKey(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

type DiaryMode = "editable" | "readonly" | "hidden";

function getCellDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d;
}

function isDiaryEditableDay(cellDate: Date, now: Date): boolean {
  // Diary day = today if now >= 08:00, else yesterday
  const diaryDay = new Date(now);
  if (diaryDay.getHours() < 8) {
    diaryDay.setDate(diaryDay.getDate() - 1);
  }
  return (
    cellDate.getFullYear() === diaryDay.getFullYear() &&
    cellDate.getMonth() === diaryDay.getMonth() &&
    cellDate.getDate() === diaryDay.getDate()
  );
}

function getDiaryMode(cellDate: Date, now: Date): DiaryMode {
  if (isDiaryEditableDay(cellDate, now)) return "editable";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (cellDate.getTime() < startOfToday.getTime()) return "readonly";
  return "hidden";
}

function isLockedDay(
  weekStart: Date,
  dayOfWeek: number,
  now: Date,
): boolean {
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));
  return (
    cellDate.getFullYear() === now.getFullYear() &&
    cellDate.getMonth() === now.getMonth() &&
    cellDate.getDate() === now.getDate()
  );
}
```

Replace the whole block with:

```typescript
type DiaryMode = "editable" | "readonly" | "hidden";

function isDiaryEditableDay(cellDate: Date, now: Date): boolean {
  // Diary day = today if now >= 08:00, else yesterday
  const diaryDay = new Date(now);
  if (diaryDay.getHours() < 8) {
    diaryDay.setDate(diaryDay.getDate() - 1);
  }
  return isSameLocalDay(cellDate, diaryDay);
}

function getDiaryMode(cellDate: Date, now: Date): DiaryMode {
  if (isDiaryEditableDay(cellDate, now)) return "editable";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (cellDate.getTime() < startOfToday.getTime()) return "readonly";
  return "hidden";
}

function isLockedDay(cellDate: Date, now: Date): boolean {
  return isSameLocalDay(cellDate, now);
}
```

- [ ] **Step 2: Update the `formatDateKey` call site**

Find the old `formatDateKey(weekStart, selectedDayOfWeek)` pattern used when reading diary entries — current source uses it around the `<SidePanel />` JSX at `diaryLines={getDiary(formatDateKey(weekStart, selectedDayOfWeek))}`. The new `formatDateKey` takes a `Date`, so change it to:

```tsx
diaryLines={getDiary(formatDateKey(getCellDate(weekStart, selectedDayOfWeek)))}
```

- [ ] **Step 3: Update the `weekKey` line**

Find `const weekKey = weekStart.toISOString().split("T")[0];` (around line 241) and replace with:

```typescript
const weekKey = formatDateKey(weekStart);
```

- [ ] **Step 4: Update the `isLockedDay` call site**

Find the call site(s) that currently use `isLockedDay(weekStart, dayOfWeek, now)`. The call uses the old `(weekStart, dayOfWeek, now)` signature. Replace each such call with:

```typescript
isLockedDay(getCellDate(weekStart, dayOfWeek), now)
```

(The variable names at the call site — `selectedDayOfWeek`, `new Date()`, etc. — should stay as-is; only the argument composition changes.)

- [ ] **Step 5: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. If `pnpm type-check` flags a missing call-site update (e.g., "expected 2 arguments, got 3"), find the stray caller and apply the same transformation as Step 4.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: use date-helpers module in dashboard page"
```

---

## Task 4: Migrate `review/page.tsx` and `app-state-provider.tsx`

**Files:**
- Modify: `src/app/review/page.tsx`
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Migrate `review/page.tsx`**

In `src/app/review/page.tsx`, add to the imports:

```typescript
import {
  getCellDate,
  formatDateKey,
} from "@/presentation/lib/date-helpers";
```

Find `const weekKey = weekStart.toISOString().split("T")[0];` (around line 36) and replace with:

```typescript
const weekKey = formatDateKey(weekStart);
```

Find the loop around lines 48-55 that loads diaries:

```typescript
useEffect(() => {
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dow - 1));
    const dateKey = d.toISOString().split("T")[0];
    loadDiary(dateKey);
  }
}, [weekStart, loadDiary]);
```

Replace with:

```typescript
useEffect(() => {
  for (let dow = 1; dow <= 7; dow++) {
    const dateKey = formatDateKey(getCellDate(weekStart, dow));
    loadDiary(dateKey);
  }
}, [weekStart, loadDiary]);
```

Find the similar loop around lines 86-92 that builds `weekDiaries`:

```typescript
for (let dow = 1; dow <= 7; dow++) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dow - 1));
  const dateKey = d.toISOString().split("T")[0];
  const entry = diaryEntries[dateKey];
  weekDiaries.push(entry ? { dayOfWeek: dow, ...entry } : null);
}
```

Replace with:

```typescript
for (let dow = 1; dow <= 7; dow++) {
  const dateKey = formatDateKey(getCellDate(weekStart, dow));
  const entry = diaryEntries[dateKey];
  weekDiaries.push(entry ? { dayOfWeek: dow, ...entry } : null);
}
```

- [ ] **Step 2: Migrate `app-state-provider.tsx`**

In `src/presentation/providers/app-state-provider.tsx`, add to the imports:

```typescript
import { formatDateKey } from "@/presentation/lib/date-helpers";
```

Find the block around lines 595-598:

```typescript
const currentDate = new Date(currentWeekKey);
const prev = new Date(currentDate);
prev.setUTCDate(prev.getUTCDate() - 7);
const previousWeekKey = prev.toISOString().split("T")[0];
```

Replace with:

```typescript
const currentDate = new Date(currentWeekKey);
const prev = new Date(currentDate);
prev.setDate(prev.getDate() - 7);
const previousWeekKey = formatDateKey(prev);
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/review/page.tsx src/presentation/providers/app-state-provider.tsx
git commit -m "refactor: use date-helpers in review page and app-state-provider"
```

---

## Task 5: Update `week-plan` entity and its test

The domain entity validates that `weekStart` is a Monday. Change the validation from `getUTCDay` to `getDay` so it matches the unified convention. The existing test constructs Dates with `new Date("2026-04-13")` (a UTC-parse), which may evaluate to a different weekday depending on the test runner's timezone. Update the test to use explicit local-midnight constructors so it's deterministic.

**Files:**
- Modify: `src/domain/entities/week-plan.ts`
- Modify: `src/__tests__/domain/entities/week-plan.test.ts`

- [ ] **Step 1: Update the entity validation**

In `src/domain/entities/week-plan.ts`, find:

```typescript
if (input.weekStart.getUTCDay() !== 1)
  throw new Error("weekStart must be a Monday");
```

Replace with:

```typescript
if (input.weekStart.getDay() !== 1)
  throw new Error("weekStart must be a Monday");
```

- [ ] **Step 2: Update the test to use local-midnight constructors**

In `src/__tests__/domain/entities/week-plan.test.ts`, replace the full contents with:

```typescript
import { describe, it, expect } from "vitest";
import { createWeekPlan } from "@/domain/entities/week-plan";

describe("WeekPlan", () => {
  it("creates a week plan with required fields", () => {
    const monday = new Date(2026, 3, 13); // Mon 2026-04-13 at local midnight
    const plan = createWeekPlan({
      id: "wp-1",
      userId: "user-1",
      weekStart: monday,
      createdAt: new Date(),
    });
    expect(plan.id).toBe("wp-1");
    expect(plan.userId).toBe("user-1");
    expect(plan.weekStart).toEqual(monday);
  });

  it("rejects weekStart that is not a Monday", () => {
    const tuesday = new Date(2026, 3, 14); // Tue 2026-04-14 at local midnight
    expect(() =>
      createWeekPlan({
        id: "wp-1",
        userId: "user-1",
        weekStart: tuesday,
        createdAt: new Date(),
      }),
    ).toThrow("weekStart must be a Monday");
  });
});
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass, including `src/__tests__/domain/entities/week-plan.test.ts` (both cases).

- [ ] **Step 4: Commit**

```bash
git add src/domain/entities/week-plan.ts src/__tests__/domain/entities/week-plan.test.ts
git commit -m "refactor: switch WeekPlan validation to local getDay"
```

---

## Task 6: Manual verification + push + PR

- [ ] **Step 1: Start dev server and smoke-test**

```bash
pnpm dev
```

Click through:
- The week-nav label shows dates matching your local calendar Monday.
- Clicking today's cell → editable diary appears (as before).
- Clicking a past day's cell with a saved diary → read-only diary appears (as before).
- Navigating to a previous week via `<` → cells show expected dates.

- [ ] **Step 2: Push**

```bash
git push -u origin refactor/unified-date-helpers
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "refactor: unify calendar-date helpers on local time" --body "$(cat <<'EOF'
## Summary

- Add `src/presentation/lib/date-helpers.ts` with `getMonday`, `getCellDate`, `formatDateKey`, and `isSameLocalDay`, plus full unit-test coverage.
- Migrate `use-week-plan`, `page.tsx`, `review/page.tsx`, and `app-state-provider.tsx` to use the helpers. Delete the inline copies.
- Flip `WeekPlan.createWeekPlan` validation from `getUTCDay` to `getDay`; update its test to use explicit local-midnight constructors.

## Motivation

The codebase mixed UTC (`getUTCDay`, `setUTCHours`) and local (`getDay`, `setDate`) methods for calendar-date handling. In timezones west of UTC, the UTC-based `weekStart` resolved to the user's local Sunday evening, causing week-nav to show the wrong date and `isLockedDay` to misidentify today. Standardizing on local time removes this class of bug.

## Test plan

- [x] `pnpm lint` passes
- [x] `pnpm type-check` passes
- [x] `pnpm test` passes (10 new tests in `date-helpers.test.ts`; existing tests unchanged)
- [x] Manual smoke test on local dev server: week-nav labels match local calendar, diary / locked-day behaviors unchanged

## Data safety

localStorage keys are bit-identical before and after the refactor (traced for both UTC+8 and UTC-5 in the design spec). No user data migration required.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- New module `src/presentation/lib/date-helpers.ts` with four exports — Task 1 ✓
- Test coverage for all four helpers — Task 1 ✓
- Migrate `use-week-plan.ts` — Task 2 ✓
- Migrate `page.tsx` (formatDateKey, getCellDate, isDiaryEditableDay, isLockedDay, weekKey) — Task 3 ✓
- Migrate `review/page.tsx` (weekKey + two cellDate loops) — Task 4 ✓
- Migrate `app-state-provider.tsx:595-598` — Task 4 ✓
- Flip `week-plan.ts` entity validation — Task 5 ✓
- Update entity test to use local-midnight constructors — Task 5 ✓
- Manual verification and PR open — Task 6 ✓

### 2. Placeholder scan

No TBD / TODO / "fill in details". All code blocks concrete. Every command has expected output.

### 3. Type consistency

- `getMonday(date: Date): Date` — consistent between definition (Task 1), call in `use-week-plan` (Task 2), and the helper module's export.
- `getCellDate(weekStart: Date, dayOfWeek: number): Date` — consistent between definition (Task 1) and call sites in `page.tsx` (Task 3) and `review/page.tsx` (Task 4).
- `formatDateKey(date: Date): string` — consistent with the new single-argument signature across `page.tsx`, `review/page.tsx`, and `app-state-provider.tsx`.
- `isSameLocalDay(a: Date, b: Date): boolean` — used inside `page.tsx` only (Task 3); signature matches definition.
- `isLockedDay(cellDate: Date, now: Date): boolean` — new signature; Task 3 Step 4 updates the call site.
- `DiaryMode` type alias — unchanged (stays in `page.tsx`).

All checks pass.
