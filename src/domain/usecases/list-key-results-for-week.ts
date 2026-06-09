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
    const ts = weekStart.getTime();
    const cycle = cycles.find((c) => c.startDate.getTime() <= ts && ts <= c.endDate.getTime());
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
