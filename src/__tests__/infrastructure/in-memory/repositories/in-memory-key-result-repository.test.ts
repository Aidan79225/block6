import { describe, it, expect } from "vitest";
import { InMemoryKeyResultRepository } from "@/infrastructure/in-memory/repositories/in-memory-key-result-repository";
import { createKeyResult, KeyResult } from "@/domain/entities/key-result";

const kr = (id: string, objectiveId: string, position: number): KeyResult =>
  createKeyResult({
    id,
    objectiveId,
    title: `kr-${id}`,
    unit: "本",
    targetValue: 10,
    currentValue: 0,
    position,
    createdAt: new Date(),
  });

describe("InMemoryKeyResultRepository", () => {
  it("finds by objective sorted by position", async () => {
    const repo = new InMemoryKeyResultRepository();
    await repo.add(kr("k-2", "o-1", 1));
    await repo.add(kr("k-1", "o-1", 0));
    await repo.add(kr("k-3", "o-2", 0));
    const found = await repo.findByObjective("o-1");
    expect(found.map((k) => k.id)).toEqual(["k-1", "k-2"]);
  });

  it("updates currentValue via update", async () => {
    const repo = new InMemoryKeyResultRepository();
    await repo.add(kr("k-1", "o-1", 0));
    const existing = await repo.findById("k-1");
    await repo.update({ ...existing!, currentValue: 5 });
    expect((await repo.findById("k-1"))?.currentValue).toBe(5);
  });

  it("reorders key results by id order", async () => {
    const repo = new InMemoryKeyResultRepository();
    await repo.add(kr("k-1", "o-1", 0));
    await repo.add(kr("k-2", "o-1", 1));
    await repo.reorder(["k-2", "k-1"]);
    expect((await repo.findByObjective("o-1")).map((k) => k.id)).toEqual([
      "k-2",
      "k-1",
    ]);
  });
});
