import { Block } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export class LinkBlockToProjectUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(blockId: string, projectId: string | null): Promise<Block> {
    const existing = await this.repo.findById(blockId);
    if (!existing) throw new Error(`Block ${blockId} not found`);
    const updated: Block = { ...existing, projectId };
    await this.repo.update(updated);
    return updated;
  }
}
