import { describe, it, expect } from "vitest";
import { logPlanChange } from "@/domain/usecases/log-plan-change";

describe("logPlanChange", () => {
  const baseInput = {
    userId: "user-1",
    weekKey: "2026-04-13",
    dayOfWeek: 3,
    slot: 2,
    blockTitleSnapshot: "讀書",
    action: "edit" as const,
    reason: "今天不想讀",
  };

  it("constructs a PlanChange with generated id and createdAt", () => {
    const change = logPlanChange(baseInput);
    expect(change.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(change.userId).toBe("user-1");
    expect(change.weekKey).toBe("2026-04-13");
    expect(change.dayOfWeek).toBe(3);
    expect(change.slot).toBe(2);
    expect(change.blockTitleSnapshot).toBe("讀書");
    expect(change.action).toBe("edit");
    expect(change.reason).toBe("今天不想讀");
    expect(change.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("trims whitespace from reason", () => {
    const change = logPlanChange({ ...baseInput, reason: "  too busy  " });
    expect(change.reason).toBe("too busy");
  });

  it("throws if reason is empty after trim", () => {
    expect(() => logPlanChange({ ...baseInput, reason: "" })).toThrow();
    expect(() => logPlanChange({ ...baseInput, reason: "   " })).toThrow();
  });

  it("accepts null userId for anonymous/local mode", () => {
    const change = logPlanChange({ ...baseInput, userId: null });
    expect(change.userId).toBeNull();
  });
});
