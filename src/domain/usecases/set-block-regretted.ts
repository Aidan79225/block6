import { Block } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

/** Mark (or unmark) a block as not worth the time it took. */
export class SetBlockRegrettedUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(blockId: string, regretted: boolean): Promise<Block> {
    const existing = await this.repo.findById(blockId);
    if (!existing) throw new Error("Block not found");

    const updated: Block = { ...existing, regretted };
    await this.repo.update(updated);
    return updated;
  }
}
