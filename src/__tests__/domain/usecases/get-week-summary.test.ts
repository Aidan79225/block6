import { describe, it, expect, vi } from "vitest";
import { GetWeekSummaryUseCase } from "@/domain/usecases/get-week-summary";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockType, BlockStatus } from "@/domain/entities/block";

const makeRepo = (): BlockRepository => ({
  findByWeekPlan: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

describe("GetWeekSummaryUseCase", () => {
  it("returns correct summary for a week with 4 blocks (2 completed)", async () => {
    const repo = makeRepo();
    const blocks: Block[] = [
      {
        id: "b1",
        weekPlanId: "week-1",
        dayOfWeek: 1,
        slot: 1,
        blockType: BlockType.Core,
        title: "T1",
        description: "",
        status: BlockStatus.Completed,
      },
      {
        id: "b2",
        weekPlanId: "week-1",
        dayOfWeek: 1,
        slot: 2,
        blockType: BlockType.Core,
        title: "T2",
        description: "",
        status: BlockStatus.Planned,
      },
      {
        id: "b3",
        weekPlanId: "week-1",
        dayOfWeek: 2,
        slot: 1,
        blockType: BlockType.Rest,
        title: "T3",
        description: "",
        status: BlockStatus.Completed,
      },
      {
        id: "b4",
        weekPlanId: "week-1",
        dayOfWeek: 2,
        slot: 2,
        blockType: BlockType.Buffer,
        title: "T4",
        description: "",
        status: BlockStatus.Planned,
      },
    ];
    vi.mocked(repo.findByWeekPlan).mockResolvedValue(blocks);

    const useCase = new GetWeekSummaryUseCase(repo);
    const summary = await useCase.execute("week-1");

    expect(summary.totalBlocks).toBe(4);
    expect(summary.completedBlocks).toBe(2);
    expect(summary.completionRate).toBeCloseTo(0.5);

    expect(summary.byType[BlockType.Core].total).toBe(2);
    expect(summary.byType[BlockType.Core].completed).toBe(1);

    expect(summary.byType[BlockType.Rest].total).toBe(1);
    expect(summary.byType[BlockType.Rest].completed).toBe(1);

    expect(summary.byType[BlockType.Buffer].total).toBe(1);
    expect(summary.byType[BlockType.Buffer].completed).toBe(0);
  });

  it("returns zero counts and rate=0 for an empty week plan", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByWeekPlan).mockResolvedValue([]);

    const useCase = new GetWeekSummaryUseCase(repo);
    const summary = await useCase.execute("week-empty");

    expect(summary.totalBlocks).toBe(0);
    expect(summary.completedBlocks).toBe(0);
    expect(summary.completionRate).toBe(0);

    expect(summary.byType[BlockType.Core].total).toBe(0);
    expect(summary.byType[BlockType.Rest].total).toBe(0);
    expect(summary.byType[BlockType.Buffer].total).toBe(0);
  });
});
