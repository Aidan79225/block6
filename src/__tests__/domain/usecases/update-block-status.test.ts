import { describe, it, expect, vi } from "vitest";
import { UpdateBlockStatusUseCase } from "@/domain/usecases/update-block-status";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockType, BlockStatus } from "@/domain/entities/block";

const makeRepo = (): BlockRepository => ({
  findByWeekPlan: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

const existingBlock: Block = {
  id: "block-1",
  weekPlanId: "week-1",
  dayOfWeek: 2,
  slot: 3,
  blockType: BlockType.Core,
  title: "Work",
  description: "",
  status: BlockStatus.Planned,
};

describe("UpdateBlockStatusUseCase", () => {
  it("updates block status successfully", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existingBlock);
    vi.mocked(repo.update).mockResolvedValue(undefined);

    const useCase = new UpdateBlockStatusUseCase(repo);
    const result = await useCase.execute("block-1", BlockStatus.Completed);

    expect(result.id).toBe("block-1");
    expect(result.status).toBe(BlockStatus.Completed);
    expect(repo.update).toHaveBeenCalledOnce();
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ status: BlockStatus.Completed }));
  });

  it("throws 'Block not found' when block does not exist", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);

    const useCase = new UpdateBlockStatusUseCase(repo);
    await expect(useCase.execute("missing-id", BlockStatus.Completed)).rejects.toThrow("Block not found");
  });
});
