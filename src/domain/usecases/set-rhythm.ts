import type { Block } from "@/domain/entities/block";
import { Rhythm, createRhythm } from "@/domain/entities/rhythm";
import { RhythmSlot, createRhythmSlot } from "@/domain/entities/rhythm-slot";
import { RhythmRepository } from "@/domain/repositories/rhythm-repository";
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

/** The rhythm a week describes: every slot it visibly holds. */
export function rhythmSlotsFromWeek(blocks: readonly Block[]): RhythmSlot[] {
  return blocks
    .filter((b) => !b.suppressed)
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
