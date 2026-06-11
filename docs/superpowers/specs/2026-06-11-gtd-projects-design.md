# GTD Projects — Design Spec

**Date:** 2026-06-11
**Status:** Approved (pending implementation plan)

## Summary

Add a lightweight GTD-style **Project** layer: a standalone, user-level project
(an outcome that needs multiple steps) holding an ordered **step checklist**.
Projects are **planned** on a dedicated `/projects` page; steps are **executed
and completed** only from the block side panel. A `Block` optionally attaches to
a single `Project`, and from that block you can tick off any of that project's
steps. A project may optionally reference a Key Result (display-only association).

This complements the existing system: OKR (cycles/objectives/KRs + linkage) stays
the measurable/recurring side; Projects cover one-time, multi-step outcomes with
an explicit step checklist.

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Project scope | Standalone, user-level, no deadline; optional `keyResultId` link |
| KR link semantics | Display-only association — does **not** auto-move KR values; OKR block stats stay independent (only count `Block.keyResultId`) |
| Step capability | Steps are checklist items; a step may span multiple work sessions |
| Plan vs execute | Steps planned on `/projects`; completion toggled **only** in the block side panel |
| Block ↔ step | A block attaches to one **Project** (`Block.projectId`); within that block you can complete **multiple** of that project's steps. No block↔step join table. |
| Step spanning blocks | `ProjectStep.completed` is an independent flag, decoupled from any block's status; one step can be worked across many blocks (each linked to the same project) |
| Unscheduled step | A step in a project with no linked block has nowhere to be completed — accepted (must attach a block to the project to complete its steps) |
| Project completion | Derived from steps (completed/total); no separate manual project-complete. `status` only toggles active/archived |

## Architecture

Follows the existing Clean Architecture (mirrors the OKR feature): pure domain
entities + factory validators, repository interfaces, Supabase + in-memory
implementations, one-class-per-use-case injected via the dependency provider,
React/Next presentation. The block→project link and the step checklist in the
block side panel reuse the exact pattern established by the "歸屬 KR" dropdown.

## 1. Domain Model

### New entities

```
Project
  id, userId, title, keyResultId: string | null,
  status: "active" | "archived", position, createdAt
  validation: title non-blank; position >= 0
  progress = completedSteps / totalSteps (derived, not stored)

ProjectStep
  id, projectId, title, position, completed: boolean, createdAt
  validation: title non-blank; position >= 0
```

### Modified entity

```
Block + projectId: string | null   // optional; independent of keyResultId
```

### Deliberate decisions

1. **`Project.keyResultId` is a reference label only.** It shows which KR a
   project belongs to but never mutates the KR's numeric value (KR units don't
   map to step counts). OKR's `completedBlockCount` keeps counting only blocks
   whose `keyResultId` is set directly — the two linkages never cross-pollute.
2. **`ProjectStep.completed` is an independent flag**, unrelated to a block's
   status (planned/completed/skipped); it is toggled only from the block side panel.
3. **No standalone project "done" switch.** Completion is derived from whether all
   steps are checked; `status` only controls active vs archived (hide finished/abandoned).

## 2. Persistence

### New tables (3NF, matching existing `00N_*.sql` style + RLS)

```sql
projects
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  key_result_id uuid null references key_results(id) on delete set null,
  status text not null default 'active',
  position int not null check (position >= 0),
  created_at timestamptz not null default now()

project_steps
  id uuid pk default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  position int not null check (position >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now()
```

### Altered table

```sql
blocks + project_id uuid null references projects(id) on delete set null  (+ index)
```

Deleting a project cascades its steps; blocks linked to it are detached
(`SET NULL`), not deleted — consistent with the KR linkage.

RLS: a user can only touch their own projects; `project_steps` and the
`blocks.project_id` reference are gated through project ownership (mirror the
OKR migration's policy style).

### Repository interfaces (domain) + Supabase & in-memory implementations

```
ProjectRepository       findForUser / findById / add / update / delete / reorder
ProjectStepRepository   findByProject / findById / add / update / delete / reorder
```

`database.ts` gains the corresponding query functions; `dbBlockToEntity`,
`insertBlockRow`, and `updateBlockRow` gain `project_id ↔ projectId` mapping
(same approach used for `key_result_id`).

## 3. Use Cases

```
CreateProject(userId, title)            // appended position; status 'active'
UpdateProject(id, {title, keyResultId, status})
DeleteProject(id)
ListProjects(userId)
ReorderProjects(orderedIds)

CreateProjectStep(projectId, title)     // appended position; completed false
UpdateProjectStep(id, title)
DeleteProjectStep(id)
ReorderProjectSteps(orderedIds)
ListProjectStepsByProject(projectId)

ToggleProjectStepCompleted(stepId, completed)   // the ONLY mutator of completed
LinkBlockToProjectUseCase(blockId, projectId | null)
```

Planning-side mutations (create/edit/reorder steps, set KR, archive) go through
the Project use cases. **The only use case that writes `completed` is
`ToggleProjectStepCompleted`, and it is invoked only from the block side panel** —
the "completion happens only on the block page" rule is enforced at the code
layer, not just the UI. Project progress (completed/total) is computed in the
page from `ListProjectStepsByProject` results; nothing is stored.

`LinkBlockToProjectUseCase` mirrors the existing `LinkBlockToKeyResultUseCase`
(`findById` → `update` block with new `projectId` → return).

## 4. UI & Data Flow

### `/projects` page — planning surface

New route `src/app/projects/page.tsx`; Header gains a "Projects" link next to OKR.

```
[＋ New project]            [Show archived ▢]
──────────────────────────────────────────
Project card
  Title              [Attach to KR ▾]  progress 3/5   [Archive] [Delete]
  ├─ ✓ Step one  (completed → strikethrough, grey, NOT clickable)
  ├─ ○ Step two              [✎ edit] [⋮ drag] [✕ delete]
  └─ ＋ New step
```

- Planning only: create projects, set "歸屬 KR", add/edit/reorder/delete steps, archive.
- Step completion is **shown read-only here** (no checkbox to toggle) — enforces
  the single completion entry point.

### Block side panel — execution surface

Extends `block-editor.tsx` (after the existing "歸屬 KR" dropdown):

```
歸屬 Project ▾   [pick a project / — none —]
  └ when a project is chosen, list its steps each with a clickable checkbox:
     ☑ Step one    ☐ Step two    ☐ Step three
```

- Toggling a checkbox calls `ToggleProjectStepCompleted` (optimistic + persist).
  This is the **only** place `completed` changes.
- One block can tick off multiple steps of its project ("one block completes
  various steps"); a step can be advanced from any block linked to the same project.

### Data flow (existing app-state-provider pattern)

- app-state gains: `projectOptions` (the user's active projects, for the dropdown —
  **not** week-scoped; loaded once on login), `linkBlockToProject(blockId, projectId|null)`,
  `toggleProjectStepCompleted(stepId, completed)`, and per-project step loading
  for the panel (`ListProjectStepsByProject`).
- Block linking persists via `LinkBlockToProjectUseCase` → `BlockRepository.update`
  → `updateBlockRow` (which now writes `project_id`); local `supaBlocks` updated optimistically.
- `/projects` gets injected use cases via the dependency provider; progress is computed page-side.

### Components

```
presentation/components/projects/   projects-page-client  project-card  project-step-row
presentation/components/side-panel/ block-editor.tsx (+ Project dropdown + step checklist;
                                     checklist may be a project-step-checklist sub-component)
                                     side-panel.tsx (+ props)
app/projects/page.tsx  +  header.tsx (+ Projects link)
app/page.tsx + providers (dependency / production / app-state) wiring
```

## 5. Testing (Vitest + in-memory repos)

```
domain/entities    project / project-step validation (blank title, position<0,
                   completed defaults false)
domain/usecases    CreateProject / CreateProjectStep append position
                   ToggleProjectStepCompleted sets & clears completed
                   LinkBlockToProjectUseCase set & clear (null)
                   ListProjects / ListProjectStepsByProject / reorder pass-through
infrastructure     in-memory ProjectRepository / ProjectStepRepository CRUD + reorder
```

All domain logic tested with in-memory repositories; tests never touch Supabase.

## File Overview (new / modified)

```
domain/entities/        project.ts  project-step.ts   block.ts (+projectId)
domain/repositories/    project-repository.ts  project-step-repository.ts
domain/usecases/        create/update/delete/list/reorder-project
                        create/update/delete/reorder-project-step
                        list-project-steps-by-project
                        toggle-project-step-completed
                        link-block-to-project
infrastructure/in-memory/    in-memory-project-repository  in-memory-project-step-repository
infrastructure/supabase/     supabase-project-repository  supabase-project-step-repository
                             database.ts (+functions, blocks project_id mapping)
                             migrations/010_projects.sql (two tables + blocks.project_id)
presentation/components/projects/   projects-page-client  project-card  project-step-row
presentation/components/side-panel/ block-editor.tsx (+Project dropdown + step checklist)
                                    side-panel.tsx (+props)
app/projects/page.tsx  +  header.tsx (+Projects link)
app/page.tsx + providers (dependency / production / app-state) wiring
```

## Out of Scope (YAGNI)

Scheduling a step into a day directly from the `/projects` page, `Project ↔ KR`
auto-advancing the KR number, Someday/Maybe lists, `@context` tags, dragging a
step onto a block. Each could be a future spec.
