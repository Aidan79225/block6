import { WeekPlan, createWeekPlan } from "@/domain/entities/week-plan";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";

export class CreateWeekPlanUseCase {
  constructor(private readonly repo: WeekPlanRepository) {}

  async execute(userId: string, weekStart: Date): Promise<WeekPlan> {
    const existing = await this.repo.findByUserAndWeek(userId, weekStart);
    if (existing) return existing;

    const plan = createWeekPlan({
      id: crypto.randomUUID(),
      userId,
      weekStart,
      createdAt: new Date(),
    });

    await this.repo.save(plan);
    return plan;
  }
}
