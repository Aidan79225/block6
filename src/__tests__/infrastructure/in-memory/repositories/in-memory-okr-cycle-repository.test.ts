import { describe, it, expect } from "vitest";
import { InMemoryOkrCycleRepository } from "@/infrastructure/in-memory/repositories/in-memory-okr-cycle-repository";
import { createOkrCycle, OkrCycle } from "@/domain/entities/okr-cycle";

const cycle = (id: string, userId: string): OkrCycle =>
  createOkrCycle({
    id,
    userId,
    name: `cycle-${id}`,
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-09-30"),
    createdAt: new Date(),
  });

describe("InMemoryOkrCycleRepository", () => {
  it("adds and finds by user", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await repo.add(cycle("c-2", "u-2"));
    const found = await repo.findForUser("u-1");
    expect(found.map((c) => c.id)).toEqual(["c-1"]);
  });

  it("finds by id and returns null when missing", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    expect((await repo.findById("c-1"))?.id).toBe("c-1");
    expect(await repo.findById("nope")).toBeNull();
  });

  it("updates an existing cycle", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await repo.update({ ...cycle("c-1", "u-1"), name: "renamed" });
    expect((await repo.findById("c-1"))?.name).toBe("renamed");
  });

  it("deletes a cycle", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await repo.delete("c-1");
    expect(await repo.findById("c-1")).toBeNull();
  });

  it("throws when adding a duplicate id", async () => {
    const repo = new InMemoryOkrCycleRepository();
    await repo.add(cycle("c-1", "u-1"));
    await expect(repo.add(cycle("c-1", "u-1"))).rejects.toThrow();
  });
});
