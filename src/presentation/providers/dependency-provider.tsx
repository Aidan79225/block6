"use client";

import { createContext, useContext, useMemo } from "react";
import { WeekPlanRepository } from "@/domain/repositories/week-plan-repository";
import { BlockRepository } from "@/domain/repositories/block-repository";
import { DiaryRepository } from "@/domain/repositories/diary-repository";
import { WeekReviewRepository } from "@/domain/repositories/week-review-repository";
import { CreateWeekPlanUseCase } from "@/domain/usecases/create-week-plan";
import { UpdateBlockUseCase } from "@/domain/usecases/update-block";
import { NameSlotsUseCase } from "@/domain/usecases/name-slots";
import { SetBlockRegrettedUseCase } from "@/domain/usecases/set-block-regretted";
import { UpdateBlockStatusUseCase } from "@/domain/usecases/update-block-status";
import { WriteDiaryUseCase } from "@/domain/usecases/write-diary";
import { CreateWeekReviewUseCase } from "@/domain/usecases/create-week-review";
import { GetWeekSummaryUseCase } from "@/domain/usecases/get-week-summary";
import { RhythmRepository } from "@/domain/repositories/rhythm-repository";
import { SetRhythmUseCase } from "@/domain/usecases/set-rhythm";
import { ListRhythmHistoryUseCase } from "@/domain/usecases/list-rhythm-history";
import { DirectionRepository } from "@/domain/repositories/direction-repository";
import { WeekFocusRepository } from "@/domain/repositories/week-focus-repository";
import { WeekHistoryRepository } from "@/domain/repositories/week-history-repository";
import {
  ListDirectionsUseCase,
  SetDirectionsUseCase,
} from "@/domain/usecases/set-directions";
import { GetDirectionTrajectoryUseCase } from "@/domain/usecases/get-direction-trajectory";
import { SuggestRhythmUseCase } from "@/domain/usecases/suggest-rhythm";
import {
  GetWeekFocusUseCase,
  SetWeekFocusUseCase,
} from "@/domain/usecases/week-focus";

export interface UseCases {
  createWeekPlan: CreateWeekPlanUseCase;
  updateBlock: UpdateBlockUseCase;
  nameSlots: NameSlotsUseCase;
  setBlockRegretted: SetBlockRegrettedUseCase;
  updateBlockStatus: UpdateBlockStatusUseCase;
  writeDiary: WriteDiaryUseCase;
  createWeekReview: CreateWeekReviewUseCase;
  getWeekSummary: GetWeekSummaryUseCase;
  setRhythm: SetRhythmUseCase;
  listRhythmHistory: ListRhythmHistoryUseCase;
  listDirections: ListDirectionsUseCase;
  setDirections: SetDirectionsUseCase;
  getDirectionTrajectory: GetDirectionTrajectoryUseCase;
  getWeekFocus: GetWeekFocusUseCase;
  setWeekFocus: SetWeekFocusUseCase;
  suggestRhythm: SuggestRhythmUseCase;
}

interface Repositories {
  weekPlanRepo: WeekPlanRepository;
  blockRepo: BlockRepository;
  diaryRepo: DiaryRepository;
  weekReviewRepo: WeekReviewRepository;
  rhythmRepo: RhythmRepository;
  directionRepo: DirectionRepository;
  weekFocusRepo: WeekFocusRepository;
  weekHistoryRepo: WeekHistoryRepository;
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
      nameSlots: new NameSlotsUseCase(repositories.blockRepo),
      setBlockRegretted: new SetBlockRegrettedUseCase(repositories.blockRepo),
      updateBlockStatus: new UpdateBlockStatusUseCase(repositories.blockRepo),
      writeDiary: new WriteDiaryUseCase(repositories.diaryRepo),
      createWeekReview: new CreateWeekReviewUseCase(
        repositories.weekReviewRepo,
      ),
      getWeekSummary: new GetWeekSummaryUseCase(repositories.blockRepo),
      setRhythm: new SetRhythmUseCase(repositories.rhythmRepo),
      listRhythmHistory: new ListRhythmHistoryUseCase(repositories.rhythmRepo),
      listDirections: new ListDirectionsUseCase(repositories.directionRepo),
      setDirections: new SetDirectionsUseCase(repositories.directionRepo),
      getDirectionTrajectory: new GetDirectionTrajectoryUseCase(
        repositories.weekHistoryRepo,
        repositories.rhythmRepo,
        repositories.directionRepo,
      ),
      getWeekFocus: new GetWeekFocusUseCase(repositories.weekFocusRepo),
      setWeekFocus: new SetWeekFocusUseCase(repositories.weekFocusRepo),
      suggestRhythm: new SuggestRhythmUseCase(
        repositories.weekHistoryRepo,
        repositories.rhythmRepo,
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
