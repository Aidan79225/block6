import { describe, it, expect, vi } from "vitest";
import { ProjectStepRepository } from "@/domain/repositories/project-step-repository";
import { CreateProjectStepUseCase } from "@/domain/usecases/create-project-step";
import { UpdateProjectStepUseCase } from "@/domain/usecases/update-project-step";
import { DeleteProjectStepUseCase } from "@/domain/usecases/delete-project-step";
import { ReorderProjectStepsUseCase } from "@/domain/usecases/reorder-project-steps";
import { ListProjectStepsByProjectUseCase } from "@/domain/usecases/list-project-steps-by-project";
import { ToggleProjectStepCompletedUseCase } from "@/domain/usecases/toggle-project-step-completed";
import { ProjectStep } from "@/domain/entities/project-step";

const makeRepo = (): ProjectStepRepository => ({ findByProject: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });
const existing: ProjectStep = { id: "s-1", projectId: "p-1", title: "量尺寸", position: 0, completed: false, createdAt: new Date() };

describe("ProjectStep use cases", () => {
  it("creates a step appended after existing ones, not completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByProject).mockResolvedValue([existing]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateProjectStepUseCase(repo).execute("p-1", "選油漆");
    expect(result.projectId).toBe("p-1");
    expect(result.position).toBe(1);
    expect(result.completed).toBe(false);
  });

  it("updates the title, preserving completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue({ ...existing, completed: true });
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateProjectStepUseCase(repo).execute("s-1", "量尺寸(改)");
    expect(result.title).toBe("量尺寸(改)");
    expect(result.completed).toBe(true);
  });

  it("toggles completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new ToggleProjectStepCompletedUseCase(repo).execute("s-1", true);
    expect(result.completed).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ id: "s-1", completed: true }));
  });

  it("throws when toggling a missing step", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(new ToggleProjectStepCompletedUseCase(repo).execute("nope", true)).rejects.toThrow("ProjectStep nope not found");
  });

  it("deletes a step", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteProjectStepUseCase(repo).execute("s-1");
    expect(repo.delete).toHaveBeenCalledWith("s-1");
  });

  it("reorders steps", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderProjectStepsUseCase(repo).execute(["s-2", "s-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["s-2", "s-1"]);
  });

  it("lists steps by project", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByProject).mockResolvedValue([existing]);
    const result = await new ListProjectStepsByProjectUseCase(repo).execute("p-1");
    expect(result).toEqual([existing]);
  });
});
