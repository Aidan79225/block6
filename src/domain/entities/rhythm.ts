import type { RhythmSlot } from "./rhythm-slot";

/**
 * One version of the user's recurring weekly rhythm — the background plan that
 * weeks start from. A version governs every week from `effectiveFrom` (a
 * Monday week key) until a later version takes over, so changing the rhythm
 * never rewrites a week that was already planned under the old one.
 */
export interface Rhythm {
  readonly id: string;
  readonly userId: string;
  readonly effectiveFrom: string;
  readonly slots: readonly RhythmSlot[];
}

export function createRhythm(input: Rhythm): Rhythm {
  const seen = new Set<string>();
  for (const s of input.slots) {
    const key = `${s.dayOfWeek}-${s.slot}`;
    if (seen.has(key)) throw new Error(`Duplicate rhythm slot ${key}`);
    seen.add(key);
  }
  return { ...input, slots: [...input.slots] };
}

/**
 * The rhythm slots that govern `weekKey`: those of the latest version that
 * took effect on or before it. Weeks before the first version get none — the
 * rhythm is never projected onto a week that was planned without one.
 */
export function rhythmSlotsForWeek(
  history: readonly Rhythm[],
  weekKey: string,
): readonly RhythmSlot[] {
  return newest(history.filter((v) => v.effectiveFrom <= weekKey))?.slots ?? [];
}

/** The newest version — the rhythm that weeks ahead will start from. */
export function latestRhythmSlots(
  history: readonly Rhythm[],
): readonly RhythmSlot[] {
  return newest(history)?.slots ?? [];
}

function newest(versions: readonly Rhythm[]): Rhythm | null {
  let result: Rhythm | null = null;
  for (const v of versions) {
    if (!result || v.effectiveFrom > result.effectiveFrom) result = v;
  }
  return result;
}

/**
 * Add `rhythm` to the history. It supersedes any version starting on or after
 * it, which is what adopting a rhythm twice before it takes effect means.
 */
export function adoptRhythm(
  history: readonly Rhythm[],
  rhythm: Rhythm,
): Rhythm[] {
  return [
    ...history.filter((v) => v.effectiveFrom < rhythm.effectiveFrom),
    rhythm,
  ];
}
