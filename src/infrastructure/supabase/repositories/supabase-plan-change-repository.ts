import type { PlanChange } from "@/domain/entities/plan-change";
import type { PlanChangeRepository } from "@/domain/repositories/plan-change-repository";
import {
  fetchPlanChangesForWeek,
  insertPlanChange,
} from "@/infrastructure/supabase/database";

export class SupabasePlanChangeRepository implements PlanChangeRepository {
  async listByWeek(userId: string, weekKey: string): Promise<PlanChange[]> {
    return fetchPlanChangesForWeek(userId, weekKey);
  }

  async create(change: PlanChange): Promise<PlanChange> {
    return insertPlanChange(change);
  }
}
