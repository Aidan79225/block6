import type { KeyResult } from "@/domain/entities/key-result";
import type { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class InMemoryKeyResultRepository implements KeyResultRepository {
  private readonly byId = new Map<string, KeyResult>();

  async findByObjective(objectiveId: string): Promise<KeyResult[]> {
    return [...this.byId.values()]
      .filter((k) => k.objectiveId === objectiveId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<KeyResult | null> {
    return this.byId.get(id) ?? null;
  }

  async add(keyResult: KeyResult): Promise<void> {
    if (this.byId.has(keyResult.id))
      throw new Error(`KeyResult ${keyResult.id} already exists`);
    this.byId.set(keyResult.id, keyResult);
  }

  async update(keyResult: KeyResult): Promise<void> {
    if (!this.byId.has(keyResult.id))
      throw new Error(`KeyResult ${keyResult.id} not found`);
    this.byId.set(keyResult.id, keyResult);
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
