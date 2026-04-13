import { Block, BlockStatus } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export class UpdateBlockStatusUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(blockId: string, status: BlockStatus): Promise<Block> {
    const existing = await this.repo.findById(blockId);
    if (!existing) throw new Error("Block not found");

    const updated: Block = { ...existing, status };
    await this.repo.update(updated);
    return updated;
  }
}
