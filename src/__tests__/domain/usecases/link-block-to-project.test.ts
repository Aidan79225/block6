import { describe, it, expect, vi } from "vitest";
import { LinkBlockToProjectUseCase } from "@/domain/usecases/link-block-to-project";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { Block, BlockStatus, BlockType } from "@/domain/entities/block";

const block: Block = {
  id: "b-1",
  weekPlanId: "wp-1",
  dayOfWeek: 1,
  slot: 1,
  blockType: BlockType.Core,
  title: "做專案",
  description: "",
  status: BlockStatus.Planned,
  keyResultId: null,
  projectId: null,
};

const makeRepo = (): BlockRepository => ({
  findByWeekPlan: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

describe("LinkBlockToProjectUseCase", () => {
  it("sets the projectId", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(block);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToProjectUseCase(repo).execute("b-1", "p-1");
    expect(result.projectId).toBe("p-1");
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ id: "b-1", projectId: "p-1" }));
  });

  it("clears the projectId when given null", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue({ ...block, projectId: "p-1" });
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new LinkBlockToProjectUseCase(repo).execute("b-1", null);
    expect(result.projectId).toBeNull();
  });

  it("throws when the block is missing", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(new LinkBlockToProjectUseCase(repo).execute("nope", "p-1")).rejects.toThrow("Block nope not found");
  });
});
