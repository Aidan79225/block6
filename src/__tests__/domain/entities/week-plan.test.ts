import { describe, it, expect } from "vitest";
import { createWeekPlan } from "@/domain/entities/week-plan";

describe("WeekPlan", () => {
  it("creates a week plan with required fields", () => {
    const plan = createWeekPlan({ id: "wp-1", userId: "user-1", weekStart: new Date("2026-04-13"), createdAt: new Date() });
    expect(plan.id).toBe("wp-1");
    expect(plan.userId).toBe("user-1");
    expect(plan.weekStart).toEqual(new Date("2026-04-13"));
  });

  it("rejects weekStart that is not a Monday", () => {
    expect(() => createWeekPlan({ id: "wp-1", userId: "user-1", weekStart: new Date("2026-04-14"), createdAt: new Date() }))
      .toThrow("weekStart must be a Monday");
  });
});
