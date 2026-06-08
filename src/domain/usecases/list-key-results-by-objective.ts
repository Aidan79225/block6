import { KeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class ListKeyResultsByObjectiveUseCase {
  constructor(private readonly repo: KeyResultRepository) {}
  execute(objectiveId: string): Promise<KeyResult[]> {
    return this.repo.findByObjective(objectiveId);
  }
}
