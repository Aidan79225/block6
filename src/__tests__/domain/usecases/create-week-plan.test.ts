import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateWeekPlanUseCase } from "@/domain/usecases/create-week-plan";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { WeekPlan } from "@/domain/entities/week-plan";

const makeRepo = (): WeekPlanRepository => ({
  findByUserAndWeek: vi.fn(),
  save: vi.fn(),
});

describe("CreateWeekPlanUseCase", () => {
  const userId = "user-1";
  // Monday
  const weekStart = new Date("2026-04-13T00:00:00.000Z");

  it("creates a new week plan when none exists", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByUserAndWeek).mockResolvedValue(null);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const useCase = new CreateWeekPlanUseCase(repo);
    const result = await useCase.execute(userId, weekStart);

    expect(result.userId).toBe(userId);
    expect(result.weekStart).toEqual(weekStart);
    expect(typeof result.id).toBe("string");
    expect(repo.save).toHaveBeenCalledOnce();
    expect(repo.save).toHaveBeenCalledWith(result);
  });

  it("returns existing week plan without saving", async () => {
    const repo = makeRepo();
    const existing: WeekPlan = {
      id: "existing-id",
      userId,
      weekStart,
      createdAt: new Date("2026-04-13T00:00:00.000Z"),
    };
    vi.mocked(repo.findByUserAndWeek).mockResolvedValue(existing);

    const useCase = new CreateWeekPlanUseCase(repo);
    const result = await useCase.execute(userId, weekStart);

    expect(result).toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
