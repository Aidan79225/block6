"use client";

import { useMemo } from "react";
import { DependencyProvider } from "@/presentation/providers/dependency-provider";
import { SupabaseBlockRepository } from "@/infrastructure/supabase/repositories/supabase-block-repository";
import { SupabaseDiaryRepository } from "@/infrastructure/supabase/repositories/supabase-diary-repository";
import { SupabaseWeekPlanRepository } from "@/infrastructure/supabase/repositories/supabase-week-plan-repository";
import { SupabaseWeekReviewRepository } from "@/infrastructure/supabase/repositories/supabase-week-review-repository";

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
    }),
    [],
  );

  return (
    <DependencyProvider repositories={repositories}>
      {children}
    </DependencyProvider>
  );
}
