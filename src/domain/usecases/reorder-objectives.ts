import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class ReorderObjectivesUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
