import type { SlotPosition } from "@/domain/usecases/slot-range";

export interface RangePlanChange extends SlotPosition {
  action: "edit" | "add";
  reason: string;
}

export interface RangePlanChangesInput {
  slots: readonly SlotPosition[];
  /** Whether a day's plan is locked (today). */
  isLocked: (dayOfWeek: number) => boolean;
  /** Whether a slot already holds a block. */
  isOccupied: (position: SlotPosition) => boolean;
  reason: string;
}

/**
 * The plan changes naming a range makes on the locked part of the week.
 * Renaming a block already on today's plan is a change of plan and carries
 * the reason; filling an empty slot is not, and is logged without one.
 */
export function rangePlanChanges({
  slots,
  isLocked,
  isOccupied,
  reason,
}: RangePlanChangesInput): RangePlanChange[] {
  return slots
    .filter((p) => isLocked(p.dayOfWeek))
    .map((p) =>
      isOccupied(p)
        ? { ...p, action: "edit", reason }
        : { ...p, action: "add", reason: "" },
    );
}

/** Whether naming a range reworks today's plan, and so needs a reason. */
export function rangeNeedsReason(
  input: Omit<RangePlanChangesInput, "reason">,
): boolean {
  return rangePlanChanges({ ...input, reason: "" }).some(
    (c) => c.action === "edit",
  );
}
