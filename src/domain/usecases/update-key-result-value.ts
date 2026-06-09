import { KeyResult, createKeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class UpdateKeyResultValueUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(id: string, currentValue: number): Promise<KeyResult> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`KeyResult ${id} not found`);
    const updated = createKeyResult({
      id: existing.id,
      objectiveId: existing.objectiveId,
      title: existing.title,
      unit: existing.unit,
      targetValue: existing.targetValue,
      currentValue,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
