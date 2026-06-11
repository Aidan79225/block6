import type { Project } from "@/domain/entities/project";
import type { ProjectRepository } from "@/domain/repositories/project-repository";

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly byId = new Map<string, Project>();

  async findForUser(userId: string): Promise<Project[]> {
    return [...this.byId.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<Project | null> {
    return this.byId.get(id) ?? null;
  }

  async add(project: Project): Promise<void> {
    if (this.byId.has(project.id)) throw new Error(`Project ${project.id} already exists`);
    this.byId.set(project.id, project);
  }

  async update(project: Project): Promise<void> {
    if (!this.byId.has(project.id)) throw new Error(`Project ${project.id} not found`);
    this.byId.set(project.id, project);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const existing = this.byId.get(id);
      if (existing) this.byId.set(id, { ...existing, position: index });
    });
  }
}
