import { describe, it, expect } from "vitest";
import { InMemoryWeekReviewRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-review-repository";
import { createWeekReview } from "@/domain/entities/week-review";

function makeReview(
  overrides: Partial<Parameters<typeof createWeekReview>[0]> = {},
) {
  return createWeekReview({
    id: "wr-1",
    weekPlanId: "wp-1",
    reflection: "A solid week",
    createdAt: new Date(2026, 3, 13, 10, 0),
    ...overrides,
  });
}

describe("InMemoryWeekReviewRepository", () => {
  it("findByWeekPlan returns null when no review matches", async () => {
    const repo = new InMemoryWeekReviewRepository();
    expect(await repo.findByWeekPlan("wp-1")).toBeNull();
  });

  it("save stores a review, findByWeekPlan finds it", async () => {
    const repo = new InMemoryWeekReviewRepository();
    const r = makeReview();
    await repo.save(r);
    expect(await repo.findByWeekPlan("wp-1")).toEqual(r);
  });

  it("save throws on duplicate id", async () => {
    const repo = new InMemoryWeekReviewRepository();
    await repo.save(makeReview());
    await expect(repo.save(makeReview())).rejects.toThrow(/already exists/);
  });

  it("update replaces the existing review", async () => {
    const repo = new InMemoryWeekReviewRepository();
    await repo.save(makeReview({ reflection: "Old" }));
    await repo.update(makeReview({ reflection: "New" }));
    const got = await repo.findByWeekPlan("wp-1");
    expect(got?.reflection).toBe("New");
  });

  it("update throws if id does not exist", async () => {
    const repo = new InMemoryWeekReviewRepository();
    await expect(repo.update(makeReview())).rejects.toThrow(/not found/);
  });
});
