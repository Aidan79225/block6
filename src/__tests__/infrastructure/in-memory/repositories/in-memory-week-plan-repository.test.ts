import { describe, it, expect } from "vitest";
import { InMemoryWeekPlanRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-plan-repository";
import { createWeekPlan } from "@/domain/entities/week-plan";

function makePlan(
  overrides: Partial<Parameters<typeof createWeekPlan>[0]> = {},
) {
  return createWeekPlan({
    id: "wp-1",
    userId: "user-1",
    weekStart: new Date(2026, 3, 13),
    createdAt: new Date(2026, 3, 13, 10, 0),
    ...overrides,
  });
}

describe("InMemoryWeekPlanRepository", () => {
  it("findByUserAndWeek returns null when no plan matches", async () => {
    const repo = new InMemoryWeekPlanRepository();
    expect(
      await repo.findByUserAndWeek("user-1", new Date(2026, 3, 13)),
    ).toBeNull();
  });

  it("save stores a plan, findByUserAndWeek finds it", async () => {
    const repo = new InMemoryWeekPlanRepository();
    const plan = makePlan();
    await repo.save(plan);
    const got = await repo.findByUserAndWeek("user-1", new Date(2026, 3, 13));
    expect(got).toEqual(plan);
  });

  it("findByUserAndWeek does not cross users", async () => {
    const repo = new InMemoryWeekPlanRepository();
    await repo.save(makePlan());
    const got = await repo.findByUserAndWeek("user-2", new Date(2026, 3, 13));
    expect(got).toBeNull();
  });

  it("save throws on duplicate id", async () => {
    const repo = new InMemoryWeekPlanRepository();
    await repo.save(makePlan());
    await expect(repo.save(makePlan())).rejects.toThrow(/already exists/);
  });
});
