import { Block } from "@/domain/entities/block";

export interface BlockRepository {
  findByWeekPlan(weekPlanId: string): Promise<Block[]>;
  findById(id: string): Promise<Block | null>;
  save(block: Block): Promise<void>;
  update(block: Block): Promise<void>;
}
