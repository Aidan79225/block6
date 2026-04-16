"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CompletionStats } from "@/presentation/components/review/completion-stats";
import { BlockTypeBreakdown } from "@/presentation/components/review/block-type-breakdown";
import { ReflectionEditor } from "@/presentation/components/review/reflection-editor";
import { TaskTimeRanking } from "@/presentation/components/review/task-time-ranking";
import { DiaryWeekView } from "@/presentation/components/review/diary-week-view";
import { PlanChangesLog } from "@/presentation/components/review/plan-changes-log";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { BlockStatus, BlockType } from "@/domain/entities/block";
import { upsertReflection } from "@/infrastructure/supabase/database";
import { useNotify } from "@/presentation/providers/notification-provider";
import { WeekNavigator } from "@/presentation/components/header/week-navigator";

export default function ReviewPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekPlan();
  const {
    getBlocksForWeek,
    reflection,
    setReflection,
    loadWeek,
    loadReflection,
    getTaskTimeRanking,
    loadDiary,
    diaryEntries,
    planChanges,
    loadPlanChanges,
  } = useAppState();

  const weekKey = weekStart.toISOString().split("T")[0];
  const blocks = getBlocksForWeek(weekKey);

  useEffect(() => {
    loadWeek(weekKey);
    loadReflection(weekKey);
  }, [weekKey, loadWeek, loadReflection]);

  useEffect(() => {
    loadPlanChanges(weekKey);
  }, [weekKey, loadPlanChanges]);

  useEffect(() => {
    for (let dow = 1; dow <= 7; dow++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + (dow - 1));
      const dateKey = d.toISOString().split("T")[0];
      loadDiary(dateKey);
    }
  }, [weekStart, loadDiary]);

  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter(
    (b) => b.status === BlockStatus.Completed,
  ).length;
  const completionRate = totalBlocks === 0 ? 0 : completedBlocks / totalBlocks;

  const byType: Record<BlockType, { total: number; completed: number }> = {
    [BlockType.Core]: { total: 0, completed: 0 },
    [BlockType.Rest]: { total: 0, completed: 0 },
    [BlockType.Buffer]: { total: 0, completed: 0 },
    [BlockType.General]: { total: 0, completed: 0 },
  };
  for (const block of blocks) {
    const key = block.blockType as BlockType;
    byType[key].total++;
    if (block.status === BlockStatus.Completed) {
      byType[key].completed++;
    }
  }

  const [now] = useState(() => new Date());
  const ranking = getTaskTimeRanking(weekKey, now);

  const weekDiaries: Array<{
    dayOfWeek: number;
    bad: string;
    good: string;
    next: string;
  } | null> = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dow - 1));
    const dateKey = d.toISOString().split("T")[0];
    const entry = diaryEntries[dateKey];
    weekDiaries.push(entry ? { dayOfWeek: dow, ...entry } : null);
  }

  const weekChanges = planChanges[weekKey] ?? [];

  const handleSaveReflection = (text: string) => {
    setReflection(text);
    if (user) {
      upsertReflection(user.id, weekKey, text).catch((err) => {
        console.error(err);
        notify.error("反思儲存失敗");
      });
    }
  };

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
          }}
        >
          週回顧
        </h1>
        <WeekNavigator
          weekStart={weekStart}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
        />
        <Link
          href="/"
          style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
        >
          &larr; 回到儀表板
        </Link>
      </div>
      <CompletionStats
        totalBlocks={totalBlocks}
        completedBlocks={completedBlocks}
        completionRate={completionRate}
      />
      <BlockTypeBreakdown byType={byType} />
      <TaskTimeRanking items={ranking} />
      <DiaryWeekView entries={weekDiaries} />
      <PlanChangesLog changes={weekChanges} />
      <ReflectionEditor reflection={reflection} onSave={handleSaveReflection} />
    </div>
  );
}
