import { describe, it, expect, vi } from "vitest";
import { ListKeyResultsForWeekUseCase } from "@/domain/usecases/list-key-results-for-week";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";

const cycle: OkrCycle = { id: "c-1", userId: "u-1", name: "Q3", startDate: new Date("2026-07-06"), endDate: new Date("2026-09-28"), createdAt: new Date() };
const objective: Objective = { id: "o-1", cycleId: "c-1", title: "健康", description: "", position: 0, createdAt: new Date() };
const kr: KeyResult = { id: "k-1", objectiveId: "o-1", title: "讀書", unit: "本", targetValue: 10, currentValue: 0, position: 0, createdAt: new Date() };

const makeCycleRepo = (): OkrCycleRepository => ({ findForUser: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn() });
const makeObjRepo = (): ObjectiveRepository => ({ findByCycle: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });
const makeKrRepo = (): KeyResultRepository => ({ findByObjective: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });

describe("ListKeyResultsForWeekUseCase", () => {
  it("returns KR options from the cycle covering the week", async () => {
    const cycleRepo = makeCycleRepo(); const objRepo = makeObjRepo(); const krRepo = makeKrRepo();
    vi.mocked(cycleRepo.findForUser).mockResolvedValue([cycle]);
    vi.mocked(objRepo.findByCycle).mockResolvedValue([objective]);
    vi.mocked(krRepo.findByObjective).mockResolvedValue([kr]);
    const options = await new ListKeyResultsForWeekUseCase(cycleRepo, objRepo, krRepo).execute("u-1", new Date("2026-08-03"));
    expect(options).toEqual([{ keyResultId: "k-1", title: "讀書", objectiveTitle: "健康" }]);
  });

  it("returns empty when the week is in no cycle", async () => {
    const cycleRepo = makeCycleRepo();
    vi.mocked(cycleRepo.findForUser).mockResolvedValue([cycle]);
    const options = await new ListKeyResultsForWeekUseCase(cycleRepo, makeObjRepo(), makeKrRepo()).execute("u-1", new Date("2026-12-07"));
    expect(options).toEqual([]);
  });
});
