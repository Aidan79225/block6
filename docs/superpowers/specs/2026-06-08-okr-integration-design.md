# OKR Integration — Design Spec

**Date:** 2026-06-08
**Status:** Approved (pending implementation plan)

## Summary

Introduce OKR (Objectives & Key Results) into BLOCK6 as a long-horizon goal layer
sitting **above** the existing week-centric system. Goals are organised into
custom-dated **cycles**; each cycle holds **Objectives**, each Objective holds
**Key Results (KRs)**. Weekly execution links upward: `WeeklyTask` and `Block` can
each be attached to a KR, so a KR shows both a manual numeric target/progress and
automatically-computed execution statistics for the cycle's date range.

This closes the loop: **long-term goal → weekly execution → progress visible on the OKR page.**

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Time horizon | Quarterly OKRs |
| Linkage | Full linkage — `WeeklyTask` and `Block` each carry an optional `keyResultId` |
| KR measurement | **Hybrid** — manual numeric target/current value **plus** auto stats (linked weekly-task completions + executed blocks) |
| Cycle range | Custom start/end dates per cycle |
| Grouping | Cycle groups multiple Objectives |
| Link UX | Choose KR from a dropdown while editing a weekly task / block |
| Stats computation | **Live computation** (no cached counters) — always accurate |
| Delivery scope | One spec covering the full feature (cycles + objectives + KRs + linkage + stats) |

## Architecture

Follows the existing Clean Architecture: domain entities + repository interfaces
(zero framework imports), Supabase + in-memory implementations in
`infrastructure/`, use cases injected via the dependency provider, React UI in
`presentation/`.

```
OkrCycle (name + start/end dates)
  └─ Objective
       └─ KeyResult (unit + targetValue/currentValue + live auto-stats)
              ↑ keyResultId
        WeeklyTask / Block
```

## 1. Domain Model

### New entities

```
OkrCycle
  id, userId, name, startDate: Date, endDate: Date, createdAt
  validation: name non-blank; endDate strictly after startDate

Objective
  id, cycleId, title, description, position, createdAt
  validation: title non-blank; position >= 0

KeyResult
  id, objectiveId, title, unit, targetValue, currentValue, position, createdAt
  validation: title non-blank; targetValue > 0; currentValue >= 0; position >= 0
  derived: manualProgress = clamp(currentValue / targetValue, 0..1)
```

### Modified entities

```
WeeklyTask  + keyResultId: string | null
Block       + keyResultId: string | null
```

### Computed value object (not persisted)

```
KeyResultProgress
  keyResultId
  manualProgress              // currentValue / targetValue, clamped 0..1
  linkedWeeklyTaskCount       // distinct weekly tasks attached to this KR
  weeklyTaskCompletionCount   // completions of those tasks whose week falls in cycle range
  linkedBlockCount            // blocks attached to this KR whose week falls in cycle range
  completedBlockCount         // of those, status === completed
```

Statistics count only weeks whose Monday falls within the cycle's
`startDate..endDate` range. Date comparisons use the existing `date-helpers`
`YYYY-MM-DD` string keys to avoid timezone issues.

## 2. Persistence

### New tables (3NF)

```sql
okr_cycles
  id uuid pk, user_id fk→users, name text, start_date date, end_date date, created_at timestamptz
  index (user_id)

objectives
  id uuid pk, cycle_id fk→okr_cycles ON DELETE CASCADE,
  title text, description text, position int, created_at timestamptz
  index (cycle_id)

key_results
  id uuid pk, objective_id fk→objectives ON DELETE CASCADE,
  title text, unit text, target_value numeric, current_value numeric,
  position int, created_at timestamptz
  index (objective_id)
```

### Altered tables

```sql
weekly_tasks  ADD COLUMN key_result_id uuid NULL  REFERENCES key_results(id) ON DELETE SET NULL
blocks        ADD COLUMN key_result_id uuid NULL  REFERENCES key_results(id) ON DELETE SET NULL
```

`ON DELETE SET NULL` ensures deleting a KR detaches linked tasks/blocks without
deleting them. Deleting a cycle cascades through Objectives and KRs.

### Repository interfaces (domain/repositories) + Supabase & in-memory impls

```
OkrCycleRepository    findForUser / findById / add / update / delete
ObjectiveRepository   findByCycle / add / update / delete / reorder
KeyResultRepository   findByObjective / findById / add / update
                      updateCurrentValue / delete / reorder
```

### Methods added to existing repositories (for live stats)

```
BlockRepository       + findByKeyResultInRange(keyResultId, startKey, endKey)
WeeklyTaskRepository  + findByKeyResult(keyResultId)
                      + countCompletionsByKeyResultInRange(keyResultId, startKey, endKey)
```

Block date filtering joins `blocks → week_plans.week_start`; weekly-task
completion filtering joins `weekly_task_completions → weekly_tasks(key_result_id)`.

## 3. Use Cases

### CRUD

```
CreateOkrCycleUseCase / UpdateOkrCycleUseCase / DeleteOkrCycleUseCase / ListOkrCyclesUseCase
CreateObjectiveUseCase / UpdateObjectiveUseCase / DeleteObjectiveUseCase / ReorderObjectivesUseCase
CreateKeyResultUseCase / UpdateKeyResultUseCase / UpdateKeyResultValueUseCase
  / DeleteKeyResultUseCase / ReorderKeyResultsUseCase
LinkWeeklyTaskToKeyResultUseCase   // set / clear WeeklyTask.keyResultId
LinkBlockToKeyResultUseCase        // set / clear Block.keyResultId
```

### Statistics (live computation)

```
GetCycleOkrViewUseCase(cycleId)
  1. Load cycle, its Objectives, each Objective's KRs.
  2. For each KR, compute KeyResultProgress over cycle.startDate..endDate:
       manualProgress            = clamp(currentValue / targetValue)
       linkedWeeklyTaskCount     = findByKeyResult(kr).length
       weeklyTaskCompletionCount = countCompletionsByKeyResultInRange(kr, start, end)
       linkedBlockCount          = findByKeyResultInRange(kr, start, end).length
       completedBlockCount       = those with status === completed
  3. Return tree: { cycle, objectives: [{ ...obj, keyResults: [{ ...kr, progress }] }] }
```

The page calls this single use case to render the whole cycle.

### Link-dropdown helper

```
ListKeyResultsForWeekUseCase(userId, weekStart)
  Find the cycle whose range covers this Monday; return its KRs flattened,
  each tagged with its Objective title (for grouped display).
  Returns empty list if the week is in no cycle.
```

## 4. UI (Presentation)

New route `src/app/okr/page.tsx`; Header gains an "OKR" entry link.

### Page layout

```
[Cycle selector]  — dropdown to switch cycle + "＋ New cycle"; shows date range
──────────────────────────────────────────
Objective card (collapsible)        [Edit] [Delete]
  ├─ KR row
  │   KR title                                  [⋮]
  │   ▓▓▓▓▓░░░░  6 / 12 本 (50%)   ← manual progress bar (click number to edit currentValue)
  │   🔗 weekly tasks 3 · completed 18 this cycle   ← auto stat (auxiliary)
  │   ⏱ blocks 20 planned · 14 executed            ← auto stat (auxiliary)
  │   ＋ New KR
  └─ ...
＋ New Objective
```

### Components (`presentation/components/okr/`)

```
okr-page-client.tsx          container; calls GetCycleOkrViewUseCase, holds state
cycle-selector.tsx           cycle switch + create/edit cycle dialog
objective-card.tsx           single Objective (collapse, edit, delete, reorder)
key-result-row.tsx           single KR: progress bar + two auto-stat lines
key-result-value-editor.tsx  inline edit of currentValue
```

### Link dropdown integration (edit-time, choice 1)

```
block-editor.tsx (side panel)      add "Attach to KR" dropdown
                                   (ListKeyResultsForWeekUseCase for that week; options grouped by
                                    Objective; includes "— none —"; save via LinkBlockToKeyResultUseCase)
weekly-checklist-panel.tsx         add "Attach to KR" dropdown when editing a weekly task
                                   (save via LinkWeeklyTaskToKeyResultUseCase)
```

### Data flow

`/okr` gets injected use cases via the existing `dependency-provider`. After
editing `currentValue` or changing a link, the page re-invokes
`GetCycleOkrViewUseCase` to refresh stats (live computation → always accurate).
Colours reuse existing CSS custom properties and the dark theme.

## 5. Testing (Vitest + in-memory repos)

```
domain/entities    okr-cycle / objective / key-result validation
                   (blank title, target<=0, start>=end, position<0)
                   + manualProgress clamp boundaries (0, >1)
domain/usecases    GetCycleOkrViewUseCase:
                     - only completions/blocks within the cycle range count (out-of-range excluded)
                     - completion counts accumulate across multiple tasks and weeks
                     - completedBlockCount counts only status=completed
                     - unlinked KR → all stats 0
                   ListKeyResultsForWeekUseCase: week inside / outside any cycle
                   Link*UseCase: set and clear (null)
infrastructure     in-memory CRUD for the 3 new repos + the new range-query methods;
                   Supabase impls aligned with existing test style
```

All domain logic is tested with in-memory repositories; tests never touch Supabase.

## File Overview (new / modified)

```
domain/entities/        okr-cycle.ts  objective.ts  key-result.ts  key-result-progress.ts
                        weekly-task.ts (+keyResultId)  block.ts (+keyResultId)
domain/repositories/    okr-cycle-repository.ts  objective-repository.ts  key-result-repository.ts
                        block-repository.ts (+1 method)  weekly-task-repository.ts (+2 methods)
domain/usecases/        ~16 use-case files (CRUD + Link + Get/List stats)
infrastructure/in-memory/   3 new repo impls (+ block / weekly-task repo method additions)
infrastructure/supabase/    3 new repo impls + database.ts query additions + migration SQL
presentation/components/okr/  5 components
presentation/components/side-panel/block-editor.tsx (+KR dropdown)
presentation/components/checklist/weekly-checklist-panel.tsx (+KR dropdown)
app/okr/page.tsx  +  header.tsx (+OKR entry)
providers/*dependency-provider.tsx (+ wire new use cases / repos)
docs schema doc synced with the new tables
```

## Out of Scope (YAGNI)

OKR end-of-cycle grading (0.0–1.0), copying goals across cycles, KR progress
history charts, team sharing / collaboration. Each would be a future spec.
