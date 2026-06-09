"use client";

import { useMemo } from "react";
import { DependencyProvider } from "@/presentation/providers/dependency-provider";
import { SupabaseBlockRepository } from "@/infrastructure/supabase/repositories/supabase-block-repository";
import { SupabaseDiaryRepository } from "@/infrastructure/supabase/repositories/supabase-diary-repository";
import { SupabaseWeekPlanRepository } from "@/infrastructure/supabase/repositories/supabase-week-plan-repository";
import { SupabaseWeekReviewRepository } from "@/infrastructure/supabase/repositories/supabase-week-review-repository";
import { SupabaseOkrCycleRepository } from "@/infrastructure/supabase/repositories/supabase-okr-cycle-repository";
import { SupabaseObjectiveRepository } from "@/infrastructure/supabase/repositories/supabase-objective-repository";
import { SupabaseKeyResultRepository } from "@/infrastructure/supabase/repositories/supabase-key-result-repository";
import { SupabaseOkrStatsRepository } from "@/infrastructure/supabase/repositories/supabase-okr-stats-repository";

export function ProductionDependencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repositories = useMemo(
    () => ({
      blockRepo: new SupabaseBlockRepository(),
      diaryRepo: new SupabaseDiaryRepository(),
      weekPlanRepo: new SupabaseWeekPlanRepository(),
      weekReviewRepo: new SupabaseWeekReviewRepository(),
      okrCycleRepo: new SupabaseOkrCycleRepository(),
      objectiveRepo: new SupabaseObjectiveRepository(),
      keyResultRepo: new SupabaseKeyResultRepository(),
      okrStatsRepo: new SupabaseOkrStatsRepository(),
    }),
    [],
  );

  return (
    <DependencyProvider repositories={repositories}>
      {children}
    </DependencyProvider>
  );
}
