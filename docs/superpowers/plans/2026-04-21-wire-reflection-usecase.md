# Wire `handleSaveReflection` Through `CreateWeekReviewUseCase` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the review page's reflection save through `CreateWeekReviewUseCase`, and add a client-side button guard in `ReflectionEditor` to prevent empty submissions.

**Architecture:** `src/app/review/page.tsx:handleSaveReflection` currently calls `database.ts:upsertReflection` directly. This migrates it to `useCases.createWeekReview.execute(weekPlanId, text)`, resolving `weekKey → UUID` once via `getOrCreateWeekPlan`. `ReflectionEditor` gains a `disabled={!isValid}` guard so users can't submit empty/whitespace text through the use case's non-empty requirement — mirrors the PR #18 DiaryForm fix.

**Tech Stack:** TypeScript strict, React, Vitest + React Testing Library. No new runtime dependencies. No DB migrations.

**Prerequisite:** Be on branch `refactor/wire-reflection-usecase` (`git checkout -b refactor/wire-reflection-usecase` before Task 1).

---

## File Structure

```
src/
  app/
    review/
      page.tsx                                                          (modify)
  presentation/
    components/
      review/
        reflection-editor.tsx                                           (modify)
  __tests__/
    presentation/
      components/
        reflection-editor.test.tsx                                      (create)
```

No DB changes. No use case / repo / entity changes.

---

## Task 1: Add button guard to `ReflectionEditor` (TDD)

**Files:**
- Create: `src/__tests__/presentation/components/reflection-editor.test.tsx`
- Modify: `src/presentation/components/review/reflection-editor.tsx`

### Step 1: Write the failing test file

Create `src/__tests__/presentation/components/reflection-editor.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReflectionEditor } from "@/presentation/components/review/reflection-editor";

describe("ReflectionEditor", () => {
  it("disables 儲存反思 button when reflection is empty or whitespace", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ReflectionEditor reflection="" onSave={() => {}} />,
    );
    const button = () => screen.getByRole("button", { name: /儲存反思/ });

    expect(button()).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "a real reflection");
    expect(button()).not.toBeDisabled();

    await user.clear(screen.getByRole("textbox"));
    expect(button()).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "   ");
    expect(button()).toBeDisabled();

    rerender(<ReflectionEditor reflection="from props" onSave={() => {}} />);
    expect(button()).not.toBeDisabled();
  });
});
```

### Step 2: Run the test — verify it fails

```bash
pnpm test src/__tests__/presentation/components/reflection-editor.test.tsx
```

Expected: the "disables 儲存反思 button when reflection is empty or whitespace" test fails — the button is always enabled in the current implementation.

### Step 3: Modify the component

Open `src/presentation/components/review/reflection-editor.tsx`. Current file:

```tsx
"use client";
import { useState } from "react";

interface ReflectionEditorProps {
  reflection: string;
  onSave: (reflection: string) => void;
}

export function ReflectionEditor({
  reflection: initialReflection,
  onSave,
}: ReflectionEditorProps) {
  const [reflection, setReflection] = useState(initialReflection);
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "12px",
        }}
      >
        週反思
      </h3>
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="回顧這一週，記錄你的感想和下週的改進方向..."
        rows={6}
        style={{
          width: "100%",
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "12px",
          fontSize: "14px",
          resize: "vertical",
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={() => onSave(reflection)}
        style={{
          marginTop: "12px",
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          padding: "8px 20px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        儲存反思
      </button>
    </div>
  );
}
```

Replace with:

```tsx
"use client";
import { useState } from "react";

interface ReflectionEditorProps {
  reflection: string;
  onSave: (reflection: string) => void;
}

export function ReflectionEditor({
  reflection: initialReflection,
  onSave,
}: ReflectionEditorProps) {
  const [reflection, setReflection] = useState(initialReflection);
  const isValid = reflection.trim() !== "";
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "12px",
        }}
      >
        週反思
      </h3>
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="回顧這一週，記錄你的感想和下週的改進方向..."
        rows={6}
        style={{
          width: "100%",
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "12px",
          fontSize: "14px",
          resize: "vertical",
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={() => onSave(reflection)}
        disabled={!isValid}
        style={{
          marginTop: "12px",
          background: isValid
            ? "var(--color-accent)"
            : "var(--color-bg-tertiary)",
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
    </div>
  );
}
```

### Step 4: Run the tests — verify pass

```bash
pnpm test src/__tests__/presentation/components/reflection-editor.test.tsx
```

Expected: test passes.

### Step 5: Run the full suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass; test count is now 133 (132 baseline + 1 new test).

### Step 6: Commit

```bash
git add src/__tests__/presentation/components/reflection-editor.test.tsx src/presentation/components/review/reflection-editor.tsx
git commit -m "feat: disable ReflectionEditor save button when reflection is empty"
```

---

## Task 2: Migrate `handleSaveReflection` to `CreateWeekReviewUseCase`

**Files:**
- Modify: `src/app/review/page.tsx`

### Step 1: Update imports

In `src/app/review/page.tsx`, current database import (line 15):

```tsx
import { upsertReflection } from "@/infrastructure/supabase/database";
```

Replace with:

```tsx
import { getOrCreateWeekPlan } from "@/infrastructure/supabase/database";
```

Elsewhere near the other provider imports (alongside `useAuth`, `useAppState`, `useNotify`, `useWeekPlan`), add:

```tsx
import { useUseCases } from "@/presentation/providers/dependency-provider";
```

### Step 2: Call `useUseCases()` inside the component

Near the other top-level hook calls at the start of `ReviewPage` (around lines 24-26, where `useAuth`, `useNotify`, `useWeekPlan` are already called), add:

```tsx
const useCases = useUseCases();
```

### Step 3: Replace `handleSaveReflection` body

Find (around lines 96-104):

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

Replace with:

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

### Step 4: Verify no stale references

```bash
grep -n "upsertReflection" src/app/review/page.tsx
```

Expected: zero matches.

```bash
grep -n "getOrCreateWeekPlan\|useUseCases\|createWeekReview" src/app/review/page.tsx
```

Expected: at least three matches — the imports plus the chain inside `handleSaveReflection`.

### Step 5: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all 133 tests pass.

### Step 6: Commit

```bash
git add src/app/review/page.tsx
git commit -m "refactor: route reflection save through CreateWeekReviewUseCase"
```

---

## Task 3: Manual verification + push + PR

### Step 1: Start dev server

```bash
pnpm dev
```

### Step 2: Verify

1. **Logged-in create.** Log in, go to `/review` (or wherever the review page is). Type a new reflection, click 儲存反思. Reload — content persists from Supabase.
2. **Logged-in edit.** Change an existing reflection, click 儲存反思. Reload — updated content persists.
3. **Empty guard.** Clear the textarea — the 儲存反思 button becomes visibly disabled (greyed out, not-allowed cursor) and clicking does nothing. No error toast.
4. **Whitespace guard.** Type only spaces — button still disabled.
5. **Logged-out.** In an incognito window or logged out, write a reflection and click 儲存反思. Reload — persists via localStorage. No network call fires.
6. **Network inspection.** On a logged-in save, Network tab shows: lookup/insert on `week_plans`, SELECT on `week_reviews`, INSERT or UPDATE on `week_reviews`. No other endpoints hit.

### Step 3: Push

```bash
git push -u origin refactor/wire-reflection-usecase
```

### Step 4: Open PR

```bash
gh pr create --title "refactor: wire reflection save through CreateWeekReviewUseCase" --body "$(cat <<'EOF'
## Summary

- Route \`src/app/review/page.tsx:handleSaveReflection\` through \`useCases.createWeekReview.execute(...)\` instead of \`database.ts:upsertReflection\` directly.
- Resolve \`weekKey → week_plans.id\` once at the call site via \`getOrCreateWeekPlan\`.
- Disable 儲存反思 in \`ReflectionEditor\` when the textarea is empty or whitespace — mirrors the PR #18 DiaryForm fix to prevent an error-toast regression from \`createWeekReview\`'s non-empty requirement.
- Add one unit test covering the disabled-state matrix.

## Scope discipline

- \`AppStateProvider.setReflection\` (state only, no DB call) — unchanged.
- \`fetchReflection\` read path — unchanged.
- \`upsertReflection\` export in \`database.ts\` — left intact (dead code can be swept separately).
- No other review-page behavior touched.

## Behavioral difference

Empty-reflection saves are now blocked at the button. Previously a cleared textarea + click would silently wipe the row in Supabase; now the user can't submit empty text through the UI. If true deletion becomes a product need, a later PR can add an explicit affordance.

## Test plan

- [x] \`pnpm lint\` passes
- [x] \`pnpm type-check\` passes
- [x] \`pnpm test\` passes (133/133 — +1 new reflection-editor test)
- [x] Manual: logged-in save persists across reload; logged-out persists via localStorage; empty / whitespace disables the button.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 5: Merge when CI is green

```bash
gh pr merge <PR_NUMBER> --merge
git checkout master && git pull
```

---

## Self-Review

### 1. Spec coverage

- Add `useUseCases` + `getOrCreateWeekPlan` imports to `review/page.tsx` — Task 2, Step 1 ✓
- Drop `upsertReflection` import — Task 2, Step 1 ✓
- Call `const useCases = useUseCases();` in the page — Task 2, Step 2 ✓
- Replace `upsertReflection(...)` with `getOrCreateWeekPlan + useCases.createWeekReview.execute` chain in `handleSaveReflection` — Task 2, Step 3 ✓
- Disable 儲存反思 in `ReflectionEditor` on empty/whitespace — Task 1, Step 3 ✓
- New unit test covering the disabled-state matrix — Task 1, Step 1 ✓
- Logged-out branch unchanged (page's `if (user)` still guards) — preserved in Task 2, Step 3 replacement ✓
- `AppStateProvider.setReflection` unchanged — no task touches it ✓
- Manual verification scenarios — Task 3, Step 2 ✓

### 2. Placeholder scan

No TBD / TODO / vague references. Every code block is complete.

### 3. Type consistency

- `getOrCreateWeekPlan(userId: string, weekStart: string): Promise<string>` matches `handleSaveReflection`'s call with `user.id` + `weekKey`.
- `useCases.createWeekReview.execute(weekPlanId: string, reflection: string): Promise<WeekReview>` matches the chained call.
- `ReflectionEditor`'s prop interface (`{ reflection: string; onSave: (reflection: string) => void }`) is unchanged — no caller needs updates.
- `isValid: boolean` is a new local; no type collision.

All checks pass.
