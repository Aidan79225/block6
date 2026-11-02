import { describe, it, expect } from "vitest";
import { NameSlotsUseCase } from "@/domain/usecases/name-slots";
import { InMemoryBlockRepository } from "@/infrastructure/in-memory/repositories/in-memory-block-repository";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";

const WEEK = "wp-1";

function stored(
  slot: number,
  overrides: Partial<Parameters<typeof createBlock>[0]> = {},
) {
  return createBlock({
    id: `b-${slot}`,
    weekPlanId: WEEK,
    dayOfWeek: 1,
    slot,
    blockType: BlockType.Rest,
    title: "舊標題",
    description: "細項",
    status: BlockStatus.Completed,
    keyResultId: "kr-1",
    ...overrides,
  });
}

async function nameMonday(repo: InMemoryBlockRepository, slots: number[]) {
  return new NameSlotsUseCase(repo).execute({
    weekPlanId: WEEK,
    slots: slots.map((slot) => ({ dayOfWeek: 1, slot })),
    blockType: BlockType.Core,
    title: "上班",
  });
}

describe("NameSlotsUseCase", () => {
  it("creates planned blocks for empty slots", async () => {
    const repo = new InMemoryBlockRepository();
    const named = await nameMonday(repo, [1, 2]);

    expect(named).toHaveLength(2);
    expect(named.every((b) => b.title === "上班")).toBe(true);
    expect(named.every((b) => b.blockType === BlockType.Core)).toBe(true);
    expect(named.every((b) => b.status === BlockStatus.Planned)).toBe(true);
    expect(await repo.findByWeekPlan(WEEK)).toHaveLength(2);
  });

  it("renames a stored block but keeps how it went", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(stored(3));

    const [renamed] = await nameMonday(repo, [3]);

    expect(renamed).toMatchObject({
      id: "b-3",
      title: "上班",
      blockType: BlockType.Core,
      status: BlockStatus.Completed,
      description: "細項",
      keyResultId: "kr-1",
    });
    expect(await repo.findById("b-3")).toEqual(renamed);
  });

  it("fills a slot that was deliberately emptied", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(stored(4, { suppressed: true }));

    const [filled] = await nameMonday(repo, [4]);

    expect(filled.id).toBe("b-4");
    expect(filled.suppressed).toBe(false);
  });

  it("writes stored and new blocks together", async () => {
    const repo = new InMemoryBlockRepository();
    await repo.save(stored(1));

    await nameMonday(repo, [1, 2, 3]);

    const week = await repo.findByWeekPlan(WEEK);
    expect(week.map((b) => b.slot).sort()).toEqual([1, 2, 3]);
    expect(week.every((b) => b.title === "上班")).toBe(true);
  });
});
