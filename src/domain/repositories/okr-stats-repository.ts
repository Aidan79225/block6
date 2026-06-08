import { Block } from "@/domain/entities/block";

export interface OkrStatsRepository {
  countLinkedWeeklyTasksForKeyResult(keyResultId: string): Promise<number>;
  countWeeklyTaskCompletionsForKeyResult(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<number>;
  findBlocksForKeyResultInRange(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<Block[]>;
}
