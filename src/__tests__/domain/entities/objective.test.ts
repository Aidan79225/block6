import { describe, it, expect } from "vitest";
import { createObjective } from "@/domain/entities/objective";

describe("Objective", () => {
  const base = {
    id: "o-1",
    cycleId: "c-1",
    title: "提升健康",
    description: "",
    position: 0,
    createdAt: new Date(),
  };

  it("creates an objective", () => {
    const obj = createObjective(base);
    expect(obj.title).toBe("提升健康");
    expect(obj.cycleId).toBe("c-1");
  });

  it("rejects blank title", () => {
    expect(() => createObjective({ ...base, title: " " })).toThrow(
      "Objective title is required",
    );
  });

  it("rejects negative position", () => {
    expect(() => createObjective({ ...base, position: -1 })).toThrow(
      "position must be non-negative",
    );
  });
});
