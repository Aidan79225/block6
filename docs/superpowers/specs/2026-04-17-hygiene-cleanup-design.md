# Hygiene Cleanup — Design Spec

## Overview

Delete two leftover Phase A hook files that are no longer imported anywhere:

- `src/presentation/hooks/use-blocks.ts` (51 lines)
- `src/presentation/hooks/use-diary.ts` (28 lines)

Both provided in-memory state for blocks and diary entries during early Phase A
development. That responsibility has since been fully absorbed into
`AppStateProvider`, which is now the single source of truth for both. The
hooks remain as dead files, each only referenced inside themselves.

## Goals

- Remove the dead files.
- Keep `pnpm lint && pnpm type-check && pnpm test` passing.
- Leave all surviving state management untouched.

## Out of Scope

- Removing or restructuring the legacy localStorage migration path in
  `src/presentation/providers/app-state-provider.tsx:134-155`, which still
  reads the old `line1/line2/line3` diary shape. Any user who hasn't opened the
  app since the rename would lose their diary entries otherwise, and the cost
  of keeping ~20 lines of migration code forever is minimal.
- Renaming `line1/line2/line3` anywhere else — the current state already uses
  `bad/good/next` everywhere except the migration path.
- Any other cleanup work from the project-improvements audit (date helpers,
  architecture wiring, etc.) — those get their own specs.

---

## Verification (pre-delete)

Repeated to confirm scope:

- `grep` for `useBlocks` / `use-blocks` across `src/` returns only
  `use-blocks.ts` itself.
- `grep` for `useDiary` / `use-diary` across `src/` returns only
  `use-diary.ts` itself.
- `glob` for `**/*use-blocks*` and `**/*use-diary*` returns only the hook
  files themselves — no test files exist for either.

---

## Affected Files

- Delete: `src/presentation/hooks/use-blocks.ts`
- Delete: `src/presentation/hooks/use-diary.ts`

No other files change.

## Branch

`chore/delete-unused-hooks` (to be created).
