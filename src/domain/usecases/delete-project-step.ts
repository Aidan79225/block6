import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class DeleteProjectStepUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
