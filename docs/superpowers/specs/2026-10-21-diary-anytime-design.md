# Diary Without Friction — Design Spec

**Date:** 2026-10-21
**Status:** Implemented
**Backlog item:** `docs/product-core.md` §九 #7 (放寬日記補寫窗；日記給一個不需要先選 block 的入口)

## Summary

The diary is step ③ of the loop and the fuel for the review, but it was
treated as an accessory: hidden at the bottom of the side panel, reachable
only by picking a block first, and locked for good once a day passed.

## Decisions

| Topic | Decision |
|-------|----------|
| Writable days | Every day of the current week up to today, plus yesterday until 08:00 (so Sunday's entry survives into Monday morning). Earlier days are read-only; later days are hidden. `diaryModeFor` holds the rule. |
| Entry point | A "日記" button in the header opens a diary panel for the viewed week: one tab per day, starting on today's diary day (yesterday before 08:00). Picking a block closes it, and opening it clears the block selection. |
| Side panel | Keeps its per-day diary, now under the same rule. |
