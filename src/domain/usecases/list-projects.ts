import { Project } from "@/domain/entities/project";
import { ProjectRepository } from "@/domain/repositories/project-repository";

export class ListProjectsUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(userId: string): Promise<Project[]> {
    return this.repo.findForUser(userId);
  }
}
