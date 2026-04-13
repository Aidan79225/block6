import { WeekReview } from "@/domain/entities/week-review";

export interface WeekReviewRepository {
  findByWeekPlan(weekPlanId: string): Promise<WeekReview | null>;
  save(review: WeekReview): Promise<void>;
  update(review: WeekReview): Promise<void>;
}
