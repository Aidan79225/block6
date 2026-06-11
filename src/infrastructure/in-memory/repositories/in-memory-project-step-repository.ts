import type { ProjectStep } from "@/domain/entities/project-step";
import type { ProjectStepRepository } from "@/domain/repositories/project-step-repository";

export class InMemoryProjectStepRepository implements ProjectStepRepository {
  private readonly byId = new Map<string, ProjectStep>();

  async findByProject(projectId: string): Promise<ProjectStep[]> {
    return [...this.byId.values()]
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<ProjectStep | null> {
    return this.byId.get(id) ?? null;
  }

  async add(step: ProjectStep): Promise<void> {
    if (this.byId.has(step.id)) throw new Error(`ProjectStep ${step.id} already exists`);
    this.byId.set(step.id, step);
  }

  async update(step: ProjectStep): Promise<void> {
    if (!this.byId.has(step.id)) throw new Error(`ProjectStep ${step.id} not found`);
    this.byId.set(step.id, step);
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
