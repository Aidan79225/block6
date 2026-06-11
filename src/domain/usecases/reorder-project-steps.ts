import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class ReorderProjectStepsUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
