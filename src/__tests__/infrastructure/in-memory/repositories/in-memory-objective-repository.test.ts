import { describe, it, expect } from "vitest";
import { InMemoryObjectiveRepository } from "@/infrastructure/in-memory/repositories/in-memory-objective-repository";
import { createObjective, Objective } from "@/domain/entities/objective";

const obj = (id: string, cycleId: string, position: number): Objective =>
  createObjective({
    id,
    cycleId,
    title: `obj-${id}`,
    description: "",
    position,
    createdAt: new Date(),
  });

describe("InMemoryObjectiveRepository", () => {
  it("finds by cycle sorted by position", async () => {
    const repo = new InMemoryObjectiveRepository();
    await repo.add(obj("o-2", "c-1", 1));
    await repo.add(obj("o-1", "c-1", 0));
    await repo.add(obj("o-3", "c-2", 0));
    const found = await repo.findByCycle("c-1");
    expect(found.map((o) => o.id)).toEqual(["o-1", "o-2"]);
  });

  it("reorders objectives by id order", async () => {
    const repo = new InMemoryObjectiveRepository();
    await repo.add(obj("o-1", "c-1", 0));
    await repo.add(obj("o-2", "c-1", 1));
    await repo.reorder(["o-2", "o-1"]);
    const found = await repo.findByCycle("c-1");
    expect(found.map((o) => o.id)).toEqual(["o-2", "o-1"]);
  });

  it("deletes an objective", async () => {
    const repo = new InMemoryObjectiveRepository();
    await repo.add(obj("o-1", "c-1", 0));
    await repo.delete("o-1");
    expect(await repo.findById("o-1")).toBeNull();
  });
});
