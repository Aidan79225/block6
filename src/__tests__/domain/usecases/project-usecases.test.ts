import { describe, it, expect, vi } from "vitest";
import { ProjectRepository } from "@/domain/repositories/project-repository";
import { CreateProjectUseCase } from "@/domain/usecases/create-project";
import { UpdateProjectUseCase } from "@/domain/usecases/update-project";
import { DeleteProjectUseCase } from "@/domain/usecases/delete-project";
import { ListProjectsUseCase } from "@/domain/usecases/list-projects";
import { ReorderProjectsUseCase } from "@/domain/usecases/reorder-projects";
import { Project } from "@/domain/entities/project";

const makeRepo = (): ProjectRepository => ({ findForUser: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });
const existing: Project = { id: "p-1", userId: "u-1", title: "old", keyResultId: null, status: "active", position: 0, createdAt: new Date() };

describe("Project use cases", () => {
  it("creates a project appended after existing ones, active by default", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findForUser).mockResolvedValue([existing]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateProjectUseCase(repo).execute("u-1", "裝潢");
    expect(result.userId).toBe("u-1");
    expect(result.title).toBe("裝潢");
    expect(result.position).toBe(1);
    expect(result.status).toBe("active");
    expect(result.keyResultId).toBeNull();
  });

  it("updates title, keyResultId and status", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateProjectUseCase(repo).execute("p-1", { title: "new", keyResultId: "k-1", status: "archived" });
    expect(result.title).toBe("new");
    expect(result.keyResultId).toBe("k-1");
    expect(result.status).toBe("archived");
    expect(result.position).toBe(0);
  });

  it("throws when updating a missing project", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(new UpdateProjectUseCase(repo).execute("nope", { title: "x", keyResultId: null, status: "active" })).rejects.toThrow("Project nope not found");
  });

  it("deletes a project", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteProjectUseCase(repo).execute("p-1");
    expect(repo.delete).toHaveBeenCalledWith("p-1");
  });

  it("lists projects for a user", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findForUser).mockResolvedValue([]);
    await new ListProjectsUseCase(repo).execute("u-1");
    expect(repo.findForUser).toHaveBeenCalledWith("u-1");
  });

  it("reorders projects", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderProjectsUseCase(repo).execute(["p-2", "p-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["p-2", "p-1"]);
  });
});
