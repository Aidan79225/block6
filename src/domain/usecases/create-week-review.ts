import { WeekReview, createWeekReview } from "@/domain/entities/week-review";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";

export class CreateWeekReviewUseCase {
  constructor(private readonly repo: WeekReviewRepository) {}

  async execute(weekPlanId: string, reflection: string): Promise<WeekReview> {
    const existing = await this.repo.findByWeekPlan(weekPlanId);

    if (existing) {
      const updated: WeekReview = { ...existing, reflection };
      await this.repo.update(updated);
      return updated;
    }

    const review = createWeekReview({
      id: crypto.randomUUID(),
      weekPlanId,
      reflection,
      createdAt: new Date(),
    });

    await this.repo.save(review);
    return review;
  }
}
