import type { Block } from "@/domain/entities/block";
import type { BlockRepository } from "@/domain/repositories/block-repository";

export class InMemoryBlockRepository implements BlockRepository {
  private readonly byId = new Map<string, Block>();

  async findByWeekPlan(weekPlanId: string): Promise<Block[]> {
    return Array.from(this.byId.values()).filter(
      (b) => b.weekPlanId === weekPlanId,
    );
  }

  async findById(id: string): Promise<Block | null> {
    return this.byId.get(id) ?? null;
  }

  async save(block: Block): Promise<void> {
    if (this.byId.has(block.id)) {
      throw new Error(`Block ${block.id} already exists`);
    }
    this.byId.set(block.id, block);
  }

  async update(block: Block): Promise<void> {
    if (!this.byId.has(block.id)) {
      throw new Error(`Block ${block.id} not found`);
    }
    this.byId.set(block.id, block);
  }
}
