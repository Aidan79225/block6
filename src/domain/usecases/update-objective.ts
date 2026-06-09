import { Objective, createObjective } from "@/domain/entities/objective";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export interface UpdateObjectiveInput {
  title: string;
  description: string;
}

export class UpdateObjectiveUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(id: string, input: UpdateObjectiveInput): Promise<Objective> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`Objective ${id} not found`);
    const updated = createObjective({
      id: existing.id,
      cycleId: existing.cycleId,
      title: input.title,
      description: input.description,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
