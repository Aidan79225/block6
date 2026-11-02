import { BlockType } from "../entities/block";

export interface TemplateSlot {
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
}

export interface OccupiedSlot {
  readonly dayOfWeek: number;
  readonly slot: number;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const SLOTS = [1, 2, 3, 4, 5, 6];

/**
 * Default day rhythms, expressed as the block type for slots 1..6.
 *
 * The method's golden ratio is 3 core : 2 flexible : 1 rest per day — the
 * weekend keeps the same proportions but front-loads rest.
 */
const WEEKDAY_RHYTHM: readonly BlockType[] = [
  BlockType.Core,
  BlockType.Core,
  BlockType.General,
  BlockType.Core,
  BlockType.Buffer,
  BlockType.Rest,
];

const WEEKEND_RHYTHM: readonly BlockType[] = [
  BlockType.Rest,
  BlockType.General,
  BlockType.Core,
  BlockType.Core,
  BlockType.Buffer,
  BlockType.Rest,
];

export function getTemplateBlockType(
  dayOfWeek: number,
  slot: number,
): BlockType {
  if (dayOfWeek < 1 || dayOfWeek > 7)
    throw new Error("dayOfWeek must be between 1 and 7");
  if (slot < 1 || slot > 6) throw new Error("slot must be between 1 and 6");
  const rhythm = dayOfWeek >= 6 ? WEEKEND_RHYTHM : WEEKDAY_RHYTHM;
  return rhythm[slot - 1];
}

/**
 * The slots a week template would fill, skipping any slot that already holds a
 * block. Returns them in day-then-slot order so callers can write them
 * predictably.
 */
export function buildWeekTemplate(
  occupied: readonly OccupiedSlot[] = [],
): TemplateSlot[] {
  const taken = new Set(occupied.map((o) => `${o.dayOfWeek}-${o.slot}`));
  const out: TemplateSlot[] = [];
  for (const dayOfWeek of DAYS) {
    for (const slot of SLOTS) {
      if (taken.has(`${dayOfWeek}-${slot}`)) continue;
      out.push({
        dayOfWeek,
        slot,
        blockType: getTemplateBlockType(dayOfWeek, slot),
      });
    }
  }
  return out;
}
