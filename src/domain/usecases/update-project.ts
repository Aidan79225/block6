import { Project, ProjectStatus, createProject } from "@/domain/entities/project";
import { ProjectRepository } from "@/domain/repositories/project-repository";

export interface UpdateProjectInput {
  title: string;
  keyResultId: string | null;
  status: ProjectStatus;
}

export class UpdateProjectUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`Project ${id} not found`);
    const updated = createProject({
      id: existing.id,
      userId: existing.userId,
      title: input.title,
      keyResultId: input.keyResultId,
      status: input.status,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
