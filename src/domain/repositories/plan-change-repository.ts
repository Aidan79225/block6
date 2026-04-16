import type { PlanChange } from "@/domain/entities/plan-change";

export interface PlanChangeRepository {
  listByWeek(userId: string, weekKey: string): Promise<PlanChange[]>;
  create(change: PlanChange): Promise<PlanChange>;
}
