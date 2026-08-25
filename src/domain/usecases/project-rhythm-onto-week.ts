import type { Block } from "../entities/block";
import { BlockStatus, createBlock } from "../entities/block";
import type { RhythmSlot } from "../entities/rhythm-slot";

/**
 * Blocks projected from the rhythm have no database row yet, so they carry a
 * synthetic id. Any write against one has to materialize a real row first.
 */
const RHYTHM_ID_PREFIX = "rhythm:";

export function rhythmBlockId(
  weekKey: string,
  dayOfWeek: number,
  slot: number,
): string {
  return `${RHYTHM_ID_PREFIX}${weekKey}:${dayOfWeek}-${slot}`;
}

export function isRhythmBlockId(id: string): boolean {
  return id.startsWith(RHYTHM_ID_PREFIX);
}

export function parseRhythmBlockId(
  id: string,
): { weekKey: string; dayOfWeek: number; slot: number } | null {
  if (!isRhythmBlockId(id)) return null;
  const match = /^rhythm:(\d{4}-\d{2}-\d{2}):(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  return {
    weekKey: match[1],
    dayOfWeek: Number(match[2]),
    slot: Number(match[3]),
  };
}

export interface ProjectRhythmInput {
  /** The user's recurring rhythm — the background plan. */
  rhythm: readonly RhythmSlot[];
  /** Blocks actually stored for this week — the foreground. */
  overrides: readonly Block[];
  weekKey: string;
  /**
   * Whether the rhythm applies to this week at all. Callers pass false for
   * past weeks: the rhythm describes what you intend to do, so projecting it
   * backwards would invent history that never happened.
   */
  applyRhythm: boolean;
}

/**
 * The read rule for a week: a stored block wins, otherwise the rhythm fills
 * the slot, otherwise the slot is empty. Suppressed blocks leave the slot
 * empty and stop the rhythm from refilling it.
 */
export function projectRhythmOntoWeek({
  rhythm,
  overrides,
  weekKey,
  applyRhythm,
}: ProjectRhythmInput): Block[] {
  const result: Block[] = [];
  const taken = new Set<string>();

  for (const block of overrides) {
    taken.add(`${block.dayOfWeek}-${block.slot}`);
    if (!block.suppressed) result.push(block);
  }

  if (!applyRhythm) return result;

  for (const slot of rhythm) {
    const key = `${slot.dayOfWeek}-${slot.slot}`;
    if (taken.has(key)) continue;
    result.push(
      createBlock({
        id: rhythmBlockId(weekKey, slot.dayOfWeek, slot.slot),
        weekPlanId: weekKey,
        dayOfWeek: slot.dayOfWeek,
        slot: slot.slot,
        blockType: slot.blockType,
        title: slot.title,
        description: slot.description,
        status: BlockStatus.Planned,
      }),
    );
  }

  return result;
}
