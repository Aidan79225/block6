import { describe, it, expect } from "vitest";
import { createWeeklyTask } from "@/domain/entities/weekly-task";

describe("WeeklyTask", () => {
  it("creates a task with required fields", () => {
    const task = createWeeklyTask({
      id: "t-1",
      userId: "u-1",
      title: "每週運動 3 次",
      position: 0,
      isActive: true,
      createdAt: new Date(),
    });
    expect(task.title).toBe("每週運動 3 次");
    expect(task.isActive).toBe(true);
    expect(task.position).toBe(0);
  });

  it("rejects empty title", () => {
    expect(() =>
      createWeeklyTask({
        id: "t-1",
        userId: "u-1",
        title: "   ",
        position: 0,
        isActive: true,
        createdAt: new Date(),
      }),
    ).toThrow("WeeklyTask title is required");
  });

  it("rejects negative position", () => {
    expect(() =>
      createWeeklyTask({
        id: "t-1",
        userId: "u-1",
        title: "Read",
        position: -1,
        isActive: true,
        createdAt: new Date(),
      }),
    ).toThrow("position must be non-negative");
  });
});
