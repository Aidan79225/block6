import { ProjectStep, createProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class ToggleProjectStepCompletedUseCase {
  constructor(private readonly repo: ProjectStepRepository) {}

  async execute(id: string, completed: boolean): Promise<ProjectStep> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`ProjectStep ${id} not found`);
    const updated = createProjectStep({
      id: existing.id,
      projectId: existing.projectId,
      title: existing.title,
      position: existing.position,
      completed,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
