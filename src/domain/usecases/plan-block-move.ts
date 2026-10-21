import type { Block } from "../entities/block";
import type { RhythmSlot } from "../entities/rhythm-slot";

interface SlotPosition {
  readonly dayOfWeek: number;
  readonly slot: number;
}

export interface BlockMovePlan {
  /**
   * A suppressed row already holding the target slot. It looks empty, but its
   * row still occupies the slot, so the moving block trades places with it
   * instead of colliding with it.
   */
  displacedSuppressedId: string | null;
  /**
   * The rhythm slot behind the vacated slot, if any. The vacated slot then
   * has to be recorded as deliberately empty, or the rhythm would refill it
   * and turn the move into a copy.
   */
  vacatedRhythmSlot: RhythmSlot | null;
}

export interface PlanBlockMoveInput {
  /** Every row stored for the week, suppressed ones included. */
  overrides: readonly Block[];
  /** The rhythm governing the week. */
  rhythm: readonly RhythmSlot[];
  from: SlotPosition;
  to: SlotPosition;
}

/** What moving a block into an empty-looking slot has to write. */
export function planBlockMove({
  overrides,
  rhythm,
  from,
  to,
}: PlanBlockMoveInput): BlockMovePlan {
  const displaced = overrides.find(
    (b) => b.suppressed && b.dayOfWeek === to.dayOfWeek && b.slot === to.slot,
  );
  return {
    displacedSuppressedId: displaced?.id ?? null,
    vacatedRhythmSlot:
      rhythm.find(
        (r) => r.dayOfWeek === from.dayOfWeek && r.slot === from.slot,
      ) ?? null,
  };
}
