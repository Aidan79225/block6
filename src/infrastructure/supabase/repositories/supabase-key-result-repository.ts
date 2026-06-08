import type { KeyResult } from "@/domain/entities/key-result";
import type { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import {
  fetchKeyResultsByObjective,
  fetchKeyResultById,
  insertKeyResult,
  updateKeyResultRow,
  deleteKeyResultRow,
  reorderKeyResultRows,
} from "@/infrastructure/supabase/database";

export class SupabaseKeyResultRepository implements KeyResultRepository {
  findByObjective(objectiveId: string): Promise<KeyResult[]> {
    return fetchKeyResultsByObjective(objectiveId);
  }
  findById(id: string): Promise<KeyResult | null> {
    return fetchKeyResultById(id);
  }
  add(keyResult: KeyResult): Promise<void> {
    return insertKeyResult(keyResult);
  }
  update(keyResult: KeyResult): Promise<void> {
    return updateKeyResultRow(keyResult);
  }
  delete(id: string): Promise<void> {
    return deleteKeyResultRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderKeyResultRows(orderedIds);
  }
}
