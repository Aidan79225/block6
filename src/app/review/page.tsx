"use client";
import { useState } from "react";
import Link from "next/link";
import { CompletionStats } from "@/presentation/components/review/completion-stats";
import { BlockTypeBreakdown } from "@/presentation/components/review/block-type-breakdown";
import { ReflectionEditor } from "@/presentation/components/review/reflection-editor";

export default function ReviewPage() {
  const [reflection, setReflection] = useState("");
  // Phase A: static placeholder data
  const stats = {
    totalBlocks: 0,
    completedBlocks: 0,
    completionRate: 0,
    byType: {
      core: { total: 0, completed: 0 },
      rest: { total: 0, completed: 0 },
      buffer: { total: 0, completed: 0 },
    },
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
        totalBlocks={stats.totalBlocks}
        completedBlocks={stats.completedBlocks}
        completionRate={stats.completionRate}
      />
      <BlockTypeBreakdown byType={stats.byType} />
      <ReflectionEditor
        reflection={reflection}
        onSave={(text) => setReflection(text)}
      />
    </div>
  );
}
