# Range Naming — Design Spec

**Date:** 2026-10-21
**Status:** Implemented
**Backlog item:** `docs/product-core.md` §九 #2 (區間框選命名)

## Summary

Name a whole block of the week in one decision. Today every cell is its own
decision (open panel → pick type → type title → save), so "上班, Mon–Fri,
slots 2–4" costs 15 decisions. With range naming it costs one: select the
rectangle, pick a type, type the title, apply.

Pure UI plus one batch write — no data-model change.

## Decisions

| Topic | Decision |
|-------|----------|
| Gesture | Desktop week grid: **Shift+click** a second cell selects the rectangle between it and the selected cell; clicking a **day header** selects that whole day. Mobile day view is out of scope. |
| Discoverability | The single-cell side panel shows a one-line hint about Shift+click (desktop only). |
| What a range sets | Block type and title only. Existing blocks keep their status, description, subtasks, timer and links; empty and rhythm-projected cells become new planned blocks; suppressed cells are filled (suppression lifted). |
| Write path | `NameSlotsUseCase` builds every block from the week's stored rows and writes them with one `BlockRepository.saveAll` (upsert by id). One `getOrCreateWeekPlan` per range, so concurrent per-cell saves cannot race on creating the week plan. |
| Today's plan lock | Renaming existing blocks on a locked day asks for one reason for the whole range and logs an `edit` per affected cell. Filling empty cells on a locked day is logged as `add` with an empty reason, like a single add. |
| After applying | The panel closes and a toast reports how many cells were named. |

## Out of scope

- Range selection on the mobile day view.
- Range delete / range status change.
- A row header (Shift+click across a row covers it).
