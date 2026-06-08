import { Objective, createObjective } from "@/domain/entities/objective";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class CreateObjectiveUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(cycleId: string, title: string, description = ""): Promise<Objective> {
    const siblings = await this.repo.findByCycle(cycleId);
    const objective = createObjective({
      id: crypto.randomUUID(),
      cycleId,
      title,
      description,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(objective);
    return objective;
  }
}
