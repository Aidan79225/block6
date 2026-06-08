import { describe, it, expect, vi } from "vitest";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { CreateKeyResultUseCase } from "@/domain/usecases/create-key-result";
import { UpdateKeyResultUseCase } from "@/domain/usecases/update-key-result";
import { UpdateKeyResultValueUseCase } from "@/domain/usecases/update-key-result-value";
import { DeleteKeyResultUseCase } from "@/domain/usecases/delete-key-result";
import { ReorderKeyResultsUseCase } from "@/domain/usecases/reorder-key-results";
import { KeyResult } from "@/domain/entities/key-result";

const makeRepo = (): KeyResultRepository => ({
  findByObjective: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
});

const existing = (over: Partial<KeyResult> = {}): KeyResult => ({
  id: "k-1",
  objectiveId: "o-1",
  title: "讀完 12 本書",
  unit: "本",
  targetValue: 12,
  currentValue: 3,
  position: 0,
  createdAt: new Date(),
  ...over,
});

describe("KeyResult use cases", () => {
  it("creates a KR appended after existing ones", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByObjective).mockResolvedValue([existing()]);
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateKeyResultUseCase(repo).execute("o-1", { title: "跑 100 公里", unit: "公里", targetValue: 100 });
    expect(result.objectiveId).toBe("o-1");
    expect(result.currentValue).toBe(0);
    expect(result.position).toBe(1);
  });

  it("updates title, unit and target", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing());
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateKeyResultUseCase(repo).execute("k-1", { title: "讀完 20 本書", unit: "本", targetValue: 20 });
    expect(result.title).toBe("讀完 20 本書");
    expect(result.targetValue).toBe(20);
    expect(result.currentValue).toBe(3);
  });

  it("updates only currentValue", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing());
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateKeyResultValueUseCase(repo).execute("k-1", 7);
    expect(result.currentValue).toBe(7);
    expect(result.targetValue).toBe(12);
  });

  it("throws when updating a missing KR", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(new UpdateKeyResultValueUseCase(repo).execute("nope", 1)).rejects.toThrow("KeyResult nope not found");
  });

  it("deletes a KR", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteKeyResultUseCase(repo).execute("k-1");
    expect(repo.delete).toHaveBeenCalledWith("k-1");
  });

  it("reorders KRs", async () => {
    const repo = makeRepo();
    vi.mocked(repo.reorder).mockResolvedValue(undefined);
    await new ReorderKeyResultsUseCase(repo).execute(["k-2", "k-1"]);
    expect(repo.reorder).toHaveBeenCalledWith(["k-2", "k-1"]);
  });
});
