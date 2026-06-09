import { KeyResult, createKeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export interface UpdateKeyResultInput {
  title: string;
  unit: string;
  targetValue: number;
}

export class UpdateKeyResultUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(id: string, input: UpdateKeyResultInput): Promise<KeyResult> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`KeyResult ${id} not found`);
    const updated = createKeyResult({
      id: existing.id,
      objectiveId: existing.objectiveId,
      title: input.title,
      unit: input.unit,
      targetValue: input.targetValue,
      currentValue: existing.currentValue,
      position: existing.position,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
