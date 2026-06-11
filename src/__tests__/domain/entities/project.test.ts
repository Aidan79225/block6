import { describe, it, expect } from "vitest";
import { createProject } from "@/domain/entities/project";

describe("Project", () => {
  const base = { id: "p-1", userId: "u-1", title: "裝潢新家", position: 0, createdAt: new Date() };

  it("creates a project with defaults", () => {
    const project = createProject(base);
    expect(project.title).toBe("裝潢新家");
    expect(project.userId).toBe("u-1");
    expect(project.keyResultId).toBeNull();
    expect(project.status).toBe("active");
  });

  it("keeps an explicit keyResultId and status", () => {
    const project = createProject({ ...base, keyResultId: "k-1", status: "archived" });
    expect(project.keyResultId).toBe("k-1");
    expect(project.status).toBe("archived");
  });

  it("rejects blank title", () => {
    expect(() => createProject({ ...base, title: "  " })).toThrow("Project title is required");
  });

  it("rejects negative position", () => {
    expect(() => createProject({ ...base, position: -1 })).toThrow("position must be non-negative");
  });
});
