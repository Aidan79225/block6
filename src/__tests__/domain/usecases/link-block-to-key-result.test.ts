import { describe, it, expect, vi } from "vitest";
import { LinkBlockToKeyResultUseCase } from "@/domain/usecases/link-block-to-key-result";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockStatus, BlockType } from "@/domain/entities/block";

const block: Block = { id: "b-1", weekPlanId: "wp-1", dayOfWeek: 1, slot: 1, blockType: BlockType.Core, title: "讀書", description: "", status: BlockStatus.Planned, keyResultId: null, projectId: null, suppressed: false };

const makeRepo = (): BlockRepository => ({ findByWeekPlan: vi.fn(), findById: vi.fn(), save: vi.fn(), update: vi.fn() });

describe("LinkBlockToKeyResultUseCase", () => {
  it("sets the keyResultId", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(block);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToKeyResultUseCase(repo).execute("b-1", "k-1");
    expect(result.keyResultId).toBe("k-1");
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ id: "b-1", keyResultId: "k-1" }));
  });

  it("clears the keyResultId when given null", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue({ ...block, keyResultId: "k-1" });
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToKeyResultUseCase(repo).execute("b-1", null);
    expect(result.keyResultId).toBeNull();
  });

  it("throws when the block is missing", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(new LinkBlockToKeyResultUseCase(repo).execute("nope", "k-1")).rejects.toThrow("Block nope not found");
  });
});
