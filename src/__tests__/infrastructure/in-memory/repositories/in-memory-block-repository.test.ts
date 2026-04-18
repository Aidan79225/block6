import { describe, it, expect } from "vitest";
import { InMemoryBlockRepository } from "@/infrastructure/in-memory/repositories/in-memory-block-repository";
import {
  BlockType,
  BlockStatus,
  createBlock,
} from "@/domain/entities/block";

function makeBlock(overrides: Partial<Parameters<typeof createBlock>[0]> = {}) {
  return createBlock({
    id: "block-1",
    weekPlanId: "wp-1",
    dayOfWeek: 1,
    slot: 1,
    blockType: BlockType.Core,
    title: "Deep Work",
    description: "",
    status: BlockStatus.Planned,
    ...overrides,
  });
}

describe("InMemoryBlockRepository", () => {
  it("findById returns null for a missing block", async () => {
    const repo = new InMemoryBlockRepository();
    expect(await repo.findById("nope")).toBeNull();
  });

  it("save stores a block; findById returns it", async () => {
    const repo = new InMemoryBlockRepository();
    const b = makeBlock();
    await repo.save(b);
    expect(await repo.findById("block-1")).toEqual(b);
  });

  it("save throws if the id already exists", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(makeBlock());
    await expect(repo.save(makeBlock())).rejects.toThrow(/already exists/);
  });

  it("update replaces an existing block", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(makeBlock({ title: "Old" }));
    await repo.update(makeBlock({ title: "New" }));
    const got = await repo.findById("block-1");
    expect(got?.title).toBe("New");
  });

  it("update throws if the id does not exist", async () => {
    const repo = new InMemoryBlockRepository();
    await expect(repo.update(makeBlock())).rejects.toThrow(/not found/);
  });

  it("findByWeekPlan returns only blocks with the matching weekPlanId", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(makeBlock({ id: "a", weekPlanId: "wp-1" }));
    await repo.save(makeBlock({ id: "b", weekPlanId: "wp-1", slot: 2 }));
    await repo.save(makeBlock({ id: "c", weekPlanId: "wp-2" }));
    const result = await repo.findByWeekPlan("wp-1");
    expect(result.map((b) => b.id).sort()).toEqual(["a", "b"]);
  });

  it("findByWeekPlan returns [] for an unknown weekPlanId", async () => {
    const repo = new InMemoryBlockRepository();
    expect(await repo.findByWeekPlan("missing")).toEqual([]);
  });
});
