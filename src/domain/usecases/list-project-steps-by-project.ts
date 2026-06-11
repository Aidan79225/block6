import { ProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class ListProjectStepsByProjectUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(projectId: string): Promise<ProjectStep[]> {
    return this.repo.findByProject(projectId);
  }
}
