import { describe, it, expect } from "vitest";
import { createWeekPlan } from "@/domain/entities/week-plan";

describe("WeekPlan", () => {
  it("creates a week plan with required fields", () => {
    const monday = new Date(2026, 3, 13); // Mon 2026-04-13 at local midnight
    const plan = createWeekPlan({
      id: "wp-1",
      userId: "user-1",
      weekStart: monday,
      createdAt: new Date(),
    });
    expect(plan.id).toBe("wp-1");
    expect(plan.userId).toBe("user-1");
    expect(plan.weekStart).toEqual(monday);
  });

  it("rejects weekStart that is not a Monday", () => {
    const tuesday = new Date(2026, 3, 14); // Tue 2026-04-14 at local midnight
    expect(() =>
      createWeekPlan({
        id: "wp-1",
        userId: "user-1",
        weekStart: tuesday,
        createdAt: new Date(),
      }),
    ).toThrow("weekStart must be a Monday");
  });
});
