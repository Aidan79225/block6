import { describe, it, expect, vi } from "vitest";
import { UpdateBlockUseCase } from "@/domain/usecases/update-block";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockType, BlockStatus } from "@/domain/entities/block";

const makeRepo = (): BlockRepository => ({
  findByWeekPlan: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

const baseInput = {
  weekPlanId: "week-1",
  dayOfWeek: 1,
  slot: 2,
  blockType: BlockType.Core,
  title: "Deep Work",
  description: "Focus session",
};

describe("UpdateBlockUseCase", () => {
  it("creates a new block when none exists for that slot", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByWeekPlan).mockResolvedValue([]);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const useCase = new UpdateBlockUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.weekPlanId).toBe(baseInput.weekPlanId);
    expect(result.dayOfWeek).toBe(baseInput.dayOfWeek);
    expect(result.slot).toBe(baseInput.slot);
    expect(result.blockType).toBe(baseInput.blockType);
    expect(result.title).toBe(baseInput.title);
    expect(result.status).toBe(BlockStatus.Planned);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates an existing block when one exists for that slot", async () => {
    const repo = makeRepo();
    const existing: Block = {
      id: "block-existing",
      weekPlanId: "week-1",
      dayOfWeek: 1,
      slot: 2,
      blockType: BlockType.Rest,
      title: "Old Title",
      description: "Old desc",
      status: BlockStatus.Planned,
    };
    vi.mocked(repo.findByWeekPlan).mockResolvedValue([existing]);
    vi.mocked(repo.update).mockResolvedValue(undefined);

    const useCase = new UpdateBlockUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.id).toBe(existing.id);
    expect(result.blockType).toBe(baseInput.blockType);
    expect(result.title).toBe(baseInput.title);
    expect(repo.update).toHaveBeenCalledOnce();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
