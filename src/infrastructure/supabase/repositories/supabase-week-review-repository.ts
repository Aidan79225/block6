import type { WeekReview } from "@/domain/entities/week-review";
import type { WeekReviewRepository } from "@/domain/repositories/week-review-repository";
import {
  fetchWeekReviewByWeekPlanId,
  insertWeekReview,
  updateWeekReview,
} from "@/infrastructure/supabase/database";

export class SupabaseWeekReviewRepository implements WeekReviewRepository {
  async findByWeekPlan(weekPlanId: string): Promise<WeekReview | null> {
    return fetchWeekReviewByWeekPlanId(weekPlanId);
  }

  async save(review: WeekReview): Promise<void> {
    return insertWeekReview(review);
  }

  async update(review: WeekReview): Promise<void> {
    return updateWeekReview(review);
  }
}
