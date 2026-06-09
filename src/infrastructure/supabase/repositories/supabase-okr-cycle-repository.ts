import type { OkrCycle } from "@/domain/entities/okr-cycle";
import type { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import {
  fetchOkrCyclesForUser,
  fetchOkrCycleById,
  insertOkrCycle,
  updateOkrCycleRow,
  deleteOkrCycleRow,
} from "@/infrastructure/supabase/database";

export class SupabaseOkrCycleRepository implements OkrCycleRepository {
  findForUser(userId: string): Promise<OkrCycle[]> {
    return fetchOkrCyclesForUser(userId);
  }
  findById(id: string): Promise<OkrCycle | null> {
    return fetchOkrCycleById(id);
  }
  add(cycle: OkrCycle): Promise<void> {
    return insertOkrCycle(cycle);
  }
  update(cycle: OkrCycle): Promise<void> {
    return updateOkrCycleRow(cycle);
  }
  delete(id: string): Promise<void> {
    return deleteOkrCycleRow(id);
  }
}
