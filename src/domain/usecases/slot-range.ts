export interface SlotPosition {
  readonly dayOfWeek: number;
  readonly slot: number;
}

const SLOTS_PER_DAY = 6;

/**
 * Every slot in the rectangle spanned by two corners, in either order —
 * day by day, top to bottom within a day.
 */
export function slotRange(a: SlotPosition, b: SlotPosition): SlotPosition[] {
  const [fromDay, toDay] = [a.dayOfWeek, b.dayOfWeek].sort((x, y) => x - y);
  const [fromSlot, toSlot] = [a.slot, b.slot].sort((x, y) => x - y);
  const out: SlotPosition[] = [];
  for (let dayOfWeek = fromDay; dayOfWeek <= toDay; dayOfWeek++) {
    for (let slot = fromSlot; slot <= toSlot; slot++) {
      out.push({ dayOfWeek, slot });
    }
  }
  return out;
}

/** All slots of one day. */
export function daySlots(dayOfWeek: number): SlotPosition[] {
  return slotRange({ dayOfWeek, slot: 1 }, { dayOfWeek, slot: SLOTS_PER_DAY });
}

export function containsSlot(
  range: readonly SlotPosition[],
  dayOfWeek: number,
  slot: number,
): boolean {
  return range.some((p) => p.dayOfWeek === dayOfWeek && p.slot === slot);
}
