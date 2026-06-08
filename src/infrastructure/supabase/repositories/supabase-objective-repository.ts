import type { Objective } from "@/domain/entities/objective";
import type { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import {
  fetchObjectivesByCycle,
  fetchObjectiveById,
  insertObjective,
  updateObjectiveRow,
  deleteObjectiveRow,
  reorderObjectiveRows,
} from "@/infrastructure/supabase/database";

export class SupabaseObjectiveRepository implements ObjectiveRepository {
  findByCycle(cycleId: string): Promise<Objective[]> {
    return fetchObjectivesByCycle(cycleId);
  }
  findById(id: string): Promise<Objective | null> {
    return fetchObjectiveById(id);
  }
  add(objective: Objective): Promise<void> {
    return insertObjective(objective);
  }
  update(objective: Objective): Promise<void> {
    return updateObjectiveRow(objective);
  }
  delete(id: string): Promise<void> {
    return deleteObjectiveRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderObjectiveRows(orderedIds);
  }
}
