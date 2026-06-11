import { describe, it, expect, vi } from "vitest";
import { ListAllKeyResultsForUserUseCase } from "@/domain/usecases/list-all-key-results-for-user";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";

const cycle: OkrCycle = { id: "c-1", userId: "u-1", name: "Q3", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-30"), createdAt: new Date() };
const objective: Objective = { id: "o-1", cycleId: "c-1", title: "健康", description: "", position: 0, createdAt: new Date() };
const kr: KeyResult = { id: "k-1", objectiveId: "o-1", title: "讀書", unit: "本", targetValue: 10, currentValue: 0, position: 0, createdAt: new Date() };

const makeCycleRepo = (): OkrCycleRepository => ({ findForUser: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn() });
const makeObjRepo = (): ObjectiveRepository => ({ findByCycle: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });
const makeKrRepo = (): KeyResultRepository => ({ findByObjective: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });

describe("ListAllKeyResultsForUserUseCase", () => {
  it("flattens KRs across all the user's cycles", async () => {
    const cycleRepo = makeCycleRepo(); const objRepo = makeObjRepo(); const krRepo = makeKrRepo();
    vi.mocked(cycleRepo.findForUser).mockResolvedValue([cycle]);
    vi.mocked(objRepo.findByCycle).mockResolvedValue([objective]);
    vi.mocked(krRepo.findByObjective).mockResolvedValue([kr]);
    const options = await new ListAllKeyResultsForUserUseCase(cycleRepo, objRepo, krRepo).execute("u-1");
    expect(options).toEqual([{ keyResultId: "k-1", title: "讀書", objectiveTitle: "健康" }]);
  });

  it("returns empty when the user has no cycles", async () => {
    const cycleRepo = makeCycleRepo();
    vi.mocked(cycleRepo.findForUser).mockResolvedValue([]);
    const options = await new ListAllKeyResultsForUserUseCase(cycleRepo, makeObjRepo(), makeKrRepo()).execute("u-1");
    expect(options).toEqual([]);
  });
});
