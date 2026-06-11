import { ProjectRepository } from "@/domain/repositories/project-repository";

export class ReorderProjectsUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
