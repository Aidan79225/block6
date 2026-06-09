import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export interface KeyResultOption {
  keyResultId: string;
  title: string;
  objectiveTitle: string;
}

export class ListKeyResultsForWeekUseCase {
  constructor(
    private readonly cycleRepo: OkrCycleRepository,
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly keyResultRepo: KeyResultRepository,
  ) {}

  async execute(userId: string, weekStart: Date): Promise<KeyResultOption[]> {
    const cycles = await this.cycleRepo.findForUser(userId);
    // The week spans weekStart (Mon) .. weekStart + 6 days (Sun). A cycle covers
    // the week if their date ranges overlap by any day, so weeks that only
    // partially fall inside the cycle (e.g. a cycle starting mid-week) still match.
    const weekStartTs = weekStart.getTime();
    const weekEndTs = weekStartTs + 6 * 24 * 60 * 60 * 1000;
    const cycle = cycles.find(
      (c) =>
        c.startDate.getTime() <= weekEndTs && weekStartTs <= c.endDate.getTime(),
    );
    if (!cycle) return [];

    const objectives = await this.objectiveRepo.findByCycle(cycle.id);
    const options: KeyResultOption[] = [];
    for (const objective of objectives) {
      const krs = await this.keyResultRepo.findByObjective(objective.id);
      for (const kr of krs) {
        options.push({ keyResultId: kr.id, title: kr.title, objectiveTitle: objective.title });
      }
    }
    return options;
  }
}
