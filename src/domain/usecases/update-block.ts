import { Block, BlockStatus, BlockType, createBlock } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export interface UpdateBlockInput {
  weekPlanId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
}

export class UpdateBlockUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(input: UpdateBlockInput): Promise<Block> {
    const blocks = await this.repo.findByWeekPlan(input.weekPlanId);
    const existing = blocks.find(
      (b) => b.dayOfWeek === input.dayOfWeek && b.slot === input.slot
    );

    if (existing) {
      const updated: Block = {
        ...existing,
        blockType: input.blockType,
        title: input.title,
        description: input.description,
      };
      await this.repo.update(updated);
      return updated;
    }

    const block = createBlock({
      id: crypto.randomUUID(),
      weekPlanId: input.weekPlanId,
      dayOfWeek: input.dayOfWeek,
      slot: input.slot,
      blockType: input.blockType,
      title: input.title,
      description: input.description,
      status: BlockStatus.Planned,
    });

    await this.repo.save(block);
    return block;
  }
}
