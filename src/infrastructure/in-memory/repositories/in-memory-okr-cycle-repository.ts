import type { OkrCycle } from "@/domain/entities/okr-cycle";
import type { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class InMemoryOkrCycleRepository implements OkrCycleRepository {
  private readonly byId = new Map<string, OkrCycle>();

  async findForUser(userId: string): Promise<OkrCycle[]> {
    return [...this.byId.values()].filter((c) => c.userId === userId);
  }

  async findById(id: string): Promise<OkrCycle | null> {
    return this.byId.get(id) ?? null;
  }

  async add(cycle: OkrCycle): Promise<void> {
    if (this.byId.has(cycle.id))
      throw new Error(`OkrCycle ${cycle.id} already exists`);
    this.byId.set(cycle.id, cycle);
  }

  async update(cycle: OkrCycle): Promise<void> {
    if (!this.byId.has(cycle.id))
      throw new Error(`OkrCycle ${cycle.id} not found`);
    this.byId.set(cycle.id, cycle);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
