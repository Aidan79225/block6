import { describe, it, expect, vi } from "vitest";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { CreateObjectiveUseCase } from "@/domain/usecases/create-objective";
import { UpdateObjectiveUseCase } from "@/domain/usecases/update-objective";
import { DeleteObjectiveUseCase } from "@/domain/usecases/delete-objective";
import { ReorderObjectivesUseCase } from "@/domain/usecases/reorder-objectives";
import { Objective } from "@/domain/entities/objective";

const makeRepo = (): ObjectiveRepository => ({
  findByCycle: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

describe("Objective use cases", () => {
  it("creates an objective appended after existing ones", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByCycle).mockResolvedValue([{ id: "o-1", position: 0 } as Objective]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateObjectiveUseCase(repo).execute("c-1", "新目標");
    expect(result.cycleId).toBe("c-1");
    expect(result.position).toBe(1);
    expect(repo.add).toHaveBeenCalledOnce();
  });

  it("updates title and description", async () => {
    const repo = makeRepo();
    const existing: Objective = { id: "o-1", cycleId: "c-1", title: "old", description: "", position: 0, createdAt: new Date() };
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateObjectiveUseCase(repo).execute("o-1", { title: "new", description: "desc" });
    expect(result.title).toBe("new");
    expect(result.description).toBe("desc");
  });

  it("deletes an objective", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteObjectiveUseCase(repo).execute("o-1");
    expect(repo.delete).toHaveBeenCalledWith("o-1");
  });

  it("reorders objectives", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderObjectivesUseCase(repo).execute(["o-2", "o-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["o-2", "o-1"]);
  });
});
