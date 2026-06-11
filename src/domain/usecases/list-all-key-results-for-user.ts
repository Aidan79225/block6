import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { KeyResultOption } from "@/domain/usecases/list-key-results-for-week";

export class ListAllKeyResultsForUserUseCase {
  constructor(
    private readonly cycleRepo: OkrCycleRepository,
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly keyResultRepo: KeyResultRepository,
  ) {}

  async execute(userId: string): Promise<KeyResultOption[]> {
    const cycles = await this.cycleRepo.findForUser(userId);
    const options: KeyResultOption[] = [];
    for (const cycle of cycles) {
      const objectives = await this.objectiveRepo.findByCycle(cycle.id);
      for (const objective of objectives) {
        const krs = await this.keyResultRepo.findByObjective(objective.id);
        for (const kr of krs) {
          options.push({ keyResultId: kr.id, title: kr.title, objectiveTitle: objective.title });
        }
      }
    }
    return options;
  }
}
