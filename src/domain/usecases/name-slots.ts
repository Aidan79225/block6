import {
  Block,
  BlockStatus,
  BlockType,
  createBlock,
} from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";
import type { SlotPosition } from "@/domain/usecases/slot-range";

export interface NameSlotsInput {
  weekPlanId: string;
  slots: readonly SlotPosition[];
  blockType: BlockType;
  title: string;
}

/**
 * The blocks a range holds once it is named. Blocks already stored there keep
 * their status, description and links; empty or suppressed slots are filled
 * with new planned blocks.
 */
export function nameBlocks(
  stored: readonly Block[],
  input: NameSlotsInput,
): Block[] {
  return input.slots.map((p) => {
    const existing = stored.find(
      (b) => b.dayOfWeek === p.dayOfWeek && b.slot === p.slot,
    );
    if (existing) {
      return createBlock({
        ...existing,
        blockType: input.blockType,
        title: input.title,
        suppressed: false,
      });
    }
    return createBlock({
      id: crypto.randomUUID(),
      weekPlanId: input.weekPlanId,
      dayOfWeek: p.dayOfWeek,
      slot: p.slot,
      blockType: input.blockType,
      title: input.title,
      description: "",
      status: BlockStatus.Planned,
    });
  });
}

/**
 * Give a whole range of slots one type and title in a single write — one
 * planning decision for many hours.
 */
export class NameSlotsUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(input: NameSlotsInput): Promise<Block[]> {
    const stored = await this.repo.findByWeekPlan(input.weekPlanId);
    const named = nameBlocks(stored, input);
    await this.repo.saveAll(named);
    return named;
  }
}
