"use client";

import { KeyResult, keyResultProgress } from "@/domain/entities/key-result";
import { KeyResultValueEditor } from "./key-result-value-editor";

interface Props {
  keyResult: KeyResult;
  onSaveValue: (value: number) => void;
  onDelete: () => void;
}

export function KeyResultRow({ keyResult, onSaveValue, onDelete }: Props) {
  const progress = keyResultProgress(keyResult);
  const pct = Math.round(progress * 100);

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
    </div>
  );
}
