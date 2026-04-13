export interface WeekReview {
  readonly id: string;
  readonly weekPlanId: string;
  readonly reflection: string;
  readonly createdAt: Date;
}
export interface CreateWeekReviewInput {
  id: string;
  weekPlanId: string;
  reflection: string;
  createdAt: Date;
}

export function createWeekReview(input: CreateWeekReviewInput): WeekReview {
  if (!input.reflection.trim()) throw new Error("Reflection is required");
  return { ...input };
}
