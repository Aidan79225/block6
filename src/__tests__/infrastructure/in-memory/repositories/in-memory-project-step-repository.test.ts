import { describe, it, expect } from "vitest";
import { InMemoryProjectStepRepository } from "@/infrastructure/in-memory/repositories/in-memory-project-step-repository";
import { createProjectStep, ProjectStep } from "@/domain/entities/project-step";

const step = (id: string, projectId: string, position: number): ProjectStep =>
  createProjectStep({ id, projectId, title: `step-${id}`, position, createdAt: new Date() });

describe("InMemoryProjectStepRepository", () => {
  it("finds by project sorted by position", async () => {
    const repo = new InMemoryProjectStepRepository();
    await repo.add(step("s-2", "p-1", 1));
    await repo.add(step("s-1", "p-1", 0));
    await repo.add(step("s-3", "p-2", 0));
    expect((await repo.findByProject("p-1")).map((s) => s.id)).toEqual(["s-1", "s-2"]);
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
    expect((await repo.findByProject("p-1")).map((s) => s.id)).toEqual(["s-2", "s-1"]);
  });
});
