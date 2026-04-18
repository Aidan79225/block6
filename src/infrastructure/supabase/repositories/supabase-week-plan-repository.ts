import type { WeekPlan } from "@/domain/entities/week-plan";
import type { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { formatDateKey } from "@/lib/date-helpers";
import {
  fetchWeekPlan,
  insertWeekPlan,
} from "@/infrastructure/supabase/database";

export class SupabaseWeekPlanRepository implements WeekPlanRepository {
  async findByUserAndWeek(
    userId: string,
    weekStart: Date,
  ): Promise<WeekPlan | null> {
    return fetchWeekPlan(userId, formatDateKey(weekStart));
  }

  async save(plan: WeekPlan): Promise<void> {
    return insertWeekPlan(plan);
  }
}
