# Diary Cutoff at 08:00 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend DiaryForm's "today" window so yesterday's diary stays editable until 08:00 the next morning.

**Architecture:** Replace the `isTodayInWeek` helper in `src/app/page.tsx` with `isDiaryEditableDay`, which treats the "diary day" as today when the current hour >= 8, or yesterday otherwise. Only the one call site (SidePanel's `isToday` prop) uses this helper.

**Tech Stack:** TypeScript, React. No DB changes, no new dependencies.

---

## File Structure

```
src/
  app/
    page.tsx                                                            (modify)
```

Single file. No new files, no tests.

---

## Task 1: Replace the Helper

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove `isTodayInWeek` function**

Find and delete this block in `src/app/page.tsx`:

```typescript
function isTodayInWeek(weekStart: Date, dayOfWeek: number): boolean {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}
```

- [ ] **Step 2: Add `isDiaryEditableDay` function**

In the same location (above `export default function DashboardPage`), add:

```typescript
function isDiaryEditableDay(
  weekStart: Date,
  dayOfWeek: number,
  now: Date,
): boolean {
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));

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
```

- [ ] **Step 3: Update the call site**

Find the `<SidePanel />` JSX. Find the `isToday` prop:

```tsx
            isToday={isTodayInWeek(weekStart, selectedDayOfWeek)}
```

Replace with:

```tsx
            isToday={isDiaryEditableDay(weekStart, selectedDayOfWeek, new Date())}
```

- [ ] **Step 4: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 5: Manual verification**

```bash
pnpm dev
```

With a block existing for today AND yesterday:
- Check current time. If current hour >= 8: click today's cell → DiaryForm visible. Click yesterday's cell → DiaryForm hidden.
- If current hour < 8: click yesterday's cell → DiaryForm visible. Click today's cell → DiaryForm also visible (today's entry can already be written in early morning).

To fully verify the cutoff behavior, either wait until the appropriate hour or temporarily change the system clock. Not mandatory for this trivial change — the logic is simple enough.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: extend diary edit window to 08:00 next day"
```

---

## Task 2: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/diary-cutoff-8am
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: extend diary edit window to 08:00 next day" --body "$(cat <<'EOF'
## Summary

- Replace `isTodayInWeek` with `isDiaryEditableDay` in `page.tsx`
- A day's DiaryForm is editable from 00:00 of that day through 07:59 of the following day
- Only DiaryForm visibility is affected; all other date-based logic is unchanged

## Test plan

- [ ] At 09:00 (or any time >= 08:00): today's cell shows DiaryForm, yesterday's does not
- [ ] At 02:00 (or any time < 08:00): yesterday's cell still shows DiaryForm, today's also shows
- [ ] Future days never show DiaryForm

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Replace `isTodayInWeek` with `isDiaryEditableDay` — Task 1, Steps 1+2 ✓
- 08:00 cutoff logic (today if hour >= 8, else yesterday) — Task 1, Step 2 ✓
- Update the single call site in SidePanel — Task 1, Step 3 ✓
- Verify lint/type-check/tests — Task 1, Step 4 ✓
- Only DiaryForm visibility changes, not any other date logic — verified by "only one call site" scope ✓

### 2. Placeholder scan

No TBD / TODO / vague references. All code is complete.

### 3. Type consistency

- `isDiaryEditableDay(weekStart: Date, dayOfWeek: number, now: Date): boolean` matches the call `isDiaryEditableDay(weekStart, selectedDayOfWeek, new Date())` — `selectedDayOfWeek` can be `number | null` in the existing code, but the call is inside a JSX guard `selection && selectedDayOfWeek != null && selectedSlot != null && ...` so by that point it's `number`.

All checks pass.
