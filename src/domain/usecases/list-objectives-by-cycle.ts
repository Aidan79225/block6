import { Objective } from "@/domain/entities/objective";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class ListObjectivesByCycleUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}
  execute(cycleId: string): Promise<Objective[]> {
    return this.repo.findByCycle(cycleId);
  }
}
