import type { Block } from "@/domain/entities/block";
import {
  latestRhythmSlots,
  rhythmSlotsForWeek,
} from "@/domain/entities/rhythm";
import {
  createRhythmSlot,
  type RhythmSlot,
} from "@/domain/entities/rhythm-slot";
import type { RhythmRepository } from "@/domain/repositories/rhythm-repository";
import type { WeekHistoryRepository } from "@/domain/repositories/week-history-repository";
import { projectRhythmOntoWeek } from "@/domain/usecases/project-rhythm-onto-week";
import { addWeeks, formatDateKey, getMonday } from "@/lib/date-helpers";

/** How many past weeks a slot must hold the same thing to look standing. */
export const STABLE_WEEKS = 3;
/** Fewer stable slots than a day's worth is not worth interrupting for. */
export const MIN_SUGGESTED_SLOTS = 6;

const sameSlot = (a: { dayOfWeek: number; slot: number }, b: typeof a) =>
  a.dayOfWeek === b.dayOfWeek && a.slot === b.slot;

/**
 * Slots that held the same titled activity, of the same type, in every one of
 * the given weeks. Described as the most recent week has them.
 */
export function stableSlots(
  weeks: readonly (readonly Block[])[],
): RhythmSlot[] {
  if (weeks.length === 0) return [];
  const [latest, ...earlier] = weeks;
  return latest
    .filter((b) => !b.suppressed && b.title.trim())
    .filter((b) =>
      earlier.every((week) =>
        week.some(
          (other) =>
            sameSlot(other, b) &&
            !other.suppressed &&
            other.title.trim() === b.title.trim() &&
            other.blockType === b.blockType,
        ),
      ),
    )
    .map((b) =>
      createRhythmSlot({
        dayOfWeek: b.dayOfWeek,
        slot: b.slot,
        blockType: b.blockType,
        title: b.title.trim(),
        description: b.description,
      }),
    );
}

/**
 * What the rhythm is missing: stable slots it does not already hold the same
 * way — but only once there are enough of them to be worth asking about.
 */
export function rhythmSuggestion(
  weeks: readonly (readonly Block[])[],
  rhythm: readonly RhythmSlot[],
): RhythmSlot[] {
  const missing = stableSlots(weeks).filter(
    (s) =>
      !rhythm.some(
        (r) =>
          sameSlot(r, s) && r.title === s.title && r.blockType === s.blockType,
      ),
  );
  return missing.length >= MIN_SUGGESTED_SLOTS ? missing : [];
}

/** The rhythm with `additions` written over the slots they cover. */
export function mergeIntoRhythm(
  rhythm: readonly RhythmSlot[],
  additions: readonly RhythmSlot[],
): RhythmSlot[] {
  return [
    ...rhythm.filter((r) => !additions.some((a) => sameSlot(a, r))),
    ...additions,
  ];
}

/** The past weeks a suggestion looks at, most recent first. */
export function suggestionWeekKeys(today: Date): string[] {
  const current = formatDateKey(getMonday(today));
  return Array.from({ length: STABLE_WEEKS }, (_, i) =>
    addWeeks(current, -(i + 1)),
  );
}

/**
 * Notice what has quietly become a standing rhythm: slots the last few weeks
 * all held the same way, which the rhythm does not hold yet.
 */
export class SuggestRhythmUseCase {
  constructor(
    private readonly history: WeekHistoryRepository,
    private readonly rhythms: RhythmRepository,
  ) {}

  async execute(userId: string, today: Date): Promise<RhythmSlot[]> {
    const weekKeys = suggestionWeekKeys(today);
    const [stored, rhythmHistory] = await Promise.all([
      this.history.blocksBetween(userId, weekKeys.at(-1)!, weekKeys[0]),
      this.rhythms.findHistory(userId),
    ]);
    const weeks = weekKeys.map((weekKey) =>
      projectRhythmOntoWeek({
        rhythm: rhythmSlotsForWeek(rhythmHistory, weekKey),
        overrides: stored[weekKey] ?? [],
        weekKey,
      }),
    );
    return rhythmSuggestion(weeks, latestRhythmSlots(rhythmHistory));
  }
}
