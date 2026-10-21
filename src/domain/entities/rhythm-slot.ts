import { BlockType } from "./block";

/**
 * One slot of a recurring weekly rhythm — what that (day, slot) holds in a
 * typical week. It only exists as part of a {@link Rhythm} version.
 */
export interface RhythmSlot {
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
  readonly title: string;
  readonly description: string;
}

export function createRhythmSlot(input: RhythmSlot): RhythmSlot {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7)
    throw new Error("dayOfWeek must be between 1 and 7");
  if (input.slot < 1 || input.slot > 6)
    throw new Error("slot must be between 1 and 6");
  return { ...input };
}
