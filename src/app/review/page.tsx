"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CompletionStats } from "@/presentation/components/review/completion-stats";
import { BlockTypeBreakdown } from "@/presentation/components/review/block-type-breakdown";
import { ReflectionEditor } from "@/presentation/components/review/reflection-editor";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { BlockStatus, BlockType } from "@/domain/entities/block";
import {
  upsertReflection,
} from "@/infrastructure/supabase/database";
import { useNotify } from "@/presentation/providers/notification-provider";

export default function ReviewPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const { weekStart } = useWeekPlan();
  const {
    getBlocksForWeek,
    reflection,
    setReflection,
    loadWeek,
    loadReflection,
  } = useAppState();

  const weekKey = weekStart.toISOString().split("T")[0];
  const blocks = getBlocksForWeek(weekKey);

  useEffect(() => {
    loadWeek(weekKey);
    loadReflection(weekKey);
  }, [weekKey, loadWeek, loadReflection]);

  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter(
    (b) => b.status === BlockStatus.Completed,
  ).length;
  const completionRate = totalBlocks === 0 ? 0 : completedBlocks / totalBlocks;

  const byType = {
    core: { total: 0, completed: 0 },
    rest: { total: 0, completed: 0 },
    buffer: { total: 0, completed: 0 },
  };
  for (const block of blocks) {
    const key = block.blockType as BlockType;
    byType[key].total++;
    if (block.status === BlockStatus.Completed) {
      byType[key].completed++;
    }
  }

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
      <ReflectionEditor
        reflection={reflection}
        onSave={handleSaveReflection}
      />
    </div>
  );
}
