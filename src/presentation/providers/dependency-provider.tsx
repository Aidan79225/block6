"use client";

import { createContext, useContext, useMemo } from "react";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { DiaryRepository } from "@/domain/repositories/diary-repository";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";
import { CreateWeekPlanUseCase } from "@/domain/usecases/create-week-plan";
import { UpdateBlockUseCase } from "@/domain/usecases/update-block";
import { UpdateBlockStatusUseCase } from "@/domain/usecases/update-block-status";
import { WriteDiaryUseCase } from "@/domain/usecases/write-diary";
import { CreateWeekReviewUseCase } from "@/domain/usecases/create-week-review";
import { GetWeekSummaryUseCase } from "@/domain/usecases/get-week-summary";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";
import { ObjectiveRepository } from "@/domain/repositories/objective-repository";
import { KeyResultRepository } from "@/domain/repositories/key-result-repository";
import { CreateOkrCycleUseCase } from "@/domain/usecases/create-okr-cycle";
import { UpdateOkrCycleUseCase } from "@/domain/usecases/update-okr-cycle";
import { DeleteOkrCycleUseCase } from "@/domain/usecases/delete-okr-cycle";
import { ListOkrCyclesUseCase } from "@/domain/usecases/list-okr-cycles";
import { CreateObjectiveUseCase } from "@/domain/usecases/create-objective";
import { UpdateObjectiveUseCase } from "@/domain/usecases/update-objective";
import { DeleteObjectiveUseCase } from "@/domain/usecases/delete-objective";
import { ReorderObjectivesUseCase } from "@/domain/usecases/reorder-objectives";
import { CreateKeyResultUseCase } from "@/domain/usecases/create-key-result";
import { UpdateKeyResultUseCase } from "@/domain/usecases/update-key-result";
import { UpdateKeyResultValueUseCase } from "@/domain/usecases/update-key-result-value";
import { DeleteKeyResultUseCase } from "@/domain/usecases/delete-key-result";
import { ReorderKeyResultsUseCase } from "@/domain/usecases/reorder-key-results";
import { ListObjectivesByCycleUseCase } from "@/domain/usecases/list-objectives-by-cycle";
import { ListKeyResultsByObjectiveUseCase } from "@/domain/usecases/list-key-results-by-objective";

export interface UseCases {
  createWeekPlan: CreateWeekPlanUseCase;
  updateBlock: UpdateBlockUseCase;
  updateBlockStatus: UpdateBlockStatusUseCase;
  writeDiary: WriteDiaryUseCase;
  createWeekReview: CreateWeekReviewUseCase;
  getWeekSummary: GetWeekSummaryUseCase;
  createOkrCycle: CreateOkrCycleUseCase;
  updateOkrCycle: UpdateOkrCycleUseCase;
  deleteOkrCycle: DeleteOkrCycleUseCase;
  listOkrCycles: ListOkrCyclesUseCase;
  createObjective: CreateObjectiveUseCase;
  updateObjective: UpdateObjectiveUseCase;
  deleteObjective: DeleteObjectiveUseCase;
  reorderObjectives: ReorderObjectivesUseCase;
  listObjectivesByCycle: ListObjectivesByCycleUseCase;
  createKeyResult: CreateKeyResultUseCase;
  updateKeyResult: UpdateKeyResultUseCase;
  updateKeyResultValue: UpdateKeyResultValueUseCase;
  deleteKeyResult: DeleteKeyResultUseCase;
  reorderKeyResults: ReorderKeyResultsUseCase;
  listKeyResultsByObjective: ListKeyResultsByObjectiveUseCase;
}

interface Repositories {
  weekPlanRepo: WeekPlanRepository;
  blockRepo: BlockRepository;
  diaryRepo: DiaryRepository;
  weekReviewRepo: WeekReviewRepository;
  okrCycleRepo: OkrCycleRepository;
  objectiveRepo: ObjectiveRepository;
  keyResultRepo: KeyResultRepository;
}

const UseCaseContext = createContext<UseCases | null>(null);

export function DependencyProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: React.ReactNode;
}) {
  const useCases = useMemo<UseCases>(
    () => ({
      createWeekPlan: new CreateWeekPlanUseCase(repositories.weekPlanRepo),
      updateBlock: new UpdateBlockUseCase(repositories.blockRepo),
      updateBlockStatus: new UpdateBlockStatusUseCase(repositories.blockRepo),
      writeDiary: new WriteDiaryUseCase(repositories.diaryRepo),
      createWeekReview: new CreateWeekReviewUseCase(
        repositories.weekReviewRepo,
      ),
      getWeekSummary: new GetWeekSummaryUseCase(repositories.blockRepo),
      createOkrCycle: new CreateOkrCycleUseCase(repositories.okrCycleRepo),
      updateOkrCycle: new UpdateOkrCycleUseCase(repositories.okrCycleRepo),
      deleteOkrCycle: new DeleteOkrCycleUseCase(repositories.okrCycleRepo),
      listOkrCycles: new ListOkrCyclesUseCase(repositories.okrCycleRepo),
      createObjective: new CreateObjectiveUseCase(repositories.objectiveRepo),
      updateObjective: new UpdateObjectiveUseCase(repositories.objectiveRepo),
      deleteObjective: new DeleteObjectiveUseCase(repositories.objectiveRepo),
      reorderObjectives: new ReorderObjectivesUseCase(
        repositories.objectiveRepo,
      ),
      listObjectivesByCycle: new ListObjectivesByCycleUseCase(
        repositories.objectiveRepo,
      ),
      createKeyResult: new CreateKeyResultUseCase(repositories.keyResultRepo),
      updateKeyResult: new UpdateKeyResultUseCase(repositories.keyResultRepo),
      updateKeyResultValue: new UpdateKeyResultValueUseCase(
        repositories.keyResultRepo,
      ),
      deleteKeyResult: new DeleteKeyResultUseCase(repositories.keyResultRepo),
      reorderKeyResults: new ReorderKeyResultsUseCase(
        repositories.keyResultRepo,
      ),
      listKeyResultsByObjective: new ListKeyResultsByObjectiveUseCase(
        repositories.keyResultRepo,
      ),
    }),
    [repositories],
  );

  return (
    <UseCaseContext.Provider value={useCases}>
      {children}
    </UseCaseContext.Provider>
  );
}

export function useUseCases(): UseCases {
  const context = useContext(UseCaseContext);
  if (!context) {
    throw new Error("useUseCases must be used within DependencyProvider");
  }
  return context;
}
