import type { Block } from "@/domain/entities/block";
import { Rhythm, createRhythm } from "@/domain/entities/rhythm";
import { RhythmSlot, createRhythmSlot } from "@/domain/entities/rhythm-slot";
import { RhythmRepository } from "@/domain/repositories/rhythm-repository";
import type { SlotPosition } from "@/domain/usecases/slot-range";
import { formatDateKey, getMonday } from "@/lib/date-helpers";

/**
 * The week a newly adopted rhythm starts governing: the one after `today`'s.
 * The current week was already planned, and partly lived, under whatever
 * governed it before — adopting a rhythm must not rewrite it.
 */
export function rhythmStartAfter(today: Date): string {
  const monday = getMonday(today);
  monday.setDate(monday.getDate() + 7);
  return formatDateKey(monday);
}

/**
 * The rhythm a week describes: every slot it visibly holds, except blocks
 * marked in review as not worth it — those should not come back every week.
 */
export function rhythmSlotsFromWeek(blocks: readonly Block[]): RhythmSlot[] {
  return blocks
    .filter((b) => !b.suppressed && !b.regretted)
    .map((b) =>
      createRhythmSlot({
        dayOfWeek: b.dayOfWeek,
        slot: b.slot,
        blockType: b.blockType,
        title: b.title,
        description: b.description,
      }),
    );
}

/** The rhythm without the given slots. */
export function rhythmWithout(
  rhythm: readonly RhythmSlot[],
  remove: readonly SlotPosition[],
): RhythmSlot[] {
  return rhythm.filter(
    (r) =>
      !remove.some((p) => p.dayOfWeek === r.dayOfWeek && p.slot === r.slot),
  );
}

/**
 * Slots of regretted blocks that the rhythm would bring back every week:
 * the rhythm still puts the same title and type there.
 */
export function regrettedRhythmSlots(
  blocks: readonly Block[],
  rhythm: readonly RhythmSlot[],
): SlotPosition[] {
  return blocks
    .filter((b) => b.regretted)
    .filter((b) =>
      rhythm.some(
        (r) =>
          r.dayOfWeek === b.dayOfWeek &&
          r.slot === b.slot &&
          r.title === b.title &&
          r.blockType === b.blockType,
      ),
    )
    .map((b) => ({ dayOfWeek: b.dayOfWeek, slot: b.slot }));
}

export interface SetRhythmInput {
  userId: string;
  /** The new rhythm. Empty clears it from the next week on. */
  slots: readonly RhythmSlot[];
  today: Date;
}

export class SetRhythmUseCase {
  constructor(private readonly repo: RhythmRepository) {}

  async execute(input: SetRhythmInput): Promise<Rhythm> {
    const rhythm = createRhythm({
      id: crypto.randomUUID(),
      userId: input.userId,
      effectiveFrom: rhythmStartAfter(input.today),
      slots: input.slots,
    });
    await this.repo.save(rhythm);
    return rhythm;
  }
}
