import { describe, it, expect, vi } from "vitest";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { CreateOkrCycleUseCase } from "@/domain/usecases/create-okr-cycle";
import { UpdateOkrCycleUseCase } from "@/domain/usecases/update-okr-cycle";
import { DeleteOkrCycleUseCase } from "@/domain/usecases/delete-okr-cycle";
import { ListOkrCyclesUseCase } from "@/domain/usecases/list-okr-cycles";
import { OkrCycle } from "@/domain/entities/okr-cycle";

const makeRepo = (): OkrCycleRepository => ({
  findForUser: vi.fn(),
  findById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

const start = new Date("2026-07-01");
const end = new Date("2026-09-30");

describe("Cycle use cases", () => {
  it("creates a cycle", async () => {
    const repo = makeRepo();
    vi.mocked(repo.add).mockResolvedValue(undefined);
    const result = await new CreateOkrCycleUseCase(repo).execute("u-1", "2026 Q3", start, end);
    expect(result.name).toBe("2026 Q3");
    expect(result.userId).toBe("u-1");
    expect(typeof result.id).toBe("string");
    expect(repo.add).toHaveBeenCalledOnce();
  });

  it("updates an existing cycle", async () => {
    const repo = makeRepo();
    const existing: OkrCycle = { id: "c-1", userId: "u-1", name: "old", startDate: start, endDate: end, createdAt: new Date() };
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);
    const result = await new UpdateOkrCycleUseCase(repo).execute("c-1", { name: "new", startDate: start, endDate: end });
    expect(result.name).toBe("new");
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("throws when updating a missing cycle", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      new UpdateOkrCycleUseCase(repo).execute("nope", { name: "x", startDate: start, endDate: end }),
    ).rejects.toThrow("OkrCycle nope not found");
  });

  it("deletes a cycle", async () => {
    const repo = makeRepo();
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    await new DeleteOkrCycleUseCase(repo).execute("c-1");
    expect(repo.delete).toHaveBeenCalledWith("c-1");
  });

  it("lists cycles for a user", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findForUser).mockResolvedValue([]);
    await new ListOkrCyclesUseCase(repo).execute("u-1");
    expect(repo.findForUser).toHaveBeenCalledWith("u-1");
  });
});
