import { ProjectStep, createProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class UpdateProjectStepUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(id: string, title: string): Promise<ProjectStep> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`ProjectStep ${id} not found`);
    const updated = createProjectStep({
      id: existing.id,
      projectId: existing.projectId,
      title,
      position: existing.position,
      completed: existing.completed,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
