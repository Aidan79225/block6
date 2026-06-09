import { BlockStatus } from "@/domain/entities/block";
import { keyResultProgress } from "@/domain/entities/key-result";
import { CycleOkrView, KeyResultWithProgress, ObjectiveWithKeyResults } from "@/domain/entities/key-result-progress";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { OkrStatsRepository } from "@/domain/repositories/okr-stats-repository";
import { formatDateKey } from "@/lib/date-helpers";

export class GetCycleOkrViewUseCase {
  constructor(
    private readonly cycleRepo: OkrCycleRepository,
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly keyResultRepo: KeyResultRepository,
    private readonly statsRepo: OkrStatsRepository,
  ) {}

  async execute(cycleId: string): Promise<CycleOkrView> {
    const cycle = await this.cycleRepo.findById(cycleId);
    if (!cycle) throw new Error(`OkrCycle ${cycleId} not found`);

    const startKey = formatDateKey(cycle.startDate);
    const endKey = formatDateKey(cycle.endDate);

    const objectives = await this.objectiveRepo.findByCycle(cycleId);
    const objectiveViews: ObjectiveWithKeyResults[] = [];

    for (const objective of objectives) {
      const keyResults = await this.keyResultRepo.findByObjective(objective.id);
      const krViews: KeyResultWithProgress[] = [];

      for (const kr of keyResults) {
        const [linkedWeeklyTaskCount, weeklyTaskCompletionCount, blocks] = await Promise.all([
          this.statsRepo.countLinkedWeeklyTasksForKeyResult(kr.id),
          this.statsRepo.countWeeklyTaskCompletionsForKeyResult(kr.id, startKey, endKey),
          this.statsRepo.findBlocksForKeyResultInRange(kr.id, startKey, endKey),
        ]);

        krViews.push({
          keyResult: kr,
          progress: {
            keyResultId: kr.id,
            manualProgress: keyResultProgress(kr),
            linkedWeeklyTaskCount,
            weeklyTaskCompletionCount,
            linkedBlockCount: blocks.length,
            completedBlockCount: blocks.filter((b) => b.status === BlockStatus.Completed).length,
          },
        });
      }

      objectiveViews.push({ objective, keyResults: krViews });
    }

    return { cycle, objectives: objectiveViews };
  }
}
