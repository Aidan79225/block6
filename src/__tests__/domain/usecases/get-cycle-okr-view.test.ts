import { describe, it, expect, vi } from "vitest";
import { GetCycleOkrViewUseCase } from "@/domain/usecases/get-cycle-okr-view";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";
import { Block, BlockStatus, BlockType } from "@/domain/entities/block";

const cycle: OkrCycle = { id: "c-1", userId: "u-1", name: "2026 Q3", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-30"), createdAt: new Date() };
const objective: Objective = { id: "o-1", cycleId: "c-1", title: "健康", description: "", position: 0, createdAt: new Date() };
const kr: KeyResult = { id: "k-1", objectiveId: "o-1", title: "讀書", unit: "本", targetValue: 10, currentValue: 5, position: 0, createdAt: new Date() };
const block = (status: BlockStatus): Block => ({ id: crypto.randomUUID(), weekPlanId: "wp-1", dayOfWeek: 1, slot: 1, blockType: BlockType.Core, title: "讀書", description: "", status, keyResultId: "k-1", projectId: null, suppressed: false });

const makeCycleRepo = (): OkrCycleRepository => ({ findForUser: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn() });
const makeObjRepo = (): ObjectiveRepository => ({ findByCycle: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });
const makeKrRepo = (): KeyResultRepository => ({ findByObjective: vi.fn(), findById: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() });
const makeStatsRepo = (): OkrStatsRepository => ({ countLinkedWeeklyTasksForKeyResult: vi.fn(), countWeeklyTaskCompletionsForKeyResult: vi.fn(), findBlocksForKeyResultInRange: vi.fn() });

describe("GetCycleOkrViewUseCase", () => {
  it("assembles the tree and computes progress over the cycle range", async () => {
    const cycleRepo = makeCycleRepo(); const objRepo = makeObjRepo(); const krRepo = makeKrRepo(); const statsRepo = makeStatsRepo();
    vi.mocked(cycleRepo.findById).mockResolvedValue(cycle);
    vi.mocked(objRepo.findByCycle).mockResolvedValue([objective]);
    vi.mocked(krRepo.findByObjective).mockResolvedValue([kr]);
    vi.mocked(statsRepo.countLinkedWeeklyTasksForKeyResult).mockResolvedValue(3);
    vi.mocked(statsRepo.countWeeklyTaskCompletionsForKeyResult).mockResolvedValue(18);
    vi.mocked(statsRepo.findBlocksForKeyResultInRange).mockResolvedValue([block(BlockStatus.Completed), block(BlockStatus.Completed), block(BlockStatus.Planned)]);

    const view = await new GetCycleOkrViewUseCase(cycleRepo, objRepo, krRepo, statsRepo).execute("c-1");

    expect(view.cycle.id).toBe("c-1");
    const prog = view.objectives[0].keyResults[0].progress;
    expect(prog.manualProgress).toBe(0.5);
    expect(prog.linkedWeeklyTaskCount).toBe(3);
    expect(prog.weeklyTaskCompletionCount).toBe(18);
    expect(prog.linkedBlockCount).toBe(3);
    expect(prog.completedBlockCount).toBe(2);
    expect(statsRepo.countWeeklyTaskCompletionsForKeyResult).toHaveBeenCalledWith("k-1", "2026-07-01", "2026-09-30");
    expect(statsRepo.findBlocksForKeyResultInRange).toHaveBeenCalledWith("k-1", "2026-07-01", "2026-09-30");
  });

  it("throws when the cycle is missing", async () => {
    const cycleRepo = makeCycleRepo();
    vi.mocked(cycleRepo.findById).mockResolvedValue(null);
    await expect(new GetCycleOkrViewUseCase(cycleRepo, makeObjRepo(), makeKrRepo(), makeStatsRepo()).execute("nope")).rejects.toThrow("OkrCycle nope not found");
  });
});
