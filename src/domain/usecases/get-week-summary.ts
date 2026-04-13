import { BlockType, BlockStatus } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export interface TypeStats {
  total: number;
  completed: number;
}

export interface WeekSummary {
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number;
  byType: Record<BlockType, TypeStats>;
}

export class GetWeekSummaryUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(weekPlanId: string): Promise<WeekSummary> {
    const blocks = await this.repo.findByWeekPlan(weekPlanId);

    const byType: Record<BlockType, TypeStats> = {
      [BlockType.Core]:   { total: 0, completed: 0 },
      [BlockType.Rest]:   { total: 0, completed: 0 },
      [BlockType.Buffer]: { total: 0, completed: 0 },
    };

    let completedBlocks = 0;

    for (const block of blocks) {
      byType[block.blockType].total++;
      if (block.status === BlockStatus.Completed) {
        byType[block.blockType].completed++;
        completedBlocks++;
      }
    }

    const totalBlocks = blocks.length;
    const completionRate = totalBlocks === 0 ? 0 : completedBlocks / totalBlocks;

    return { totalBlocks, completedBlocks, completionRate, byType };
  }
}
