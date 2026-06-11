import { describe, it, expect } from "vitest";
import { InMemoryProjectRepository } from "@/infrastructure/in-memory/repositories/in-memory-project-repository";
import { createProject, Project } from "@/domain/entities/project";

const project = (id: string, userId: string, position: number): Project =>
  createProject({ id, userId, title: `project-${id}`, position, createdAt: new Date() });

describe("InMemoryProjectRepository", () => {
  it("finds a user's projects sorted by position", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-2", "u-1", 1));
    await repo.add(project("p-1", "u-1", 0));
    await repo.add(project("p-3", "u-2", 0));
    expect((await repo.findForUser("u-1")).map((p) => p.id)).toEqual(["p-1", "p-2"]);
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
    expect((await repo.findForUser("u-1")).map((p) => p.id)).toEqual(["p-2", "p-1"]);
  });

  it("throws when adding a duplicate id", async () => {
    const repo = new InMemoryProjectRepository();
    await repo.add(project("p-1", "u-1", 0));
    await expect(repo.add(project("p-1", "u-1", 0))).rejects.toThrow();
  });
});
