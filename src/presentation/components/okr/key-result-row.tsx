"use client";

import { KeyResult, keyResultProgress } from "@/domain/entities/key-result";
import { KeyResultProgress } from "@/domain/entities/key-result-progress";
import { KeyResultValueEditor } from "./key-result-value-editor";

interface Props {
  keyResult: KeyResult;
  progress: KeyResultProgress;
  onSaveValue: (value: number) => void;
  onDelete: () => void;
}

export function KeyResultRow({
  keyResult,
  progress,
  onSaveValue,
  onDelete,
}: Props) {
  const pct = Math.round(keyResultProgress(keyResult) * 100);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "8px 0",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>
          {keyResult.title}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label="刪除 KR"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          height: "6px",
          borderRadius: "3px",
          background: "var(--color-bg-primary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--color-accent)",
          }}
        />
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
        <KeyResultValueEditor
          currentValue={keyResult.currentValue}
          unit={keyResult.unit}
          targetValue={keyResult.targetValue}
          onSave={onSaveValue}
        />{" "}
        ({pct}%)
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
        🔗 週任務 {progress.linkedWeeklyTaskCount} 個・這季完成{" "}
        {progress.weeklyTaskCompletionCount} 次
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
        ⏱ block 排 {progress.linkedBlockCount}・已執行{" "}
        {progress.completedBlockCount}
      </div>
    </div>
  );
}
