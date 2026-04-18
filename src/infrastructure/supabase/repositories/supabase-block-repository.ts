import type { Block } from "@/domain/entities/block";
import type { BlockRepository } from "@/domain/repositories/block-repository";
import {
  fetchBlockById,
  fetchBlocksByWeekPlanId,
  insertBlockRow,
  updateBlockRow,
} from "@/infrastructure/supabase/database";

export class SupabaseBlockRepository implements BlockRepository {
  async findByWeekPlan(weekPlanId: string): Promise<Block[]> {
    return fetchBlocksByWeekPlanId(weekPlanId);
  }

  async findById(id: string): Promise<Block | null> {
    return fetchBlockById(id);
  }

  async save(block: Block): Promise<void> {
    return insertBlockRow(block);
  }

  async update(block: Block): Promise<void> {
    return updateBlockRow(block);
  }
}
