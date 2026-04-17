# Past-Day Diary Read-Only View — Design Spec

## Overview

When the user selects a block on a **past** day in the side panel, display the
day's emotional diary (`bad` / `good` / `next`) in a read-only view. Today's
diary (and yesterday's before 08:00) remains editable via the existing
`DiaryForm`. Future days and past days with no diary entry render nothing.

## Goals

- Let users revisit what they wrote on earlier days without accidentally
  editing it.
- Keep today's editing flow unchanged.
- No data-layer changes — `useDiary.getDiary(dateKey)` already returns entries
  for any date.

## Out of Scope

- Editing past diaries (even through a confirmation / unlock flow).
- Any change to `DiaryWeekView` on the review page.
- Showing diaries for past days that have **no entry** (hidden entirely).
- Showing diaries for **future** days.

---

## Diary mode classification

Each selected cell falls into one of three modes:

| Mode | Condition | UI |
|---|---|---|
| `editable` | `isDiaryEditableDay` returns `true` (today, or yesterday before 08:00) | `DiaryForm` (existing) |
| `readonly` | cell date is strictly before the start of today **and** is not the editable day | `DiaryReadOnlyView` (new) when an entry exists; otherwise nothing |
| `hidden`   | cell date is today or later but not editable (i.e., future) | nothing rendered |

The classification is purely date-based, so it works correctly when the user
has navigated to past or future weeks via the week navigator.

### Helper

Introduce `getDiaryMode(cellDate: Date, now: Date): DiaryMode` in
`src/app/page.tsx`, alongside the existing `isDiaryEditableDay`. The existing
helper is refactored to take a concrete `cellDate: Date` instead of
`(weekStart, dayOfWeek)` — its single current call site already computes the
cell date, and the simpler signature lets `getDiaryMode` reuse it cleanly.

```typescript
type DiaryMode = "editable" | "readonly" | "hidden";

function isDiaryEditableDay(cellDate: Date, now: Date): boolean {
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
```

Note the subtle case: during 00:00–07:59 the editable day is *yesterday*.
`isDiaryEditableDay` catches that branch first, so the cell-is-strictly-past
check in `getDiaryMode` only runs for dates earlier than yesterday — which is
exactly what we want.

---

## `DiaryReadOnlyView` component

Location: `src/presentation/components/side-panel/diary-readonly-view.tsx`.

```tsx
interface Props {
  bad: string;
  good: string;
  next: string;
}
```

Visual layout mirrors `DiaryForm`:

- Heading "情緒日記" (same style as `DiaryForm`'s label).
- Three rows, each with a small sub-label (`Bad` / `Good` / `Next`) and the
  value rendered as plain text.
- Empty field values render as `—`, matching `DiaryWeekView`'s convention.

No inputs, no save button. Uses the same `--color-text-*` theme tokens so it
follows dark/light theme switches.

No shared abstraction with `DiaryWeekView` — the two layouts differ (single
day vs. seven-day grid) and extracting a shared "diary card" would cost more
than it saves at two call sites.

---

## `SidePanel` wiring

`SidePanelProps` changes:

- **Remove:** `isToday: boolean`.
- **Add:** `diaryMode: DiaryMode`.

Render rules inside `SidePanel`:

```tsx
{diaryMode === "editable" && (
  <DiaryForm
    key={`diary-${dayOfWeek}`}
    bad={diaryLines?.bad ?? ""}
    good={diaryLines?.good ?? ""}
    next={diaryLines?.next ?? ""}
    onSave={onSaveDiary}
  />
)}
{diaryMode === "readonly" && diaryLines && (
  <DiaryReadOnlyView
    bad={diaryLines.bad}
    good={diaryLines.good}
    next={diaryLines.next}
  />
)}
```

`diaryMode === "hidden"` and `diaryMode === "readonly"` with `diaryLines === null`
both render nothing.

### Call-site change in `page.tsx`

```tsx
diaryMode={getDiaryMode(
  getCellDate(weekStart, selectedDayOfWeek),
  new Date(),
)}
```

Where `getCellDate(weekStart, dayOfWeek)` wraps the
`new Date(weekStart); setDate(+dayOfWeek-1)` pattern so the call site stays
readable. If it turns out to be used in only one place, the computation can
stay inline — a judgment call made during implementation.

---

## Testing

### New: `src/__tests__/presentation/components/diary-readonly-view.test.tsx`

- Renders `bad` / `good` / `next` values as plain text.
- Renders `—` for empty field values.
- Renders the "情緒日記" heading.
- Renders no `<input>` element and no button.

### New: `src/__tests__/presentation/components/side-panel.test.tsx`

(No existing side-panel test file — this one is created fresh.)

- `diaryMode="editable"` → `DiaryForm` present, `DiaryReadOnlyView` absent.
- `diaryMode="readonly"` with a non-null `diaryLines` → `DiaryReadOnlyView`
  present, `DiaryForm` absent.
- `diaryMode="readonly"` with `diaryLines === null` → neither rendered.
- `diaryMode="hidden"` → neither rendered (regardless of `diaryLines`).

### No test for `getDiaryMode`

The helper is a small private function in `page.tsx`, same pattern as
`isDiaryEditableDay` in the `2026-04-16-diary-cutoff-8am` spec. Exporting or
mocking `Date` just for this adds more complexity than the logic warrants.

---

## Affected Files

- `src/app/page.tsx` — add `getDiaryMode`, refactor `isDiaryEditableDay`
  signature, update the one `SidePanel` call site.
- `src/presentation/components/side-panel/side-panel.tsx` — replace
  `isToday` prop with `diaryMode`, update render logic.
- `src/presentation/components/side-panel/diary-readonly-view.tsx` — new.
- `src/__tests__/presentation/components/diary-readonly-view.test.tsx` — new.
- `src/__tests__/presentation/components/side-panel.test.tsx` — new.

No DB changes, no domain-layer changes, no repository changes.

## Branch

`feature/past-diary-readonly` (to be created).
