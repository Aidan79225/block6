import type { WeekPlan } from "@/domain/entities/week-plan";
import type { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { isSameLocalDay } from "@/lib/date-helpers";

export class InMemoryWeekPlanRepository implements WeekPlanRepository {
  private readonly byId = new Map<string, WeekPlan>();

  async findByUserAndWeek(
    userId: string,
    weekStart: Date,
  ): Promise<WeekPlan | null> {
    for (const p of this.byId.values()) {
      if (p.userId === userId && isSameLocalDay(p.weekStart, weekStart))
        return p;
    }
    return null;
  }

  async save(plan: WeekPlan): Promise<void> {
    if (this.byId.has(plan.id)) {
      throw new Error(`WeekPlan ${plan.id} already exists`);
    }
    this.byId.set(plan.id, plan);
  }
}
