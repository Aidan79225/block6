import type { WeekReview } from "@/domain/entities/week-review";
import type { WeekReviewRepository } from "@/domain/repositories/week-review-repository";

export class InMemoryWeekReviewRepository implements WeekReviewRepository {
  private readonly byId = new Map<string, WeekReview>();

  async findByWeekPlan(weekPlanId: string): Promise<WeekReview | null> {
    for (const r of this.byId.values()) {
      if (r.weekPlanId === weekPlanId) return r;
    }
    return null;
  }

  async save(review: WeekReview): Promise<void> {
    if (this.byId.has(review.id)) {
      throw new Error(`WeekReview ${review.id} already exists`);
    }
    this.byId.set(review.id, review);
  }

  async update(review: WeekReview): Promise<void> {
    if (!this.byId.has(review.id)) {
      throw new Error(`WeekReview ${review.id} not found`);
    }
    this.byId.set(review.id, review);
  }
}
