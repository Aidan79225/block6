# Hygiene Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete two unused Phase A hook files (`use-blocks.ts` and `use-diary.ts`) that are no longer imported anywhere.

**Architecture:** Pure deletion. Both hooks are only referenced inside themselves. The `AppStateProvider` already owns all block and diary state. The legacy `line1/line2/line3` localStorage migration in `app-state-provider.tsx:134-155` stays untouched.

**Tech Stack:** TypeScript, Next.js. No new dependencies, no DB changes.

**Prerequisite:** Be on branch `chore/delete-unused-hooks` (create it before Task 1: `git checkout -b chore/delete-unused-hooks`).

---

## File Structure

```
src/
  presentation/
    hooks/
      use-blocks.ts                                                     (delete)
      use-diary.ts                                                      (delete)
```

No new files. No files modified. No tests exist for either hook, so no test changes either.

---

## Task 1: Delete the two unused hook files

**Files:**
- Delete: `src/presentation/hooks/use-blocks.ts`
- Delete: `src/presentation/hooks/use-diary.ts`

- [ ] **Step 1: Re-verify neither hook is referenced outside itself**

```bash
grep -rn "useBlocks\|use-blocks" src/
grep -rn "useDiary\|use-diary" src/
```

Expected output:
- First command: only `src/presentation/hooks/use-blocks.ts` (the definition itself).
- Second command: only `src/presentation/hooks/use-diary.ts` (the definition itself).

If any other file shows up, STOP — the spec assumption is wrong. Report as BLOCKED.

- [ ] **Step 2: Delete both files**

```bash
git rm src/presentation/hooks/use-blocks.ts src/presentation/hooks/use-diary.ts
```

- [ ] **Step 3: Run the full check suite**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. (The tests that exist touch neither hook, and nothing imports them, so type-check and lint should produce no errors about missing modules.)

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete unused use-blocks and use-diary hooks"
```

---

## Task 2: Push and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin chore/delete-unused-hooks
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "chore: delete unused use-blocks and use-diary hooks" --body "$(cat <<'EOF'
## Summary

- Delete `src/presentation/hooks/use-blocks.ts` (51 lines) — leftover Phase A scaffolding, never imported.
- Delete `src/presentation/hooks/use-diary.ts` (28 lines) — also leftover Phase A scaffolding. Block and diary state both live in `AppStateProvider`.

The legacy `line1/line2/line3` → `bad/good/next` localStorage migration in `app-state-provider.tsx` is intentionally preserved so existing users don't lose diary entries.

## Test plan

- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm test` passes (unchanged count)
- [ ] App still builds and runs (`pnpm dev`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Delete `src/presentation/hooks/use-blocks.ts` — Task 1, Step 2 ✓
- Delete `src/presentation/hooks/use-diary.ts` — Task 1, Step 2 ✓
- Keep `pnpm lint && pnpm type-check && pnpm test` passing — Task 1, Step 3 ✓
- Leave migration path at `app-state-provider.tsx:134-155` untouched — enforced by only deleting the two hook files ✓
- No other cleanup work included — plan only touches the two files ✓

### 2. Placeholder scan

No TBD / TODO / vague references. All commands concrete.

### 3. Type consistency

No types introduced or modified. N/A.

All checks pass.
