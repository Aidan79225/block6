import type { Block } from "@/domain/entities/block";
import type { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import {
  countLinkedWeeklyTasks,
  countWeeklyTaskCompletionsForKeyResult,
  fetchBlocksForKeyResultInRange,
} from "@/infrastructure/supabase/database";

export class SupabaseOkrStatsRepository implements OkrStatsRepository {
  countLinkedWeeklyTasksForKeyResult(keyResultId: string): Promise<number> {
    return countLinkedWeeklyTasks(keyResultId);
  }
  countWeeklyTaskCompletionsForKeyResult(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<number> {
    return countWeeklyTaskCompletionsForKeyResult(keyResultId, startKey, endKey);
  }
  findBlocksForKeyResultInRange(
    keyResultId: string,
    startKey: string,
    endKey: string,
  ): Promise<Block[]> {
    return fetchBlocksForKeyResultInRange(keyResultId, startKey, endKey);
  }
}
