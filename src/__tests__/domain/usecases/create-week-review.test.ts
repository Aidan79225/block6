import { describe, it, expect, vi } from "vitest";
import { CreateWeekReviewUseCase } from "@/domain/usecases/create-week-review";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";
import { WeekReview } from "@/domain/entities/week-review";

const makeRepo = (): WeekReviewRepository => ({
  findByWeekPlan: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

describe("CreateWeekReviewUseCase", () => {
  const weekPlanId = "week-1";
  const reflection = "It was a productive week.";

  it("creates a new week review when none exists", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByWeekPlan).mockResolvedValue(null);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const useCase = new CreateWeekReviewUseCase(repo);
    const result = await useCase.execute(weekPlanId, reflection);

    expect(result.weekPlanId).toBe(weekPlanId);
    expect(result.reflection).toBe(reflection);
    expect(typeof result.id).toBe("string");
    expect(repo.save).toHaveBeenCalledOnce();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates existing review without saving", async () => {
    const repo = makeRepo();
    const existing: WeekReview = {
      id: "review-existing",
      weekPlanId,
      reflection: "Old reflection",
      createdAt: new Date("2026-04-13T00:00:00.000Z"),
    };
    vi.mocked(repo.findByWeekPlan).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);

    const useCase = new CreateWeekReviewUseCase(repo);
    const result = await useCase.execute(weekPlanId, reflection);

    expect(result.id).toBe(existing.id);
    expect(result.reflection).toBe(reflection);
    expect(repo.update).toHaveBeenCalledOnce();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
