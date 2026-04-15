# Diary Cutoff at 08:00 — Design Spec

## Overview

Extend the diary's "today" window so that a day's diary can still be edited until **08:00 the next morning**. The idea is that users write their diary before bed, which often happens past midnight — the current `isTodayInWeek` cutoff at 00:00 loses the edit window immediately at midnight.

## Goals

- A day's `DiaryForm` stays editable from 00:00 of that day through 07:59 of the following day
- Only `DiaryForm` visibility is affected. `Block` state, time ranking, completion stats, anything else that uses calendar dates stays on standard date boundaries.

## Out of Scope

- Timezone / user preferences for the cutoff hour (hardcoded 08:00 local time)
- Grace period notification / visual hint when editing "yesterday's" diary
- Automatic prompt to finish the diary before the cutoff

---

## Logic

Define the concept of a **diary day**:

> The diary day at time `now` is `today` if `now.getHours() >= 8`, otherwise `yesterday`.

A cell's date matches the diary day → `DiaryForm` shows.

### Implementation

Replace the existing `isTodayInWeek` helper in `src/app/page.tsx` with:

```typescript
function isDiaryEditableDay(
  weekStart: Date,
  dayOfWeek: number,
  now: Date,
): boolean {
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));

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
```

### Usage

In the `<SidePanel />` render:

```tsx
isToday={isDiaryEditableDay(weekStart, selectedDayOfWeek, new Date())}
```

(Replaces the existing `isTodayInWeek` call; `isTodayInWeek` can be removed since nothing else uses it.)

---

## Cross-Week Behavior (verified)

- **Week-of-today, click today's cell at 09:00** → diary day = today, cell = today → match → DiaryForm shows.
- **Week-of-today, click yesterday's cell at 02:00** → diary day = yesterday (within current week), cell = yesterday → match → DiaryForm shows.
- **Viewing *previous* week at 02:00 on Monday, click that previous Sunday** → diary day = Sunday (yesterday), cell = previous Sunday → match → DiaryForm shows (correct; the user wants to close out yesterday's entry).
- **Week-of-today, click next Sunday at 02:00 Monday** → cell is 6 days future, doesn't match → DiaryForm hidden.

Checking date fields by `year/month/date` avoids timezone drift from `toISOString`.

---

## Testing

No unit tests are added. The helper is small and lives inside `page.tsx` (not exported). Behavior is easy to manually verify by changing system time or reading code. Adding a test file just for this would require either extracting the helper (over-engineering for a one-line definition) or mocking global `Date` (heavy).

### Manual verification
- Set system time to 07:00 on a day where "yesterday" has a block. Click yesterday's cell → DiaryForm visible.
- Set system time to 08:00. Same cell → DiaryForm hidden.
- Set system time to 09:00. Today's cell → DiaryForm visible.

---

## Affected Files

- `src/app/page.tsx` — remove `isTodayInWeek`, add `isDiaryEditableDay`, update the one call site.

No other files, no DB changes, no test changes.

## Branch

`feature/diary-cutoff-8am` (already created).
