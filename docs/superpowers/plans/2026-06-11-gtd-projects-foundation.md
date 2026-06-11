# GTD Projects Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Project layer — standalone user-level projects with an ordered step checklist — plus the `/projects` planning page where the user creates projects, sets an optional KR link, and manages steps. Step completion is NOT wired here (that is Plan 2, the block side-panel execution surface).

**Architecture:** Clean Architecture, identical patterns to the shipped OKR feature. Pure domain entities with `createX` factory validators, repository interfaces in `domain/repositories`, in-memory + Supabase implementations in `infrastructure/`, one-class-per-use-case injected via the dependency provider, React/Next presentation. This plan delivers a fully working planning page; the block→project link and step-completion checklist come in Plan 2 (`2026-06-11-gtd-projects-block-integration.md`).

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase (Postgres), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-gtd-projects-design.md`

**Conventions (verified in the codebase, mirror the OKR feature):**
- Entities expose `createX(input)` that validates and returns `{ ...input, <defaults> }`. See `src/domain/entities/key-result.ts`.
- Optional input fields default inside the factory (e.g. `keyResultId: input.keyResultId ?? null`) — mirrors how `Block.keyResultId` was added.
- Use cases generate ids with `crypto.randomUUID()`, timestamps with `new Date()`. See `src/domain/usecases/create-key-result.ts`.
- In-memory repos use `private readonly byId = new Map()`; `add` throws on duplicate id, `update` throws on missing id; list methods sort by `position`; `reorder` sets `position = index`. See `src/infrastructure/in-memory/repositories/in-memory-key-result-repository.ts`.
- Supabase repos delegate to free functions in `src/infrastructure/supabase/database.ts`. See `src/infrastructure/supabase/repositories/supabase-key-result-repository.ts`.
- Use-case tests build a repo mock with `vi.fn()` per interface method.
- Run a single test file: `pnpm vitest run <path>`. Type-check: `pnpm type-check`. Lint: `pnpm lint`. (`pnpm` scripts work in this environment.)
- Supabase migrations live in `supabase/migrations/NNN_*.sql` (sequentially numbered; last is `009`).

---

## Task 1: Project entity

**Files:**
- Create: `src/domain/entities/project.ts`
- Test: `src/__tests__/domain/entities/project.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/entities/project.test.ts
import { describe, it, expect } from "vitest";
import { createProject } from "@/domain/entities/project";

describe("Project", () => {
  const base = {
    id: "p-1",
    userId: "u-1",
    title: "裝潢新家",
    position: 0,
    createdAt: new Date(),
  };

  it("creates a project with defaults", () => {
    const project = createProject(base);
    expect(project.title).toBe("裝潢新家");
    expect(project.userId).toBe("u-1");
    expect(project.keyResultId).toBeNull();
    expect(project.status).toBe("active");
  });

  it("keeps an explicit keyResultId and status", () => {
    const project = createProject({
      ...base,
      keyResultId: "k-1",
      status: "archived",
    });
    expect(project.keyResultId).toBe("k-1");
    expect(project.status).toBe("archived");
  });

  it("rejects blank title", () => {
    expect(() => createProject({ ...base, title: "  " })).toThrow(
      "Project title is required",
    );
  });

  it("rejects negative position", () => {
    expect(() => createProject({ ...base, position: -1 })).toThrow(
      "position must be non-negative",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/project.test.ts`
Expected: FAIL — cannot resolve `@/domain/entities/project`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/entities/project.ts
export type ProjectStatus = "active" | "archived";

export interface Project {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly keyResultId: string | null;
  readonly status: ProjectStatus;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateProjectInput {
  id: string;
  userId: string;
  title: string;
  keyResultId?: string | null;
  status?: ProjectStatus;
  position: number;
  createdAt: Date;
}

export function createProject(input: CreateProjectInput): Project {
  if (!input.title.trim()) throw new Error("Project title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return {
    ...input,
    keyResultId: input.keyResultId ?? null,
    status: input.status ?? "active",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/entities/project.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/project.ts src/__tests__/domain/entities/project.test.ts
git commit -m "feat: add Project entity"
```

---

## Task 2: ProjectStep entity

**Files:**
- Create: `src/domain/entities/project-step.ts`
- Test: `src/__tests__/domain/entities/project-step.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/entities/project-step.test.ts
import { describe, it, expect } from "vitest";
import { createProjectStep } from "@/domain/entities/project-step";

describe("ProjectStep", () => {
  const base = {
    id: "s-1",
    projectId: "p-1",
    title: "量尺寸",
    position: 0,
    createdAt: new Date(),
  };

  it("creates a step, completed defaults to false", () => {
    const step = createProjectStep(base);
    expect(step.title).toBe("量尺寸");
    expect(step.projectId).toBe("p-1");
    expect(step.completed).toBe(false);
  });

  it("keeps an explicit completed value", () => {
    const step = createProjectStep({ ...base, completed: true });
    expect(step.completed).toBe(true);
  });

  it("rejects blank title", () => {
    expect(() => createProjectStep({ ...base, title: "" })).toThrow(
      "ProjectStep title is required",
    );
  });

  it("rejects negative position", () => {
    expect(() => createProjectStep({ ...base, position: -1 })).toThrow(
      "position must be non-negative",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/entities/project-step.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/entities/project-step.ts
export interface ProjectStep {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly position: number;
  readonly completed: boolean;
  readonly createdAt: Date;
}

export interface CreateProjectStepInput {
  id: string;
  projectId: string;
  title: string;
  position: number;
  completed?: boolean;
  createdAt: Date;
}

export function createProjectStep(input: CreateProjectStepInput): ProjectStep {
  if (!input.title.trim()) throw new Error("ProjectStep title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input, completed: input.completed ?? false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/entities/project-step.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/project-step.ts src/__tests__/domain/entities/project-step.test.ts
git commit -m "feat: add ProjectStep entity"
```

---

## Task 3: Repository interfaces

**Files:**
- Create: `src/domain/repositories/project-repository.ts`
- Create: `src/domain/repositories/project-step-repository.ts`

No test (interfaces only — covered by the in-memory repo tests in Tasks 4–5).

- [ ] **Step 1: Write the two interfaces**

```ts
// src/domain/repositories/project-repository.ts
import { Project } from "@/domain/entities/project";

export interface ProjectRepository {
  findForUser(userId: string): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  add(project: Project): Promise<void>;
  update(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
```

```ts
// src/domain/repositories/project-step-repository.ts
import { ProjectStep } from "@/domain/entities/project-step";

export interface ProjectStepRepository {
  findByProject(projectId: string): Promise<ProjectStep[]>;
  findById(id: string): Promise<ProjectStep | null>;
  add(step: ProjectStep): Promise<void>;
  update(step: ProjectStep): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/domain/repositories/project-repository.ts src/domain/repositories/project-step-repository.ts
git commit -m "feat: add Project repository interfaces"
```

---

## Task 4: In-memory ProjectRepository

**Files:**
- Create: `src/infrastructure/in-memory/repositories/in-memory-project-repository.ts`
- Test: `src/__tests__/infrastructure/in-memory/repositories/in-memory-project-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/infrastructure/in-memory/repositories/in-memory-project-repository.test.ts
import { describe, it, expect } from "vitest";
import { InMemoryProjectRepository } from "@/infrastructure/in-memory/repositories/in-memory-project-repository";
import { createProject, Project } from "@/domain/entities/project";

const project = (id: string, userId: string, position: number): Project =>
  createProject({
    id,
    userId,
    title: `project-${id}`,
    position,
    createdAt: new Date(),
  });

describe("InMemoryProjectRepository", () => {
  it("finds a user's projects sorted by position", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-2", "u-1", 1));
    await repo.add(project("p-1", "u-1", 0));
    await repo.add(project("p-3", "u-2", 0));
    const found = await repo.findForUser("u-1");
    expect(found.map((p) => p.id)).toEqual(["p-1", "p-2"]);
  });

  it("finds by id and returns null when missing", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-1", "u-1", 0));
    expect((await repo.findById("p-1"))?.id).toBe("p-1");
    expect(await repo.findById("nope")).toBeNull();
  });

  it("updates an existing project", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-1", "u-1", 0));
    await repo.update({ ...project("p-1", "u-1", 0), title: "renamed" });
    expect((await repo.findById("p-1"))?.title).toBe("renamed");
  });

  it("deletes a project", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-1", "u-1", 0));
    await repo.delete("p-1");
    expect(await repo.findById("p-1")).toBeNull();
  });

  it("reorders projects by id order", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-1", "u-1", 0));
    await repo.add(project("p-2", "u-1", 1));
    await repo.reorder(["p-2", "p-1"]);
    expect((await repo.findForUser("u-1")).map((p) => p.id)).toEqual([
      "p-2",
      "p-1",
    ]);
  });

  it("throws when adding a duplicate id", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-1", "u-1", 0));
    await expect(repo.add(project("p-1", "u-1", 0))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-project-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/infrastructure/in-memory/repositories/in-memory-project-repository.ts
import type { Project } from "@/domain/entities/project";
import type { ProjectRepository } from "@/domain/repositories/project-repository";

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly byId = new Map<string, Project>();

  async findForUser(userId: string): Promise<Project[]> {
    return [...this.byId.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<Project | null> {
    return this.byId.get(id) ?? null;
  }

  async add(project: Project): Promise<void> {
    if (this.byId.has(project.id))
      throw new Error(`Project ${project.id} already exists`);
    this.byId.set(project.id, project);
  }

  async update(project: Project): Promise<void> {
    if (!this.byId.has(project.id))
      throw new Error(`Project ${project.id} not found`);
    this.byId.set(project.id, project);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const existing = this.byId.get(id);
      if (existing) this.byId.set(id, { ...existing, position: index });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-project-repository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/in-memory/repositories/in-memory-project-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-project-repository.test.ts
git commit -m "feat: add in-memory Project repository"
```

---

## Task 5: In-memory ProjectStepRepository

**Files:**
- Create: `src/infrastructure/in-memory/repositories/in-memory-project-step-repository.ts`
- Test: `src/__tests__/infrastructure/in-memory/repositories/in-memory-project-step-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/infrastructure/in-memory/repositories/in-memory-project-step-repository.test.ts
import { describe, it, expect } from "vitest";
import { InMemoryProjectStepRepository } from "@/infrastructure/in-memory/repositories/in-memory-project-step-repository";
import { createProjectStep, ProjectStep } from "@/domain/entities/project-step";

const step = (id: string, projectId: string, position: number): ProjectStep =>
  createProjectStep({
    id,
    projectId,
    title: `step-${id}`,
    position,
    createdAt: new Date(),
  });

describe("InMemoryProjectStepRepository", () => {
  it("finds by project sorted by position", async () => {
    const repo = new InMemoryProjectStepRepository();
    await repo.add(step("s-2", "p-1", 1));
    await repo.add(step("s-1", "p-1", 0));
    await repo.add(step("s-3", "p-2", 0));
    const found = await repo.findByProject("p-1");
    expect(found.map((s) => s.id)).toEqual(["s-1", "s-2"]);
  });

  it("updates completed via update", async () => {
    const repo = new InMemoryProjectStepRepository();
    await repo.add(step("s-1", "p-1", 0));
    const existing = await repo.findById("s-1");
    await repo.update({ ...existing!, completed: true });
    expect((await repo.findById("s-1"))?.completed).toBe(true);
  });

  it("deletes a step", async () => {
    const repo = new InMemoryProjectStepRepository();
    await repo.add(step("s-1", "p-1", 0));
    await repo.delete("s-1");
    expect(await repo.findById("s-1")).toBeNull();
  });

  it("reorders steps by id order", async () => {
    const repo = new InMemoryProjectStepRepository();
    await repo.add(step("s-1", "p-1", 0));
    await repo.add(step("s-2", "p-1", 1));
    await repo.reorder(["s-2", "s-1"]);
    expect((await repo.findByProject("p-1")).map((s) => s.id)).toEqual([
      "s-2",
      "s-1",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-project-step-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/infrastructure/in-memory/repositories/in-memory-project-step-repository.ts
import type { ProjectStep } from "@/domain/entities/project-step";
import type { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class InMemoryProjectStepRepository implements ProjectStepRepository {
  private readonly byId = new Map<string, ProjectStep>();

  async findByProject(projectId: string): Promise<ProjectStep[]> {
    return [...this.byId.values()]
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<ProjectStep | null> {
    return this.byId.get(id) ?? null;
  }

  async add(step: ProjectStep): Promise<void> {
    if (this.byId.has(step.id))
      throw new Error(`ProjectStep ${step.id} already exists`);
    this.byId.set(step.id, step);
  }

  async update(step: ProjectStep): Promise<void> {
    if (!this.byId.has(step.id))
      throw new Error(`ProjectStep ${step.id} not found`);
    this.byId.set(step.id, step);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const existing = this.byId.get(id);
      if (existing) this.byId.set(id, { ...existing, position: index });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/infrastructure/in-memory/repositories/in-memory-project-step-repository.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/in-memory/repositories/in-memory-project-step-repository.ts src/__tests__/infrastructure/in-memory/repositories/in-memory-project-step-repository.test.ts
git commit -m "feat: add in-memory ProjectStep repository"
```

---

## Task 6: Project CRUD use cases

**Files:**
- Create: `src/domain/usecases/create-project.ts`
- Create: `src/domain/usecases/update-project.ts`
- Create: `src/domain/usecases/delete-project.ts`
- Create: `src/domain/usecases/list-projects.ts`
- Create: `src/domain/usecases/reorder-projects.ts`
- Test: `src/__tests__/domain/usecases/project-usecases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/project-usecases.test.ts
import { describe, it, expect, vi } from "vitest";
import { ProjectRepository } from "@/domain/repositories/project-repository";
import { CreateProjectUseCase } from "@/domain/usecases/create-project";
import { UpdateProjectUseCase } from "@/domain/usecases/update-project";
import { DeleteProjectUseCase } from "@/domain/usecases/delete-project";
import { ListProjectsUseCase } from "@/domain/usecases/list-projects";
import { ReorderProjectsUseCase } from "@/domain/usecases/reorder-projects";
import { Project } from "@/domain/entities/project";

const makeRepo = (): ProjectRepository => ({
  findForUser: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

const existing: Project = {
  id: "p-1",
  userId: "u-1",
  title: "old",
  keyResultId: null,
  status: "active",
  position: 0,
  createdAt: new Date(),
};

describe("Project use cases", () => {
  it("creates a project appended after existing ones, active by default", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findForUser).mockResolvedValue([existing]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateProjectUseCase(repo).execute("u-1", "裝潢");
    expect(result.userId).toBe("u-1");
    expect(result.title).toBe("裝潢");
    expect(result.position).toBe(1);
    expect(result.status).toBe("active");
    expect(result.keyResultId).toBeNull();
  });

  it("updates title, keyResultId and status", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateProjectUseCase(repo).execute("p-1", {
      title: "new",
      keyResultId: "k-1",
      status: "archived",
    });
    expect(result.title).toBe("new");
    expect(result.keyResultId).toBe("k-1");
    expect(result.status).toBe("archived");
    expect(result.position).toBe(0); // preserved
  });

  it("throws when updating a missing project", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new UpdateProjectUseCase(repo).execute("nope", {
        title: "x",
        keyResultId: null,
        status: "active",
      }),
    ).rejects.toThrow("Project nope not found");
  });

  it("deletes a project", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteProjectUseCase(repo).execute("p-1");
    expect(repo.delete).toHaveBeenCalledWith("p-1");
  });

  it("lists projects for a user", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findForUser).mockResolvedValue([]);
    await new ListProjectsUseCase(repo).execute("u-1");
    expect(repo.findForUser).toHaveBeenCalledWith("u-1");
  });

  it("reorders projects", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderProjectsUseCase(repo).execute(["p-2", "p-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["p-2", "p-1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/project-usecases.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/domain/usecases/create-project.ts
import { Project, createProject } from "@/domain/entities/project";
import { ProjectRepository } from "@/domain/repositories/project-repository";

export class CreateProjectUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(userId: string, title: string): Promise<Project> {
    const siblings = await this.repo.findForUser(userId);
    const project = createProject({
      id: crypto.randomUUID(),
      userId,
      title,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(project);
    return project;
  }
}
```

```ts
// src/domain/usecases/update-project.ts
import {
  Project,
  ProjectStatus,
  createProject,
} from "@/domain/entities/project";
import { ProjectRepository } from "@/domain/repositories/project-repository";

export interface UpdateProjectInput {
  title: string;
  keyResultId: string | null;
  status: ProjectStatus;
}

export class UpdateProjectUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`Project ${id} not found`);
    const updated = createProject({
      id: existing.id,
      userId: existing.userId,
      title: input.title,
      keyResultId: input.keyResultId,
      status: input.status,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

```ts
// src/domain/usecases/delete-project.ts
import { ProjectRepository } from "@/domain/repositories/project-repository";

export class DeleteProjectUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
```

```ts
// src/domain/usecases/list-projects.ts
import { Project } from "@/domain/entities/project";
import { ProjectRepository } from "@/domain/repositories/project-repository";

export class ListProjectsUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(userId: string): Promise<Project[]> {
    return this.repo.findForUser(userId);
  }
}
```

```ts
// src/domain/usecases/reorder-projects.ts
import { ProjectRepository } from "@/domain/repositories/project-repository";

export class ReorderProjectsUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/project-usecases.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/create-project.ts src/domain/usecases/update-project.ts src/domain/usecases/delete-project.ts src/domain/usecases/list-projects.ts src/domain/usecases/reorder-projects.ts src/__tests__/domain/usecases/project-usecases.test.ts
git commit -m "feat: add Project CRUD use cases"
```

---

## Task 7: ProjectStep use cases (CRUD + list + toggle)

**Files:**
- Create: `src/domain/usecases/create-project-step.ts`
- Create: `src/domain/usecases/update-project-step.ts`
- Create: `src/domain/usecases/delete-project-step.ts`
- Create: `src/domain/usecases/reorder-project-steps.ts`
- Create: `src/domain/usecases/list-project-steps-by-project.ts`
- Create: `src/domain/usecases/toggle-project-step-completed.ts`
- Test: `src/__tests__/domain/usecases/project-step-usecases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/domain/usecases/project-step-usecases.test.ts
import { describe, it, expect, vi } from "vitest";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";
import { CreateProjectStepUseCase } from "@/domain/usecases/create-project-step";
import { UpdateProjectStepUseCase } from "@/domain/usecases/update-project-step";
import { DeleteProjectStepUseCase } from "@/domain/usecases/delete-project-step";
import { ReorderProjectStepsUseCase } from "@/domain/usecases/reorder-project-steps";
import { ListProjectStepsByProjectUseCase } from "@/domain/usecases/list-project-steps-by-project";
import { ToggleProjectStepCompletedUseCase } from "@/domain/usecases/toggle-project-step-completed";
import { ProjectStep } from "@/domain/entities/project-step";

const makeRepo = (): ProjectStepRepository => ({
  findByProject: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

const existing: ProjectStep = {
  id: "s-1",
  projectId: "p-1",
  title: "量尺寸",
  position: 0,
  completed: false,
  createdAt: new Date(),
};

describe("ProjectStep use cases", () => {
  it("creates a step appended after existing ones, not completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByProject).mockResolvedValue([existing]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateProjectStepUseCase(repo).execute(
      "p-1",
      "選油漆",
    );
    expect(result.projectId).toBe("p-1");
    expect(result.position).toBe(1);
    expect(result.completed).toBe(false);
  });

  it("updates the title, preserving completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue({ ...existing, completed: true });
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateProjectStepUseCase(repo).execute(
      "s-1",
      "量尺寸(改)",
    );
    expect(result.title).toBe("量尺寸(改)");
    expect(result.completed).toBe(true);
  });

  it("toggles completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new ToggleProjectStepCompletedUseCase(repo).execute(
      "s-1",
      true,
    );
    expect(result.completed).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s-1", completed: true }),
    );
  });

  it("throws when toggling a missing step", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new ToggleProjectStepCompletedUseCase(repo).execute("nope", true),
    ).rejects.toThrow("ProjectStep nope not found");
  });

  it("deletes a step", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteProjectStepUseCase(repo).execute("s-1");
    expect(repo.delete).toHaveBeenCalledWith("s-1");
  });

  it("reorders steps", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderProjectStepsUseCase(repo).execute(["s-2", "s-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["s-2", "s-1"]);
  });

  it("lists steps by project", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByProject).mockResolvedValue([existing]);
    const result = await new ListProjectStepsByProjectUseCase(repo).execute(
      "p-1",
    );
    expect(result).toEqual([existing]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/domain/usecases/project-step-usecases.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/domain/usecases/create-project-step.ts
import { ProjectStep, createProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class CreateProjectStepUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(projectId: string, title: string): Promise<ProjectStep> {
    const siblings = await this.repo.findByProject(projectId);
    const step = createProjectStep({
      id: crypto.randomUUID(),
      projectId,
      title,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(step);
    return step;
  }
}
```

```ts
// src/domain/usecases/update-project-step.ts
import { ProjectStep, createProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class UpdateProjectStepUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(id: string, title: string): Promise<ProjectStep> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`ProjectStep ${id} not found`);
    const updated = createProjectStep({
      id: existing.id,
      projectId: existing.projectId,
      title,
      position: existing.position,
      completed: existing.completed,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

```ts
// src/domain/usecases/delete-project-step.ts
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class DeleteProjectStepUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
```

```ts
// src/domain/usecases/reorder-project-steps.ts
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class ReorderProjectStepsUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
```

```ts
// src/domain/usecases/list-project-steps-by-project.ts
import { ProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class ListProjectStepsByProjectUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(projectId: string): Promise<ProjectStep[]> {
    return this.repo.findByProject(projectId);
  }
}
```

```ts
// src/domain/usecases/toggle-project-step-completed.ts
import { ProjectStep, createProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class ToggleProjectStepCompletedUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(id: string, completed: boolean): Promise<ProjectStep> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`ProjectStep ${id} not found`);
    const updated = createProjectStep({
      id: existing.id,
      projectId: existing.projectId,
      title: existing.title,
      position: existing.position,
      completed,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/domain/usecases/project-step-usecases.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/usecases/create-project-step.ts src/domain/usecases/update-project-step.ts src/domain/usecases/delete-project-step.ts src/domain/usecases/reorder-project-steps.ts src/domain/usecases/list-project-steps-by-project.ts src/domain/usecases/toggle-project-step-completed.ts src/__tests__/domain/usecases/project-step-usecases.test.ts
git commit -m "feat: add ProjectStep use cases (CRUD, list, toggle)"
```

---

## Task 8: Migration — projects & project_steps tables

**Files:**
- Create: `supabase/migrations/010_projects.sql`

This migration is applied to Supabase manually by the user (no DB creds in the dev environment). It creates the two tables only; `blocks.project_id` is added in Plan 2's migration (`011`), keeping each plan's migration aligned with its code.

- [ ] **Step 1: Write the migration**

```sql
-- GTD projects: standalone projects with an ordered step checklist

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  key_result_id uuid null references key_results(id) on delete set null,
  status text not null default 'active',
  position int not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index projects_user_id_idx on projects (user_id);

create table project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  position int not null check (position >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index project_steps_project_id_idx on project_steps (project_id);

-- RLS: a user can only touch their own projects and their steps.
alter table projects enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table project_steps enable row level security;

create policy "Users manage own project steps"
  on project_steps for all
  using (
    project_id in (select id from projects where user_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where user_id = auth.uid())
  );
```

- [ ] **Step 2: Apply the migration** (Supabase SQL editor or `supabase db push`). Confirm both tables exist with the expected columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_projects.sql
git commit -m "feat: add projects and project_steps DB migration"
```

---

## Task 9: Supabase repositories + database functions

**Files:**
- Modify: `src/infrastructure/supabase/database.ts` (append a "Projects" section; add entity imports at top)
- Create: `src/infrastructure/supabase/repositories/supabase-project-repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-project-step-repository.ts`

No unit test (Supabase impls are integration-level; in-memory repos cover the contract). Gate: `pnpm type-check` + `pnpm lint`.

- [ ] **Step 1: Append database functions to `database.ts`**

Add the entity imports at the TOP of `database.ts` with the other entity imports (do not place imports mid-file):

```ts
import type { Project } from "@/domain/entities/project";
import { createProject } from "@/domain/entities/project";
import type { ProjectStep } from "@/domain/entities/project-step";
import { createProjectStep } from "@/domain/entities/project-step";
```

Append at the end of the file:

```ts
// --- Projects ---

interface DbProject {
  id: string;
  user_id: string;
  title: string;
  key_result_id: string | null;
  status: string;
  position: number;
  created_at: string;
}

function dbProjectToEntity(db: DbProject): Project {
  return createProject({
    id: db.id,
    userId: db.user_id,
    title: db.title,
    keyResultId: db.key_result_id ?? null,
    status: db.status === "archived" ? "archived" : "active",
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchProjectsForUser(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbProject[]).map(dbProjectToEntity);
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbProjectToEntity(data as DbProject);
}

export async function insertProject(project: Project): Promise<void> {
  const { error } = await supabase.from("projects").insert({
    id: project.id,
    user_id: project.userId,
    title: project.title,
    key_result_id: project.keyResultId,
    status: project.status,
    position: project.position,
  });
  if (error) throw new Error(error.message);
}

export async function updateProjectRow(project: Project): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({
      title: project.title,
      key_result_id: project.keyResultId,
      status: project.status,
      position: project.position,
    })
    .eq("id", project.id);
  if (error) throw new Error(error.message);
}

export async function deleteProjectRow(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderProjectRows(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("projects")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- Project steps ---

interface DbProjectStep {
  id: string;
  project_id: string;
  title: string;
  position: number;
  completed: boolean;
  created_at: string;
}

function dbProjectStepToEntity(db: DbProjectStep): ProjectStep {
  return createProjectStep({
    id: db.id,
    projectId: db.project_id,
    title: db.title,
    position: db.position,
    completed: db.completed,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchStepsByProject(
  projectId: string,
): Promise<ProjectStep[]> {
  const { data, error } = await supabase
    .from("project_steps")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbProjectStep[]).map(dbProjectStepToEntity);
}

export async function fetchProjectStepById(
  id: string,
): Promise<ProjectStep | null> {
  const { data, error } = await supabase
    .from("project_steps")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbProjectStepToEntity(data as DbProjectStep);
}

export async function insertProjectStep(step: ProjectStep): Promise<void> {
  const { error } = await supabase.from("project_steps").insert({
    id: step.id,
    project_id: step.projectId,
    title: step.title,
    position: step.position,
    completed: step.completed,
  });
  if (error) throw new Error(error.message);
}

export async function updateProjectStepRow(step: ProjectStep): Promise<void> {
  const { error } = await supabase
    .from("project_steps")
    .update({
      title: step.title,
      position: step.position,
      completed: step.completed,
    })
    .eq("id", step.id);
  if (error) throw new Error(error.message);
}

export async function deleteProjectStepRow(id: string): Promise<void> {
  const { error } = await supabase.from("project_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderProjectStepRows(
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("project_steps")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 2: Write the two Supabase repositories**

```ts
// src/infrastructure/supabase/repositories/supabase-project-repository.ts
import type { Project } from "@/domain/entities/project";
import type { ProjectRepository } from "@/domain/repositories/project-repository";
import {
  fetchProjectsForUser,
  fetchProjectById,
  insertProject,
  updateProjectRow,
  deleteProjectRow,
  reorderProjectRows,
} from "@/infrastructure/supabase/database";

export class SupabaseProjectRepository implements ProjectRepository {
  findForUser(userId: string): Promise<Project[]> {
    return fetchProjectsForUser(userId);
  }
  findById(id: string): Promise<Project | null> {
    return fetchProjectById(id);
  }
  add(project: Project): Promise<void> {
    return insertProject(project);
  }
  update(project: Project): Promise<void> {
    return updateProjectRow(project);
  }
  delete(id: string): Promise<void> {
    return deleteProjectRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderProjectRows(orderedIds);
  }
}
```

```ts
// src/infrastructure/supabase/repositories/supabase-project-step-repository.ts
import type { ProjectStep } from "@/domain/entities/project-step";
import type { ProjectStepRepository } from "@/domain/repositories/project-step-repository";
import {
  fetchStepsByProject,
  fetchProjectStepById,
  insertProjectStep,
  updateProjectStepRow,
  deleteProjectStepRow,
  reorderProjectStepRows,
} from "@/infrastructure/supabase/database";

export class SupabaseProjectStepRepository implements ProjectStepRepository {
  findByProject(projectId: string): Promise<ProjectStep[]> {
    return fetchStepsByProject(projectId);
  }
  findById(id: string): Promise<ProjectStep | null> {
    return fetchProjectStepById(id);
  }
  add(step: ProjectStep): Promise<void> {
    return insertProjectStep(step);
  }
  update(step: ProjectStep): Promise<void> {
    return updateProjectStepRow(step);
  }
  delete(id: string): Promise<void> {
    return deleteProjectStepRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderProjectStepRows(orderedIds);
  }
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/database.ts src/infrastructure/supabase/repositories/supabase-project-repository.ts src/infrastructure/supabase/repositories/supabase-project-step-repository.ts
git commit -m "feat: add Supabase Project repositories and DB functions"
```

---

## Task 10: Wire Project use cases into the dependency provider

**Files:**
- Modify: `src/presentation/providers/dependency-provider.tsx`
- Modify: `src/presentation/providers/production-dependency-provider.tsx`

- [ ] **Step 1: Extend `dependency-provider.tsx`**

Add imports (top of file, alongside existing imports):

```ts
import { ProjectRepository } from "@/domain/repositories/project-repository";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";
import { CreateProjectUseCase } from "@/domain/usecases/create-project";
import { UpdateProjectUseCase } from "@/domain/usecases/update-project";
import { DeleteProjectUseCase } from "@/domain/usecases/delete-project";
import { ListProjectsUseCase } from "@/domain/usecases/list-projects";
import { ReorderProjectsUseCase } from "@/domain/usecases/reorder-projects";
import { CreateProjectStepUseCase } from "@/domain/usecases/create-project-step";
import { UpdateProjectStepUseCase } from "@/domain/usecases/update-project-step";
import { DeleteProjectStepUseCase } from "@/domain/usecases/delete-project-step";
import { ReorderProjectStepsUseCase } from "@/domain/usecases/reorder-project-steps";
import { ListProjectStepsByProjectUseCase } from "@/domain/usecases/list-project-steps-by-project";
import { ToggleProjectStepCompletedUseCase } from "@/domain/usecases/toggle-project-step-completed";
```

Add to the `UseCases` interface:

```ts
  createProject: CreateProjectUseCase;
  updateProject: UpdateProjectUseCase;
  deleteProject: DeleteProjectUseCase;
  listProjects: ListProjectsUseCase;
  reorderProjects: ReorderProjectsUseCase;
  createProjectStep: CreateProjectStepUseCase;
  updateProjectStep: UpdateProjectStepUseCase;
  deleteProjectStep: DeleteProjectStepUseCase;
  reorderProjectSteps: ReorderProjectStepsUseCase;
  listProjectStepsByProject: ListProjectStepsByProjectUseCase;
  toggleProjectStepCompleted: ToggleProjectStepCompletedUseCase;
```

Add to the `Repositories` interface:

```ts
  projectRepo: ProjectRepository;
  projectStepRepo: ProjectStepRepository;
```

Add to the `useMemo<UseCases>` object:

```ts
      createProject: new CreateProjectUseCase(repositories.projectRepo),
      updateProject: new UpdateProjectUseCase(repositories.projectRepo),
      deleteProject: new DeleteProjectUseCase(repositories.projectRepo),
      listProjects: new ListProjectsUseCase(repositories.projectRepo),
      reorderProjects: new ReorderProjectsUseCase(repositories.projectRepo),
      createProjectStep: new CreateProjectStepUseCase(
        repositories.projectStepRepo,
      ),
      updateProjectStep: new UpdateProjectStepUseCase(
        repositories.projectStepRepo,
      ),
      deleteProjectStep: new DeleteProjectStepUseCase(
        repositories.projectStepRepo,
      ),
      reorderProjectSteps: new ReorderProjectStepsUseCase(
        repositories.projectStepRepo,
      ),
      listProjectStepsByProject: new ListProjectStepsByProjectUseCase(
        repositories.projectStepRepo,
      ),
      toggleProjectStepCompleted: new ToggleProjectStepCompletedUseCase(
        repositories.projectStepRepo,
      ),
```

- [ ] **Step 2: Extend `production-dependency-provider.tsx`**

Add imports + repo instances:

```ts
import { SupabaseProjectRepository } from "@/infrastructure/supabase/repositories/supabase-project-repository";
import { SupabaseProjectStepRepository } from "@/infrastructure/supabase/repositories/supabase-project-step-repository";
```

In the `useMemo` repositories object, add:

```ts
      projectRepo: new SupabaseProjectRepository(),
      projectStepRepo: new SupabaseProjectStepRepository(),
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/providers/dependency-provider.tsx src/presentation/providers/production-dependency-provider.tsx
git commit -m "feat: wire Project use cases into dependency provider"
```

---

## Task 11: `/projects` page + components + header link

**Files:**
- Create: `src/app/projects/page.tsx`
- Create: `src/presentation/components/projects/projects-page-client.tsx`
- Create: `src/presentation/components/projects/project-card.tsx`
- Create: `src/presentation/components/projects/project-step-row.tsx`
- Modify: `src/presentation/components/header/header.tsx` (add a Projects link)

Step completion is read-only on this page (no toggle). Verification is type-check + lint + manual (the project has no page-level component tests). Commit at the end.

- [ ] **Step 1: ProjectStepRow — read-only completion + edit/delete**

```tsx
// src/presentation/components/projects/project-step-row.tsx
"use client";

import { useState } from "react";
import { ProjectStep } from "@/domain/entities/project-step";

interface Props {
  step: ProjectStep;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ProjectStepRow({ step, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.title);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== step.title) onRename(t);
    setEditing(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 0",
      }}
    >
      <span
        aria-hidden
        style={{
          color: step.completed
            ? "var(--color-accent)"
            : "var(--color-text-muted)",
          fontSize: "13px",
        }}
      >
        {step.completed ? "✓" : "○"}
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            flex: 1,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "2px 6px",
            fontSize: "13px",
          }}
        />
      ) : (
        <span
          onClick={() => {
            setDraft(step.title);
            setEditing(true);
          }}
          style={{
            flex: 1,
            fontSize: "13px",
            cursor: "text",
            color: "var(--color-text-primary)",
            textDecoration: step.completed ? "line-through" : "none",
            opacity: step.completed ? 0.6 : 1,
          }}
        >
          {step.title}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="刪除步驟"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: ProjectCard — title, KR badge, progress, steps, add-step**

```tsx
// src/presentation/components/projects/project-card.tsx
"use client";

import { useState } from "react";
import { Project } from "@/domain/entities/project";
import { ProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRow } from "./project-step-row";

interface Props {
  project: Project;
  steps: ProjectStep[];
  onAddStep: (title: string) => void;
  onRenameStep: (stepId: string, title: string) => void;
  onDeleteStep: (stepId: string) => void;
  onArchiveToggle: () => void;
  onDeleteProject: () => void;
}

export function ProjectCard({
  project,
  steps,
  onAddStep,
  onRenameStep,
  onDeleteStep,
  onArchiveToggle,
  onDeleteProject,
}: Props) {
  const [newStep, setNewStep] = useState("");
  const done = steps.filter((s) => s.completed).length;

  const submit = () => {
    const t = newStep.trim();
    if (!t) return;
    onAddStep(t);
    setNewStep("");
  };

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        opacity: project.status === "archived" ? 0.6 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{project.title}</h3>
        <span
          style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
        >
          {done}/{steps.length}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" onClick={onArchiveToggle} style={smallBtn}>
            {project.status === "archived" ? "取消歸檔" : "歸檔"}
          </button>
          <button type="button" onClick={onDeleteProject} style={smallBtn}>
            刪除
          </button>
        </div>
      </div>

      {steps.map((step) => (
        <ProjectStepRow
          key={step.id}
          step={step}
          onRename={(title) => onRenameStep(step.id, title)}
          onDelete={() => onDeleteStep(step.id)}
        />
      ))}

      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
        <input
          placeholder="＋ 新增步驟"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          style={{
            flex: 1,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "4px 8px",
            fontSize: "13px",
          }}
        />
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontSize: "12px",
  padding: "2px 8px",
};
```

- [ ] **Step 3: ProjectsPageClient — orchestration**

```tsx
// src/presentation/components/projects/projects-page-client.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/domain/entities/project";
import { ProjectStep } from "@/domain/entities/project-step";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import { useNotify } from "@/presentation/providers/notification-provider";
import { ProjectCard } from "./project-card";

export function ProjectsPageClient() {
  const { user } = useAuth();
  const useCases = useUseCases();
  const notify = useNotify();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stepsByProject, setStepsByProject] = useState<
    Record<string, ProjectStep[]>
  >({});
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const list = await useCases.listProjects.execute(user.id);
    setProjects(list);
    const entries = await Promise.all(
      list.map(async (p) => {
        const steps = await useCases.listProjectStepsByProject.execute(p.id);
        return [p.id, steps] as const;
      }),
    );
    setStepsByProject(Object.fromEntries(entries));
  }, [user, useCases]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state set after await, not synchronously
    load().catch((e) => {
      console.error(e);
      notify.error("載入專案失敗");
    });
  }, [load, notify]);

  const visible = projects.filter((p) =>
    showArchived ? true : p.status !== "archived",
  );

  const handleAddProject = async () => {
    if (!user || !newTitle.trim()) return;
    await useCases.createProject.execute(user.id, newTitle.trim());
    setNewTitle("");
    await load();
  };

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
          }}
        >
          Projects
        </h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label
            style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{" "}
            顯示已歸檔
          </label>
          <Link
            href="/"
            style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
          >
            &larr; 回到儀表板
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        <input
          placeholder="新增專案標題"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              handleAddProject().catch((err) => {
                console.error(err);
                notify.error("新增專案失敗");
              });
          }}
          style={{
            flex: 1,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            padding: "8px 12px",
            fontSize: "14px",
          }}
        />
        <button
          type="button"
          onClick={() =>
            handleAddProject().catch((err) => {
              console.error(err);
              notify.error("新增專案失敗");
            })
          }
          style={{
            background: "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#fff",
            cursor: "pointer",
            padding: "8px 16px",
          }}
        >
          ＋ 專案
        </button>
      </div>

      {visible.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          steps={stepsByProject[project.id] ?? []}
          onAddStep={async (title) => {
            await useCases.createProjectStep.execute(project.id, title);
            await load();
          }}
          onRenameStep={async (stepId, title) => {
            await useCases.updateProjectStep.execute(stepId, title);
            await load();
          }}
          onDeleteStep={async (stepId) => {
            await useCases.deleteProjectStep.execute(stepId);
            await load();
          }}
          onArchiveToggle={async () => {
            await useCases.updateProject.execute(project.id, {
              title: project.title,
              keyResultId: project.keyResultId,
              status: project.status === "archived" ? "active" : "archived",
            });
            await load();
          }}
          onDeleteProject={async () => {
            await useCases.deleteProject.execute(project.id);
            await load();
          }}
        />
      ))}
    </div>
  );
}
```

> Note on the eslint-disable: the OKR page (`okr-page-client.tsx`) established this exact accepted suppression for `react-hooks/set-state-in-effect` on async loaders (the setState runs after `await`, not synchronously). Reuse the same one-line comment here.

- [ ] **Step 4: The route**

```tsx
// src/app/projects/page.tsx
"use client";

import { ProjectsPageClient } from "@/presentation/components/projects/projects-page-client";

export default function ProjectsPage() {
  return <ProjectsPageClient />;
}
```

- [ ] **Step 5: Header link to `/projects`**

In `src/presentation/components/header/header.tsx`, add a `Link` to `/projects` next to the existing OKR link (the OKR link sits between the title button and `<WeekNavigator />`). Add immediately after the OKR `<Link>`:

```tsx
      <Link
        href="/projects"
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Projects
      </Link>
```

(`import Link from "next/link";` already exists in header.tsx from the OKR work.)

- [ ] **Step 6: Verify, type-check, lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

Then `pnpm dev` and manually verify:
- Navigate to `/projects`.
- Add a project → card appears.
- Add steps → they list with `○` and the `n/total` counter updates.
- Rename a step (click title), delete a step.
- Archive a project → it dims and hides unless "顯示已歸檔" is checked; un-archive restores it.
- Delete a project → it disappears.
- Reload → data persists (Supabase). Step completion has no toggle here (expected — that's Plan 2).

- [ ] **Step 7: Commit**

```bash
git add src/app/projects/page.tsx src/presentation/components/projects/ src/presentation/components/header/header.tsx
git commit -m "feat: add Projects planning page"
```

---

## Task 12: Full test + gate

- [ ] **Step 1: Whole suite**

Run: `pnpm vitest run`
Expected: PASS — all existing tests plus the new Project entity / repo / use-case tests.

- [ ] **Step 2: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit (only if fixups were needed)**

```bash
git add -A
git commit -m "chore: GTD projects foundation green (tests + lint)"
```

---

## Done — Plan 1 outcome

A user can create projects, set them active/archived, manage an ordered step checklist, and (in Plan 2) optionally link a KR. Data persists via Supabase, fully covered by entity/repo/use-case tests. **Block linking + the step-completion checklist in the block side panel are Plan 2** (`docs/superpowers/plans/2026-06-11-gtd-projects-block-integration.md`). The "歸屬 KR" selector on the project card is also deferred to Plan 2 (it needs the KR option list); for now `keyResultId` stays null via the create flow.
