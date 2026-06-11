import { ProjectRepository } from "@/domain/repositories/project-repository";

export class DeleteProjectUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
