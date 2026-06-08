import type { Objective } from "@/domain/entities/objective";
import type { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class InMemoryObjectiveRepository implements ObjectiveRepository {
  private readonly byId = new Map<string, Objective>();

  async findByCycle(cycleId: string): Promise<Objective[]> {
    return [...this.byId.values()]
      .filter((o) => o.cycleId === cycleId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<Objective | null> {
    return this.byId.get(id) ?? null;
  }

  async add(objective: Objective): Promise<void> {
    if (this.byId.has(objective.id))
      throw new Error(`Objective ${objective.id} already exists`);
    this.byId.set(objective.id, objective);
  }

  async update(objective: Objective): Promise<void> {
    if (!this.byId.has(objective.id))
      throw new Error(`Objective ${objective.id} not found`);
    this.byId.set(objective.id, objective);
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
