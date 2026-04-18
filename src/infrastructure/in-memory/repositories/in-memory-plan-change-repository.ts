import type { PlanChange } from "@/domain/entities/plan-change";
import type { PlanChangeRepository } from "@/domain/repositories/plan-change-repository";

export class InMemoryPlanChangeRepository implements PlanChangeRepository {
  private readonly changes: PlanChange[] = [];

  async listByWeek(userId: string, weekKey: string): Promise<PlanChange[]> {
    return this.changes
      .filter((c) => c.userId === userId && c.weekKey === weekKey)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async create(change: PlanChange): Promise<PlanChange> {
    this.changes.push(change);
    return change;
  }
}
