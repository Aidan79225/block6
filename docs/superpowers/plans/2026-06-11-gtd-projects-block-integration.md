# GTD Projects — Block Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach a block to a single Project and, from that block's side panel, tick off that project's steps. Step completion happens ONLY here — the single source of truth for `ProjectStep.completed`.

**Architecture:** Builds on Plan 1 (`2026-06-11-gtd-projects-foundation.md`). Adds optional `Block.projectId`, a `LinkBlockToProjectUseCase` (mirrors `LinkBlockToKeyResultUseCase`), persistence mapping, app-state actions, and a "歸屬 Project" dropdown + step checklist in the block editor. Reuses the exact patterns from the shipped OKR "歸屬 KR" dropdown.

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-gtd-projects-design.md`

**Prerequisite:** Plan 1 merged (Project/ProjectStep entities, repos, use cases incl. `ToggleProjectStepCompletedUseCase` and `ListProjectStepsByProjectUseCase`, `/projects` page, providers wired).

**Key notes (mirror the OKR linkage work):**
- `projectId` is OPTIONAL in `CreateBlockInput`, defaulted to `null` in `createBlock` — existing `createBlock` call sites must keep compiling (same approach used for `keyResultId`).
- Block linking persists through `BlockRepository.update → updateBlockRow` (no separate db setter), exactly like block→KR.
- The step checklist lives in its own component that reads steps + toggles via app-state, so block-editor/side-panel/page only thread the project dropdown (like the KR dropdown).

**Deferred (explicit, not silent):** drag-reorder UI for steps/projects is NOT built (the `reorder*` use cases exist; items show in creation order). The "歸屬 KR" picker on the project card is built in Plan 1 (Task 7B). Everything else in the spec is delivered across Plans 1+2.

---

## Task 1: Add `projectId` to the Block entity

**Files:**
- Modify: `src/domain/entities/block.ts`
- Modify: `src/__tests__/domain/entities/block.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/__tests__/domain/entities/block.test.ts` (inside the existing `describe`; imports of `BlockType`/`BlockStatus`/`createBlock` already exist from the OKR work):

```ts
  it("defaults projectId to null", () => {
    const block = createBlock({
      id: "b-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "t",
      description: "",
      status: BlockStatus.Planned,
    });
    expect(block.projectId).toBeNull();
  });

  it("keeps an explicit projectId", () => {
    const block = createBlock({
      id: "b-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "t",
      description: "",
      status: BlockStatus.Planned,
      projectId: "p-1",
    });
    expect(block.projectId).toBe("p-1");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/block.test.ts`
Expected: FAIL — `projectId` not on type / not returned.

- [ ] **Step 3: Modify the entity**

In `src/domain/entities/block.ts`, add `projectId` to both interfaces (after `keyResultId`) and default it in the factory. The current factory ends with `return { ...input, keyResultId: input.keyResultId ?? null };` — extend it:

```ts
export interface Block {
  readonly id: string;
  readonly weekPlanId: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
  readonly title: string;
  readonly description: string;
  readonly status: BlockStatus;
  readonly keyResultId: string | null;
  readonly projectId: string | null;
}

export interface CreateBlockInput {
  id: string;
  weekPlanId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
  status: BlockStatus;
  keyResultId?: string | null;
  projectId?: string | null;
}

export function createBlock(input: CreateBlockInput): Block {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7)
    throw new Error("dayOfWeek must be between 1 and 7");
  if (input.slot < 1 || input.slot > 6)
    throw new Error("slot must be between 1 and 6");
  return {
    ...input,
    keyResultId: input.keyResultId ?? null,
    projectId: input.projectId ?? null,
  };
}
```

- [ ] **Step 4: Run test + full type-check, fix ripples**

Run: `pnpm vitest run src/__tests__/domain/entities/block.test.ts` → PASS.
Run: `pnpm type-check`.

Any test/code that builds a `Block` **object literal** (not via `createBlock`) now fails to compile (missing `projectId`). Add `projectId: null` to each such literal — no logic changes. Known sites (from the OKR work, verify by running tsc): `src/__tests__/domain/usecases/get-week-summary.test.ts`, `update-block-status.test.ts`, `update-block.test.ts`, `get-cycle-okr-view.test.ts`, `link-block-to-key-result.test.ts`, and `src/__tests__/presentation/components/block-cell.test.tsx`. Fix whichever tsc reports. Report which files you touched.

- [ ] **Step 5: Run the full suite**

Run: `pnpm vitest run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add optional projectId to Block entity"
```

---

## Task 2: LinkBlockToProjectUseCase

**Files:**
- Create: `src/domain/usecases/link-block-to-project.ts`
- Test: `src/__tests__/domain/usecases/link-block-to-project.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/link-block-to-project.test.ts
import { describe, it, expect, vi } from "vitest";
import { LinkBlockToProjectUseCase } from "@/domain/usecases/link-block-to-project";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockStatus, BlockType } from "@/domain/entities/block";

const block: Block = {
  id: "b-1",
  weekPlanId: "wp-1",
  dayOfWeek: 1,
  slot: 1,
  blockType: BlockType.Core,
  title: "做專案",
  description: "",
  status: BlockStatus.Planned,
  keyResultId: null,
  projectId: null,
};

const makeRepo = (): BlockRepository => ({
  findByWeekPlan: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

describe("LinkBlockToProjectUseCase", () => {
  it("sets the projectId", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(block);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToProjectUseCase(repo).execute(
      "b-1",
      "p-1",
    );
    expect(result.projectId).toBe("p-1");
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b-1", projectId: "p-1" }),
    );
  });

  it("clears the projectId when given null", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue({ ...block, projectId: "p-1" });
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToProjectUseCase(repo).execute(
      "b-1",
      null,
    );
    expect(result.projectId).toBeNull();
  });

  it("throws when the block is missing", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new LinkBlockToProjectUseCase(repo).execute("nope", "p-1"),
    ).rejects.toThrow("Block nope not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/link-block-to-project.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the use case**

```ts
// src/domain/usecases/link-block-to-project.ts
import { Block } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export class LinkBlockToProjectUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(blockId: string, projectId: string | null): Promise<Block> {
    const existing = await this.repo.findById(blockId);
    if (!existing) throw new Error(`Block ${blockId} not found`);
    const updated: Block = { ...existing, projectId };
    await this.repo.update(updated);
    return updated;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/link-block-to-project.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/link-block-to-project.ts src/__tests__/domain/usecases/link-block-to-project.test.ts
git commit -m "feat: add LinkBlockToProjectUseCase"
```

---

## Task 3: Migration — `blocks.project_id`

**Files:**
- Create: `supabase/migrations/011_block_project.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Attach a block to a project. ON DELETE SET NULL: deleting a project detaches
-- its blocks without deleting them.
alter table blocks
  add column project_id uuid null references projects(id) on delete set null;

create index blocks_project_id_idx on blocks (project_id);
```

- [ ] **Step 2: Apply the migration** (Supabase SQL editor or `supabase db push`). Confirm `blocks.project_id` exists and is nullable.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011_block_project.sql
git commit -m "feat: add project_id column to blocks"
```

---

## Task 4: Persistence — map `project_id` on blocks

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

No unit test (integration layer). Gate: `pnpm type-check` + `pnpm lint` + full `pnpm vitest run`.

- [ ] **Step 1: Map the column**

In `database.ts`:

- Add to the `DbBlock` interface: `project_id: string | null;`
- In `dbBlockToEntity`, add to the `createBlock({ ... })` call: `projectId: db.project_id ?? null,`
- In `insertBlockRow`, add to the `.insert({ ... })` object: `project_id: block.projectId,`
- In `updateBlockRow`, add to the `.update({ ... })` object: `project_id: block.projectId,`
- Leave `upsertBlock` unchanged (it edits title/type only; the column defaults null on insert and is preserved on its updates).

- [ ] **Step 2: Verify**

Run: `pnpm type-check && pnpm lint && pnpm vitest run`
Expected: PASS (all green).

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "feat: persist block project_id"
```

---

## Task 5: Wire LinkBlockToProject into the provider

**Files:**
- Modify: `src/presentation/providers/dependency-provider.tsx`

(`blockRepo` is already on `Repositories`; no production-provider change needed.)

- [ ] **Step 1: Extend `dependency-provider.tsx`**

Add import:

```ts
import { LinkBlockToProjectUseCase } from "@/domain/usecases/link-block-to-project";
```

Add to the `UseCases` interface:

```ts
  linkBlockToProject: LinkBlockToProjectUseCase;
```

Add to the `useMemo<UseCases>` object:

```ts
      linkBlockToProject: new LinkBlockToProjectUseCase(repositories.blockRepo),
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm type-check
git add src/presentation/providers/dependency-provider.tsx
git commit -m "feat: wire LinkBlockToProjectUseCase into provider"
```

---

## Task 6: App-state — project options, linking, steps & toggle

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

READ the file first. It exposes an `AppState` interface, a big provider with `useState`/`useCallback`, `useAuth()` → `user`, `useNotify()` → `notify`, `useUseCases()` → `useCases`, `setSupaBlocks` (a `Record<string, Block[]>` setter), and imports `createBlock` + `Block`. It already has the OKR equivalents (`keyResultOptions`, `linkBlockToKeyResult`) — mirror them.

- [ ] **Step 1: Imports**

Add a new import:

```ts
import type { ProjectStep } from "@/domain/entities/project-step";
```

- [ ] **Step 2: Extend the `AppState` interface**

```ts
  projectOptions: { projectId: string; title: string }[];
  loadProjectOptions: () => void;
  linkBlockToProject: (blockId: string, projectId: string | null) => void;
  projectSteps: Record<string, ProjectStep[]>;
  loadProjectSteps: (projectId: string) => void;
  toggleProjectStepCompleted: (
    projectId: string,
    stepId: string,
    completed: boolean,
  ) => void;
```

- [ ] **Step 3: Add state**

Near the other `useState` calls:

```ts
  const [projectOptions, setProjectOptions] = useState<
    { projectId: string; title: string }[]
  >([]);
  const [projectSteps, setProjectSteps] = useState<
    Record<string, ProjectStep[]>
  >({});
```

- [ ] **Step 4: Add the callbacks** (place near `linkBlockToKeyResult`)

```ts
  const loadProjectOptions = useCallback(() => {
    if (!user) {
      Promise.resolve().then(() => setProjectOptions([]));
      return;
    }
    useCases.listProjects
      .execute(user.id)
      .then((projects) =>
        setProjectOptions(
          projects
            .filter((p) => p.status === "active")
            .map((p) => ({ projectId: p.id, title: p.title })),
        ),
      )
      .catch((err) => {
        console.error(err);
        setProjectOptions([]);
      });
  }, [user, useCases]);

  const linkBlockToProject = useCallback(
    (blockId: string, projectId: string | null) => {
      setSupaBlocks((prev) => {
        const out: Record<string, Block[]> = {};
        for (const [wk, list] of Object.entries(prev)) {
          out[wk] = list.map((b) =>
            b.id === blockId ? createBlock({ ...b, projectId }) : b,
          );
        }
        return out;
      });
      useCases.linkBlockToProject.execute(blockId, projectId).catch((err) => {
        console.error(err);
        notify.error("區塊歸屬專案失敗");
      });
    },
    [useCases, notify],
  );

  const loadProjectSteps = useCallback(
    (projectId: string) => {
      useCases.listProjectStepsByProject
        .execute(projectId)
        .then((steps) =>
          setProjectSteps((prev) => ({ ...prev, [projectId]: steps })),
        )
        .catch((err) => {
          console.error(err);
          notify.error("載入專案步驟失敗");
        });
    },
    [useCases, notify],
  );

  const toggleProjectStepCompleted = useCallback(
    (projectId: string, stepId: string, completed: boolean) => {
      setProjectSteps((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).map((s) =>
          s.id === stepId ? { ...s, completed } : s,
        ),
      }));
      useCases.toggleProjectStepCompleted
        .execute(stepId, completed)
        .catch((err) => {
          console.error(err);
          notify.error("步驟狀態更新失敗");
        });
    },
    [useCases, notify],
  );
```

- [ ] **Step 5: Expose on the context value**

Add to the `<AppStateContext.Provider value={{ ... }}>` object:

```ts
        projectOptions,
        loadProjectOptions,
        linkBlockToProject,
        projectSteps,
        loadProjectSteps,
        toggleProjectStepCompleted,
```

- [ ] **Step 6: Type-check + commit**

```bash
pnpm type-check && pnpm lint
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: app-state project options, linking, steps and toggle"
```

---

## Task 7: Block side panel — Project dropdown + step checklist

**Files:**
- Create: `src/presentation/components/side-panel/project-step-checklist.tsx`
- Modify: `src/presentation/components/side-panel/block-editor.tsx`
- Modify: `src/presentation/components/side-panel/side-panel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: ProjectStepChecklist — the only completion surface**

```tsx
// src/presentation/components/side-panel/project-step-checklist.tsx
"use client";

import { useEffect } from "react";
import { useAppState } from "@/presentation/providers/app-state-provider";

interface Props {
  projectId: string;
}

export function ProjectStepChecklist({ projectId }: Props) {
  const { projectSteps, loadProjectSteps, toggleProjectStepCompleted } =
    useAppState();
  const steps = projectSteps[projectId];

  useEffect(() => {
    loadProjectSteps(projectId);
  }, [projectId, loadProjectSteps]);

  if (!steps || steps.length === 0) {
    return (
      <p
        style={{
          fontSize: "12px",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        這個專案還沒有步驟
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {steps.map((step) => (
        <label
          key={step.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={step.completed}
            onChange={(e) =>
              toggleProjectStepCompleted(projectId, step.id, e.target.checked)
            }
            style={{ cursor: "pointer" }}
          />
          <span
            style={{
              textDecoration: step.completed ? "line-through" : "none",
              opacity: step.completed ? 0.6 : 1,
            }}
          >
            {step.title}
          </span>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: block-editor.tsx — add Project dropdown + checklist**

Add to `BlockEditorProps` (alongside the existing KR props):

```ts
  projectId: string | null;
  projectOptions: { projectId: string; title: string }[];
  onLinkProject: (projectId: string | null) => void;
```

Destructure them in the component signature, and import the checklist at the top:

```tsx
import { ProjectStepChecklist } from "./project-step-checklist";
```

Render this block immediately AFTER the existing "歸屬 KR" dropdown block and BEFORE the 儲存 button (only when the block exists and there are projects):

```tsx
      {blockId && projectOptions.length > 0 && (
        <div>
          <label
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "6px",
              display: "block",
            }}
          >
            歸屬 Project
          </label>
          <select
            value={projectId ?? ""}
            onChange={(e) => onLinkProject(e.target.value || null)}
            style={{
              width: "100%",
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "8px",
              fontSize: "14px",
            }}
          >
            <option value="">— 不歸屬 —</option>
            {projectOptions.map((opt) => (
              <option key={opt.projectId} value={opt.projectId}>
                {opt.title}
              </option>
            ))}
          </select>
          {projectId && (
            <div style={{ marginTop: "8px" }}>
              <ProjectStepChecklist projectId={projectId} />
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 3: side-panel.tsx — thread props through**

Add to `SidePanelProps` (alongside the existing KR props):

```ts
  projectOptions: { projectId: string; title: string }[];
  onLinkBlockProject: (projectId: string | null) => void;
```

Destructure them in the component signature, and pass to `<BlockEditor ... />` (alongside the existing block-editor props):

```tsx
        projectId={block?.projectId ?? null}
        projectOptions={projectOptions}
        onLinkProject={onLinkBlockProject}
```

- [ ] **Step 4: app/page.tsx — supply options + handler, load on mount**

- Add `projectOptions`, `loadProjectOptions`, `linkBlockToProject` to the `useAppState()` destructure (`keyResultOptions` etc. are already there).
- Add an effect (near the existing `loadKeyResultOptions` effect). Project options are NOT week-scoped — load once when the user is available:

```tsx
  useEffect(() => {
    loadProjectOptions();
  }, [loadProjectOptions]);
```

- On the `<SidePanel ... />` usage, add:

```tsx
            projectOptions={projectOptions}
            onLinkBlockProject={(projectId) => {
              if (selectedBlock) linkBlockToProject(selectedBlock.id, projectId);
            }}
```

- [ ] **Step 5: Verify, type-check, lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS. If `side-panel.test.tsx` exists and now lacks the new required props, add `projectOptions: []` and `onLinkBlockProject: () => {}` to its props factory (props-only, no logic change).

Then `pnpm dev` and manually verify (with a project + steps created on `/projects`, and a block that exists):
- Open an existing block → "歸屬 Project" dropdown lists active projects.
- Pick a project → its steps appear as checkboxes below.
- Tick a step → it shows struck-through; reopen the block → state persists; on `/projects` the `n/total` counter reflects it.
- Tick multiple steps in the same block → all persist (one block completes various steps).
- Open a different block, link it to the SAME project, tick another step → also works (a step set is advanced across blocks).
- Set the dropdown to "— 不歸屬 —" → block detaches.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/side-panel/project-step-checklist.tsx src/presentation/components/side-panel/block-editor.tsx src/presentation/components/side-panel/side-panel.tsx src/app/page.tsx
git commit -m "feat: attach blocks to a project and complete steps from the side panel"
```

---

## Task 8: Full test + gate + manual smoke

- [ ] **Step 1: Whole suite**

Run: `pnpm vitest run`
Expected: PASS (all green, including the new block/project tests).

- [ ] **Step 2: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 3: End-to-end manual smoke (logged in, migrations 010+011 applied)**

- `/projects`: create "裝潢新家", add steps 量尺寸 / 選油漆 / 找師傅.
- Dashboard: open an existing block, set 歸屬 Project = 裝潢新家 → steps appear; tick 量尺寸 + 選油漆.
- `/projects`: card shows 2/3, the two steps struck-through; no checkbox to toggle here (read-only).
- Delete the project on `/projects` → its steps go; the previously-linked block detaches (projectId null), no error.

- [ ] **Step 4: Commit (only if fixups were needed)**

```bash
git add -A
git commit -m "chore: GTD projects block integration green (tests + lint)"
```

---

## Done — Plan 2 outcome

A block attaches to one Project; its steps render as checkboxes in the block side panel, where completion is toggled (the single source of truth). One block can complete multiple steps; a step advances across multiple blocks. The `/projects` page shows completion read-only. Deleting a project detaches its blocks. **Deferred follow-up:** drag-reorder UI for steps/projects (the `reorder*` use cases are already in place from Plan 1).
