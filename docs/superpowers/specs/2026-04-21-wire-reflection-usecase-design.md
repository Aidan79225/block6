# Wire `handleSaveReflection` Through `CreateWeekReviewUseCase` — Design Spec

## Overview

Migrate the review page's `handleSaveReflection` from a direct
`database.ts:upsertReflection` call to
`useCases.createWeekReview.execute(weekPlanId, text)`. Resolve
`weekKey → week_plans.id` once at the call site via `getOrCreateWeekPlan`
(same pattern as the saveBlock migration in PR #20).

Unlike prior write-path migrations (`updateStatus`, `saveDiary`,
`saveBlock`), the DB call for reflection lives at the page level
(`src/app/review/page.tsx:99`), not inside `AppStateProvider`.
`AppStateProvider.setReflection` only updates local state and is out of
scope.

Extends `ReflectionEditor` with a button guard that disables 儲存反思 when
the reflection text is empty after trim — mirrors the PR #18 fix for
`DiaryForm` and closes a UX regression that would otherwise arise from
`createWeekReview`'s non-empty requirement.

## Goals

- `handleSaveReflection` in `src/app/review/page.tsx` routes the logged-in
  DB write through `useCases.createWeekReview.execute(...)`.
- `ReflectionEditor` disables the 儲存反思 button when the textarea is
  empty after trim. Add a unit test.
- The logged-out branch (no `if (user)` call) remains unchanged.
- `pnpm lint && pnpm type-check && pnpm test` passes.

## Out of Scope

- `AppStateProvider.setReflection` (state-only, no DB call) — unchanged.
- `fetchReflection` read path — unchanged.
- `upsertReflection` export in `database.ts` — left intact (no other
  callers elsewhere, but a future hygiene sweep can delete it).
- Other review-page methods (diary, plan-changes log, task-time-ranking).
- Any other `AppStateProvider` method.

---

## Review page migration

In `src/app/review/page.tsx`:

### Imports

- **Add:** `useUseCases` from `@/presentation/providers/dependency-provider`.
- **Add:** `getOrCreateWeekPlan` from `@/infrastructure/supabase/database`.
- **Remove:** the existing `upsertReflection` import from the same module
  — it has no other call sites in this file.

### Component body

Add `const useCases = useUseCases();` alongside the other top-level hook
calls (`useAuth`, `useNotify`, `useWeekPlan`).

### `handleSaveReflection` replacement

Current (around line 96-104):

```tsx
const handleSaveReflection = (text: string) => {
  setReflection(text);
  if (user) {
    upsertReflection(user.id, weekKey, text).catch((err) => {
      console.error(err);
      notify.error("反思儲存失敗");
    });
  }
};
```

After:

```tsx
const handleSaveReflection = (text: string) => {
  setReflection(text);
  if (user) {
    getOrCreateWeekPlan(user.id, weekKey)
      .then((weekPlanId) =>
        useCases.createWeekReview.execute(weekPlanId, text),
      )
      .catch((err) => {
        console.error(err);
        notify.error("反思儲存失敗");
      });
  }
};
```

`handleSaveReflection` is a plain function declared inside the component,
not a `useCallback`, so no dependency array to update. The local
`setReflection` call (state setter from `useAppState`) runs first,
providing an instant optimistic UI update identical to the current
behavior.

---

## Button-guard change in `ReflectionEditor`

The use case calls `createWeekReview({...})`, which validates
`reflection.trim().length > 0` via the entity factory — matching PR #18's
diary validation. Without a button guard, a user who clears the textarea
and clicks 儲存反思 would trigger the "反思儲存失敗" error toast and see
their optimistic empty state disappear on reload (the create would throw
on the Supabase path, though an existing-row update would sneak through
because the use case's update branch bypasses the factory).

Mirror the PR #18 fix:

File: `src/presentation/components/review/reflection-editor.tsx`

Before the `return (...)` block, compute:

```tsx
const isValid = reflection.trim() !== "";
```

Change the button to:

```tsx
<button
  onClick={() => onSave(reflection)}
  disabled={!isValid}
  style={{
    marginTop: "12px",
    background: isValid ? "var(--color-accent)" : "var(--color-bg-tertiary)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: isValid ? "white" : "var(--color-text-muted)",
    padding: "8px 20px",
    cursor: isValid ? "pointer" : "not-allowed",
    fontSize: "14px",
    fontWeight: 600,
  }}
>
  儲存反思
</button>
```

### Test

Add a single unit test to
`src/__tests__/presentation/components/reflection-editor.test.tsx` (create
the file if it doesn't exist). The test asserts:

- Initial empty reflection → button disabled.
- Whitespace-only reflection → button disabled.
- Typed value → button enabled.
- After typing, clearing, button returns to disabled.

No other tests are added.

---

## Acknowledged behavioral differences

- **Empty-reflection save is now blocked at the button.** Previously
  clearing the textarea and clicking 儲存反思 would silently wipe the row
  in Supabase. Now the button is disabled so the clear action can't be
  initiated from the UI. Users who want to delete an existing reflection
  can still do so by leaving a whitespace character — no, scratch that:
  whitespace is also caught. A follow-up PR can add an explicit "delete
  reflection" affordance if deletion is a real user need. For now this
  matches the DiaryForm convention.

- **Use-case path runs 2-3 queries per save** (week_plans lookup/create +
  week_reviews SELECT + INSERT/UPDATE). Previously `upsertReflection`
  internally chained the same operations. No net roundtrip change.

- **Optimistic state update** (`setReflection(text)` before the async
  chain) is preserved identically.

---

## Testing

- New unit test for the button-disabled state in
  `reflection-editor.test.tsx` (or extend an existing file if one
  exists).
- Existing 132 tests remain green — none exercise `AppStateProvider`
  state or the review page's `handleSaveReflection`.
- Manual verification (plan Task):
  1. Logged-in: type a reflection, save, reload. Content persists.
  2. Logged-in: edit an existing reflection, save, reload. Updated content
     persists.
  3. Logged-in: try to save with an empty textarea. Button is disabled.
  4. Logged-out: type a reflection, save, reload. Content persists via
     localStorage.

---

## Affected Files

- Modify: `src/app/review/page.tsx` — swap imports and migrate
  `handleSaveReflection`.
- Modify: `src/presentation/components/review/reflection-editor.tsx` —
  disable button when empty + apply disabled styling.
- Create: `src/__tests__/presentation/components/reflection-editor.test.tsx`
  — one test covering the disabled-state matrix.

No DB migrations. No repository, use case, or entity changes. No
`AppStateProvider` change.

## Branch

`refactor/wire-reflection-usecase` (to be created).
