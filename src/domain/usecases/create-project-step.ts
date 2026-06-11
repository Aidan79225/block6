import { ProjectStep, createProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class CreateProjectStepUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(projectId: string, title: string): Promise<ProjectStep> {
    const siblings = await this.repo.findByProject(projectId);
    const step = createProjectStep({
      id: crypto.randomUUID(),
      projectId,
      title,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(step);
    return step;
  }
}
