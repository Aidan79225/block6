import { WeekPlan } from "@/domain/entities/week-plan";

export interface WeekPlanRepository {
  findByUserAndWeek(userId: string, weekStart: Date): Promise<WeekPlan | null>;
  save(plan: WeekPlan): Promise<void>;
}
