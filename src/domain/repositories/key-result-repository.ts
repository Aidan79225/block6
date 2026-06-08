import { KeyResult } from "@/domain/entities/key-result";

export interface KeyResultRepository {
  findByObjective(objectiveId: string): Promise<KeyResult[]>;
  findById(id: string): Promise<KeyResult | null>;
  add(keyResult: KeyResult): Promise<void>;
  update(keyResult: KeyResult): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
