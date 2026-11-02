import type { Direction } from "@/domain/entities/direction";
import { rhythmSlotsForWeek } from "@/domain/entities/rhythm";
import type { DirectionRepository } from "@/domain/repositories/direction-repository";
import type { RhythmRepository } from "@/domain/repositories/rhythm-repository";
import type { WeekHistoryRepository } from "@/domain/repositories/week-history-repository";
import {
  weekTrajectory,
  type WeekTrajectory,
} from "@/domain/usecases/direction-trajectory";
import { projectRhythmOntoWeek } from "@/domain/usecases/project-rhythm-onto-week";

export interface DirectionTrajectory {
  directions: Direction[];
  weeks: WeekTrajectory[];
}

/**
 * How the directions fared across a run of weeks. Each week counts what it
 * actually held: its stored blocks, plus the rhythm it was planned under.
 */
export class GetDirectionTrajectoryUseCase {
  constructor(
    private readonly history: WeekHistoryRepository,
    private readonly rhythms: RhythmRepository,
    private readonly directionRepo: DirectionRepository,
  ) {}

  async execute(
    userId: string,
    weekKeys: readonly string[],
  ): Promise<DirectionTrajectory> {
    if (weekKeys.length === 0) return { directions: [], weeks: [] };
    const [stored, rhythmHistory, directions] = await Promise.all([
      this.history.blocksBetween(userId, weekKeys[0], weekKeys.at(-1)!),
      this.rhythms.findHistory(userId),
      this.directionRepo.findForUser(userId),
    ]);
    const weeks = weekKeys.map((weekKey) =>
      weekTrajectory(
        weekKey,
        projectRhythmOntoWeek({
          rhythm: rhythmSlotsForWeek(rhythmHistory, weekKey),
          overrides: stored[weekKey] ?? [],
          weekKey,
        }),
        directions,
      ),
    );
    return { directions, weeks };
  }
}
