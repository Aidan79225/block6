import { BlockType } from "./block";

/**
 * One slot of the user's recurring weekly rhythm — the background plan that
 * every week starts from. There is at most one per (user, dayOfWeek, slot).
 */
export interface RhythmSlot {
  readonly id: string;
  readonly userId: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
  readonly title: string;
  readonly description: string;
}

export interface CreateRhythmSlotInput {
  id: string;
  userId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
}

export function createRhythmSlot(input: CreateRhythmSlotInput): RhythmSlot {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7)
    throw new Error("dayOfWeek must be between 1 and 7");
  if (input.slot < 1 || input.slot > 6)
    throw new Error("slot must be between 1 and 6");
  return { ...input };
}
