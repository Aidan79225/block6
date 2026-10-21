import { describe, it, expect } from "vitest";
import { SetBlockRegrettedUseCase } from "@/domain/usecases/set-block-regretted";
import { InMemoryBlockRepository } from "@/infrastructure/in-memory/repositories/in-memory-block-repository";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";

async function repoWithBlock() {
  const repo = new InMemoryBlockRepository();
  await repo.save(
    createBlock({
      id: "b1",
      weekPlanId: "wp-1",
      dayOfWeek: 2,
      slot: 4,
      blockType: BlockType.General,
      title: "開會",
      description: "",
      status: BlockStatus.Completed,
    }),
  );
  return repo;
}

describe("SetBlockRegrettedUseCase", () => {
  it("marks a block as not worth it, leaving the rest as it was", async () => {
    const repo = await repoWithBlock();
    const updated = await new SetBlockRegrettedUseCase(repo).execute(
      "b1",
      true,
    );
    expect(updated.regretted).toBe(true);
    expect(updated.status).toBe(BlockStatus.Completed);
    expect((await repo.findById("b1"))?.regretted).toBe(true);
  });

  it("takes the mark back", async () => {
    const repo = await repoWithBlock();
    const useCase = new SetBlockRegrettedUseCase(repo);
    await useCase.execute("b1", true);
    await useCase.execute("b1", false);
    expect((await repo.findById("b1"))?.regretted).toBe(false);
  });

  it("refuses a block that does not exist", async () => {
    const repo = await repoWithBlock();
    await expect(
      new SetBlockRegrettedUseCase(repo).execute("nope", true),
    ).rejects.toThrow("Block not found");
  });
});
