import { OkrCycle } from "@/domain/entities/okr-cycle";

export interface OkrCycleRepository {
  findForUser(userId: string): Promise<OkrCycle[]>;
  findById(id: string): Promise<OkrCycle | null>;
  add(cycle: OkrCycle): Promise<void>;
  update(cycle: OkrCycle): Promise<void>;
  delete(id: string): Promise<void>;
}
