# Mount DependencyProvider + Migrate `updateStatus` — Design Spec

## Overview

Sub-project #2 of the "wire DependencyProvider + route UI through use cases"
architecture work. Mounts the previously-dormant `DependencyProvider` in the
layout tree and migrates a single `AppStateProvider` method —
`updateStatus` — so that the logged-in write goes through
`UpdateBlockStatusUseCase` → `SupabaseBlockRepository` → `database.ts`
instead of calling `database.ts` directly.

`updateStatus` is chosen because it is the simplest logged-in write path:
takes only `(blockId, status)`, does not involve the `weekPlanId`
UUID-vs-weekKey ambiguity that the prior spec flagged for future work, and
is the smallest viable vertical slice that proves the end-to-end wiring
works.

## Goals

- `DependencyProvider` mounted and reachable via `useUseCases()` inside
  `AppStateProvider` and below.
- `AppStateProvider.updateStatus`'s logged-in branch calls
  `useCases.updateBlockStatus.execute(blockId, status)` instead of the
  direct `updateBlockStatus(blockId, status)` import from `database.ts`.
- The logged-out branch of `updateStatus` is unchanged (still writes to
  localStorage).
- `pnpm lint && pnpm type-check && pnpm test` passes. No new tests.

## Out of Scope

- Migrating any other `AppStateProvider` method (`saveBlock`, `saveDiary`,
  subtasks, timers, etc.). Those get their own future sub-projects.
- Resolving the `Block.weekPlanId` UUID-vs-weekKey mismatch. The
  `updateBlockStatus` use case does not need `weekPlanId`, so the issue
  stays deferred.
- Adding `PlanChangeRepository` to `DependencyProvider`. No use case
  consumes it yet; sub-project #4 will decide.
- Building any LocalStorage-backed repos. The logged-out path continues to
  call `loadFromStorage` / `saveToStorage` directly from `AppStateProvider`.

---

## Architecture

### Mounting — why a wrapper component

`src/app/layout.tsx` is a server component. The Supabase client
(`src/infrastructure/supabase/client.ts`) and the `Supabase*Repository`
classes are only intended to run in the browser. We therefore introduce a
thin client-only wrapper that instantiates the repos and hands them to
`DependencyProvider`.

New file: `src/presentation/providers/production-dependency-provider.tsx`
(note the `"use client"` directive).

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

`useMemo([])` ensures the repos are constructed once per mount, not per
render. `DependencyProvider` itself already memoizes the use-case
instances off the `repositories` reference.

### Layout change

Insert `ProductionDependencyProvider` between `AuthProvider` and
`AppStateProvider` in `src/app/layout.tsx`:

```tsx
<NotificationProvider>
  <AuthProvider>
    <ProductionDependencyProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </ProductionDependencyProvider>
  </AuthProvider>
</NotificationProvider>
```

Why below `AuthProvider`: the current use cases don't actually need the
auth session (the repos are stateless and operate on explicit IDs), but
keeping `DependencyProvider` inside the auth subtree preserves the option
for future repos that do (e.g., if a repo ever takes `userId` in its
constructor).

Why above `AppStateProvider`: `AppStateProvider` is the consumer of the
use cases.

### `AppStateProvider` change

At the top of `AppStateProvider`, alongside the other hook calls (`useAuth`,
`useNotify`), add:

```tsx
const useCases = useUseCases();
```

In `updateStatus` (currently `app-state-provider.tsx:569-589`), the
logged-in branch changes a single call. Before:

```tsx
updateBlockStatus(blockId, status).catch((err) => {
  console.error(err);
  notify.error("狀態更新失敗");
});
```

After:

```tsx
useCases.updateBlockStatus.execute(blockId, status).catch((err) => {
  console.error(err);
  notify.error("狀態更新失敗");
});
```

The `useCallback` dependency array gains `useCases` (becomes `[user, notify, useCases]`).

Everything else — optimistic state update, logged-out branch, error
handling, the imports at the top of the file — stays. The
`updateBlockStatus` import from `@/infrastructure/supabase/database` is no
longer used by `updateStatus`. If it has no other callers in the file, it
is removed; otherwise it stays.

### Behavioral difference

`UpdateBlockStatusUseCase.execute` internally does:

```typescript
const existing = await this.repo.findById(blockId);
if (!existing) throw new Error("Block not found");
const updated: Block = { ...existing, status };
await this.repo.update(updated);
return updated;
```

This is two Supabase queries (SELECT then UPDATE) versus the current
one-query UPDATE-by-id in `database.ts:updateBlockStatus`. Functionally
equivalent — the UPDATE path (after the recent ultrareview fix) writes
every mutable column, so the resulting row is the same.

The use case returns the updated `Block`. `AppStateProvider` currently
fires the call and doesn't await or read the return; this PR preserves
that — the optimistic state set earlier in the same callback is authoritative
for React state.

**One caveat about the returned Block's `weekPlanId`.** The use case goes
through `SupabaseBlockRepository.findById` → `dbBlockToEntity`, which
returns a `Block` whose `weekPlanId` is the real DB UUID. The
`AppStateProvider`'s in-memory `supaBlocks` hold blocks whose `weekPlanId`
is the weekKey (due to the `fetchBlocksForWeek` hack). Because
`AppStateProvider` discards the use case's return value, this divergence
is not observable in this PR. Sub-project #3/#4, which will unify these
semantics, owns that reconciliation.

---

## Testing

No new automated tests. The existing 128 tests stay green. Rationale:

- `UpdateBlockStatusUseCase` is already tested in
  `src/__tests__/domain/usecases/update-block-status.test.ts` with an
  inline mock repo.
- `SupabaseBlockRepository.update` is a thin adapter. Testing it requires
  mocking `@supabase/supabase-js` or hitting a live DB — either is more
  effort than the test catches.
- An integration test mounting the full provider tree would need a mocked
  auth session and Supabase client; the setup cost is disproportionate to
  the single-method migration.

Manual verification (first task in the plan executes this before PR):

1. Logged-in path: toggle a block's status in the UI; the status updates
   optimistically, and the Supabase `blocks.status` column reflects the
   change after a page reload.
2. Logged-out path: toggle a block's status; localStorage persists the
   change across reload. No network request fires for this path.
3. Error path (optional, skip if hard to simulate): temporarily disconnect
   from the network, toggle status; the notification "狀態更新失敗" fires
   and the optimistic state is not rolled back — matching the existing
   (pre-migration) behavior.

---

## Affected Files

- Create: `src/presentation/providers/production-dependency-provider.tsx`
- Modify: `src/app/layout.tsx` — insert `ProductionDependencyProvider` in
  the provider stack.
- Modify: `src/presentation/providers/app-state-provider.tsx` — call
  `useUseCases()` at the top; replace one `updateBlockStatus(...)` call
  inside `updateStatus`; update the `useCallback` dependency array;
  possibly remove the now-unused `updateBlockStatus` import.

No other files change. No DB migrations. `DependencyProvider` itself is
not modified.

## Branch

`refactor/wire-update-status-usecase` (to be created).
