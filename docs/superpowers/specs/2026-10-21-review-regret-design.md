# Review "Which Blocks Weren't Worth It" — Design Spec

**Date:** 2026-10-21
**Status:** Implemented
**Backlog item:** `docs/product-core.md` §九 #3 (回顧頁改問「哪幾格不值得」)

## Summary

Completion rate is a poor proxy for whether a week went well (§五). The
review now ends with the question that is: **which blocks weren't worth it?**
And its answer feeds straight into next week (④ → ①) without asking for any
new planning decision — removing is an order of magnitude cheaper than adding.

## Decisions

| Topic | Decision |
|-------|----------|
| Where | Last section of the weekly review: a 7×6 grid of that week's blocks. Clicking a block toggles "不值得". The header counts them in blocks and hours (a block ≈ 2 hours). |
| Storage | `blocks.regretted boolean` (migration 015), on the block itself. Marking a rhythm cell that was never written to materializes it first. |
| Feeding next week, copy | "Copy from the most recent week" skips regretted blocks — no extra step. |
| Promoting a week to the rhythm | Regretted blocks are left out, like suppressed ones — they should not come back every week. |
| Feeding next week, rhythm | When regretted blocks are still what the newest rhythm puts in those slots (same title and type), the review offers one button: drop them from the rhythm. It adopts a new rhythm version without those slots, effective next week like any rhythm change. |
| Completion stats | Kept above for now; the regret question is what the review ends on. |

## Out of scope

- Asking "which direction to pull back next week" (part of the long-term
  direction item, §九 #5).
- Marking regret from the dashboard.
