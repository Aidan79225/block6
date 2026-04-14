import { describe, it, expect } from "vitest";
import { createSubtask } from "@/domain/entities/subtask";

describe("Subtask", () => {
  it("creates a subtask with required fields", () => {
    const subtask = createSubtask({
      id: "s-1",
      blockId: "b-1",
      title: "寫測試",
      completed: false,
      position: 0,
      createdAt: new Date(),
    });

    expect(subtask.id).toBe("s-1");
    expect(subtask.blockId).toBe("b-1");
    expect(subtask.title).toBe("寫測試");
    expect(subtask.completed).toBe(false);
    expect(subtask.position).toBe(0);
  });

  it("rejects empty title", () => {
    expect(() =>
      createSubtask({
        id: "s-1",
        blockId: "b-1",
        title: "   ",
        completed: false,
        position: 0,
        createdAt: new Date(),
      }),
    ).toThrow("Subtask title is required");
  });

  it("rejects negative position", () => {
    expect(() =>
      createSubtask({
        id: "s-1",
        blockId: "b-1",
        title: "寫測試",
        completed: false,
        position: -1,
        createdAt: new Date(),
      }),
    ).toThrow("position must be non-negative");
  });
});
