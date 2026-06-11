import { Project, createProject } from "@/domain/entities/project";
import { ProjectRepository } from "@/domain/repositories/project-repository";

export class CreateProjectUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(userId: string, title: string): Promise<Project> {
    const siblings = await this.repo.findForUser(userId);
    const project = createProject({
      id: crypto.randomUUID(),
      userId,
      title,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(project);
    return project;
  }
}
