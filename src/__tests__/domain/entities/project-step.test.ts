import { describe, it, expect } from "vitest";
import { createProjectStep } from "@/domain/entities/project-step";

describe("ProjectStep", () => {
  const base = { id: "s-1", projectId: "p-1", title: "量尺寸", position: 0, createdAt: new Date() };

  it("creates a step, completed defaults to false", () => {
    const step = createProjectStep(base);
    expect(step.title).toBe("量尺寸");
    expect(step.projectId).toBe("p-1");
    expect(step.completed).toBe(false);
  });

  it("keeps an explicit completed value", () => {
    const step = createProjectStep({ ...base, completed: true });
    expect(step.completed).toBe(true);
  });

  it("rejects blank title", () => {
    expect(() => createProjectStep({ ...base, title: "" })).toThrow("ProjectStep title is required");
  });

  it("rejects negative position", () => {
    expect(() => createProjectStep({ ...base, position: -1 })).toThrow("position must be non-negative");
  });
});
