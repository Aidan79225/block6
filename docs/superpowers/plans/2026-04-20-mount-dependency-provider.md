# Mount DependencyProvider + Migrate `updateStatus` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount `DependencyProvider` into the production tree and route `AppStateProvider.updateStatus` (logged-in branch) through `UpdateBlockStatusUseCase`.

**Architecture:** A new `ProductionDependencyProvider` client component instantiates the four Supabase repos and wraps `DependencyProvider`. It mounts between `AuthProvider` and `AppStateProvider` in `app/layout.tsx`. Inside `AppStateProvider`, the logged-in branch of `updateStatus` replaces its direct `updateBlockStatus(blockId, status)` call with `useCases.updateBlockStatus.execute(...)`.

**Tech Stack:** Next.js App Router (server + client components), TypeScript strict, React context, Vitest. No new runtime dependencies. No DB migrations.

**Prerequisite:** Be on branch `refactor/wire-update-status-usecase` (`git checkout -b refactor/wire-update-status-usecase` before Task 1).

---

## File Structure

```
src/
  app/
    layout.tsx                                                          (modify)
  presentation/
    providers/
      production-dependency-provider.tsx                                (create)
      app-state-provider.tsx                                            (modify)
```

No new test files. No DB changes.

---

## Task 1: Create `ProductionDependencyProvider` and mount it in `layout.tsx`

**Files:**
- Create: `src/presentation/providers/production-dependency-provider.tsx`
- Modify: `src/app/layout.tsx`

### Step 1: Create the wrapper component

Create `src/presentation/providers/production-dependency-provider.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { DependencyProvider } from "@/presentation/providers/dependency-provider";
import { SupabaseBlockRepository } from "@/infrastructure/supabase/repositories/supabase-block-repository";
import { SupabaseDiaryRepository } from "@/infrastructure/supabase/repositories/supabase-diary-repository";
import { SupabaseWeekPlanRepository } from "@/infrastructure/supabase/repositories/supabase-week-plan-repository";
import { SupabaseWeekReviewRepository } from "@/infrastructure/supabase/repositories/supabase-week-review-repository";

export function ProductionDependencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repositories = useMemo(
    () => ({
      blockRepo: new SupabaseBlockRepository(),
      diaryRepo: new SupabaseDiaryRepository(),
      weekPlanRepo: new SupabaseWeekPlanRepository(),
      weekReviewRepo: new SupabaseWeekReviewRepository(),
    }),
    [],
  );

  return (
    <DependencyProvider repositories={repositories}>
      {children}
    </DependencyProvider>
  );
}
```

### Step 2: Insert it into `layout.tsx`

Open `src/app/layout.tsx`. Current contents around the provider stack (lines 1–28):

```tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import { AppStateProvider } from "@/presentation/providers/app-state-provider";
import { NotificationProvider } from "@/presentation/providers/notification-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Block 6",
  description: "6區塊黃金比例時間分配法",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-theme="dark" suppressHydrationWarning>
      <body>
        <NotificationProvider>
          <AuthProvider>
            <AppStateProvider>{children}</AppStateProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
```

Replace with:

```tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import { AppStateProvider } from "@/presentation/providers/app-state-provider";
import { NotificationProvider } from "@/presentation/providers/notification-provider";
import { ProductionDependencyProvider } from "@/presentation/providers/production-dependency-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Block 6",
  description: "6區塊黃金比例時間分配法",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-theme="dark" suppressHydrationWarning>
      <body>
        <NotificationProvider>
          <AuthProvider>
            <ProductionDependencyProvider>
              <AppStateProvider>{children}</AppStateProvider>
            </ProductionDependencyProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
```

### Step 3: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. (No tests mount `AppStateProvider` or `layout.tsx`, so nothing should change in test output; this is a pure additive wiring.)

### Step 4: Commit

```bash
git add src/presentation/providers/production-dependency-provider.tsx src/app/layout.tsx
git commit -m "feat: mount DependencyProvider via ProductionDependencyProvider"
```

---

## Task 2: Migrate `AppStateProvider.updateStatus` to the use case

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

### Step 1: Add the `useUseCases` import

Near the other provider imports at the top of `src/presentation/providers/app-state-provider.tsx`, add:

```typescript
import { useUseCases } from "@/presentation/providers/dependency-provider";
```

### Step 2: Remove the now-unused `updateBlockStatus` import

In the same file, find the multi-line import block from `@/infrastructure/supabase/database`. It currently includes `updateBlockStatus`:

```typescript
import {
  fetchBlocksForWeek,
  upsertBlock,
  updateBlockStatus,
  fetchDiary,
  upsertDiary,
  ...
} from "@/infrastructure/supabase/database";
```

Delete the `updateBlockStatus,` line only. The rest of the import block stays.

### Step 3: Call `useUseCases()` inside the provider

Find the top of the `AppStateProvider` function (currently `app-state-provider.tsx:291`). Near the other top-level hook calls (`useAuth`, `useNotify`, `useSyncExternalStore`), add:

```typescript
const useCases = useUseCases();
```

Place it alongside `const { user, loading: authLoading } = useAuth();` and `const notify = useNotify();`. The exact order is not important — just keep all hook calls at the top of the component body.

### Step 4: Replace the call site inside `updateStatus`

Find the `updateStatus` `useCallback` (around `app-state-provider.tsx:569-589`). Current logged-in branch:

```tsx
const updateStatus = useCallback(
  (blockId: string, status: BlockStatus) => {
    if (user) {
      setSupaBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        ),
      );
      updateBlockStatus(blockId, status).catch((err) => {
        console.error(err);
        notify.error("狀態更新失敗");
      });
    } else {
      const current = loadFromStorage();
      current.blocks = current.blocks.map((b) =>
        b.id === blockId ? createBlock({ ...b, status }) : b,
      );
      saveToStorage(current);
    }
  },
  [user, notify],
);
```

Replace with:

```tsx
const updateStatus = useCallback(
  (blockId: string, status: BlockStatus) => {
    if (user) {
      setSupaBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        ),
      );
      useCases.updateBlockStatus.execute(blockId, status).catch((err) => {
        console.error(err);
        notify.error("狀態更新失敗");
      });
    } else {
      const current = loadFromStorage();
      current.blocks = current.blocks.map((b) =>
        b.id === blockId ? createBlock({ ...b, status }) : b,
      );
      saveToStorage(current);
    }
  },
  [user, notify, useCases],
);
```

Two changes: the `updateBlockStatus(...)` call becomes `useCases.updateBlockStatus.execute(...)`, and the dependency array gains `useCases`.

### Step 5: Run the full check suite

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all 128 tests pass. Type-check must succeed — if it complains about the removed `updateBlockStatus` import, something else in the file is still using it; search for any remaining `updateBlockStatus(` references in `app-state-provider.tsx` and verify they come from `useCases.updateBlockStatus` (which is allowed) and not the bare function (which is the one being removed).

### Step 6: Commit

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "refactor: route updateStatus through UpdateBlockStatusUseCase"
```

---

## Task 3: Manual verification + push + PR

### Step 1: Start dev server and smoke-test

```bash
pnpm dev
```

Test scenarios (requires a test Supabase account you can log in with):

1. **Logged-in status toggle.** Log in. Click a block's status toggle (planned → completed). Expected: the UI updates immediately. Reload the page. Expected: the status persisted; the block still shows completed.
2. **Logged-out status toggle.** Log out (or use an incognito window). Toggle a block's status on a local/demo block. Expected: UI updates immediately. Reload. Expected: the status persisted via localStorage.
3. **No console errors.** While toggling, open devtools → Network tab. Expect to see a SELECT + UPDATE pair to the Supabase REST API for the logged-in path (instead of the previous single UPDATE). No 4xx/5xx responses.

### Step 2: Push

```bash
git push -u origin refactor/wire-update-status-usecase
```

### Step 3: Open PR

```bash
gh pr create --title "refactor: wire updateStatus through UpdateBlockStatusUseCase" --body "$(cat <<'EOF'
## Summary

- Add \`ProductionDependencyProvider\` client wrapper that constructs the four Supabase repos and renders \`DependencyProvider\`.
- Mount \`ProductionDependencyProvider\` between \`AuthProvider\` and \`AppStateProvider\` in \`app/layout.tsx\`.
- Route the logged-in branch of \`AppStateProvider.updateStatus\` through \`useCases.updateBlockStatus.execute(...)\` (delegating to \`SupabaseBlockRepository\` and \`UpdateBlockStatusUseCase\`) instead of calling \`database.ts:updateBlockStatus\` directly.
- Remove the now-unused \`updateBlockStatus\` import in \`AppStateProvider\`.

## What this unblocks

Sub-project #3+ can migrate additional methods (\`saveBlock\`, \`saveDiary\`, etc.) to use cases with the wiring already in place.

## Behavioral difference

The use-case path runs two Supabase queries per status toggle (SELECT by id, then UPDATE) versus the previous single UPDATE. Functionally equivalent because \`updateBlockRow\` writes every mutable column.

## Scope discipline

- Logged-out branch unchanged.
- Optimistic state update unchanged.
- Error handling unchanged.
- No other \`AppStateProvider\` methods migrated.
- \`DependencyProvider\` itself not modified.
- No new tests (the wiring is best verified by manual smoke-test plus the existing use-case and in-memory-repo tests).

## Test plan

- [x] \`pnpm lint\` passes
- [x] \`pnpm type-check\` passes
- [x] \`pnpm test\` passes (128/128)
- [x] Manual: logged-in status toggle persists across reload; logged-out status toggle persists via localStorage; no console errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Create `ProductionDependencyProvider` client wrapper — Task 1, Step 1 ✓
- Mount it in `layout.tsx` between `AuthProvider` and `AppStateProvider` — Task 1, Step 2 ✓
- `DependencyProvider` itself not modified — enforced by only touching new file + layout + AppStateProvider ✓
- Call `useUseCases()` inside `AppStateProvider` — Task 2, Step 3 ✓
- Replace `updateBlockStatus(blockId, status)` call with `useCases.updateBlockStatus.execute(...)` in the logged-in branch — Task 2, Step 4 ✓
- Logged-out branch unchanged — preserved verbatim in the replacement snippet ✓
- Remove unused import — Task 2, Step 2 ✓
- Update the `useCallback` dependency array — Task 2, Step 4 ✓
- No new tests — plan deliberately omits ✓
- Manual verification scenarios — Task 3, Step 1 ✓
- No `PlanChangeRepository` wiring — plan doesn't touch `DependencyProvider` ✓

### 2. Placeholder scan

No TBD / TODO / vague references. All code blocks concrete.

### 3. Type consistency

- `ProductionDependencyProvider`'s constructed `repositories` object matches `DependencyProvider`'s `Repositories` interface exactly: `{ blockRepo, diaryRepo, weekPlanRepo, weekReviewRepo }`. Verified against the current `dependency-provider.tsx:24-29`.
- `useUseCases()` returns the `UseCases` type; `useCases.updateBlockStatus` is `UpdateBlockStatusUseCase` whose `.execute(blockId: string, status: BlockStatus)` matches the `(blockId, status)` call in the replacement.
- `BlockStatus` values already in scope from `@/domain/entities/block` (existing import in `app-state-provider.tsx:15`).
- Removing `updateBlockStatus` from the import list requires no other change because grep confirms the only usage is on `app-state-provider.tsx:577` (the line being replaced).

All checks pass.
