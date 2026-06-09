import { Objective } from "@/domain/entities/objective";

export interface ObjectiveRepository {
  findByCycle(cycleId: string): Promise<Objective[]>;
  findById(id: string): Promise<Objective | null>;
  add(objective: Objective): Promise<void>;
  update(objective: Objective): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
