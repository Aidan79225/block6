import { describe, it, expect } from "vitest";
import { createWeekReview } from "@/domain/entities/week-review";

describe("WeekReview", () => {
  it("creates a week review", () => {
    const review = createWeekReview({ id: "review-1", weekPlanId: "wp-1", reflection: "這週完成了大部分的核心任務", createdAt: new Date() });
    expect(review.weekPlanId).toBe("wp-1");
    expect(review.reflection).toBe("這週完成了大部分的核心任務");
  });

  it("rejects empty reflection", () => {
    expect(() => createWeekReview({ id: "review-1", weekPlanId: "wp-1", reflection: "", createdAt: new Date() }))
      .toThrow("Reflection is required");
  });
});
