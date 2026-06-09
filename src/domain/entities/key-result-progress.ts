import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";

export interface KeyResultProgress {
  keyResultId: string;
  manualProgress: number; // currentValue / targetValue, clamped 0..1
  linkedWeeklyTaskCount: number;
  weeklyTaskCompletionCount: number;
  linkedBlockCount: number;
  completedBlockCount: number;
}

export interface KeyResultWithProgress {
  keyResult: KeyResult;
  progress: KeyResultProgress;
}

export interface ObjectiveWithKeyResults {
  objective: Objective;
  keyResults: KeyResultWithProgress[];
}

export interface CycleOkrView {
  cycle: OkrCycle;
  objectives: ObjectiveWithKeyResults[];
}
