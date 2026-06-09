import { KeyResult, createKeyResult } from "@/domain/entities/key-result";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export interface CreateKeyResultData {
  title: string;
  unit: string;
  targetValue: number;
}

export class CreateKeyResultUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(objectiveId: string, data: CreateKeyResultData): Promise<KeyResult> {
    const siblings = await this.repo.findByObjective(objectiveId);
    const keyResult = createKeyResult({
      id: crypto.randomUUID(),
      objectiveId,
      title: data.title,
      unit: data.unit,
      targetValue: data.targetValue,
      currentValue: 0,
      position: siblings.length,
      createdAt: new Date(),
    });
    await this.repo.add(keyResult);
    return keyResult;
  }
}
