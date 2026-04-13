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

export interface UseCases {
  createWeekPlan: CreateWeekPlanUseCase;
  updateBlock: UpdateBlockUseCase;
  updateBlockStatus: UpdateBlockStatusUseCase;
  writeDiary: WriteDiaryUseCase;
  createWeekReview: CreateWeekReviewUseCase;
  getWeekSummary: GetWeekSummaryUseCase;
}

interface Repositories {
  weekPlanRepo: WeekPlanRepository;
  blockRepo: BlockRepository;
  diaryRepo: DiaryRepository;
  weekReviewRepo: WeekReviewRepository;
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
