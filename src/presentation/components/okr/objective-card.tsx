"use client";

import { useState } from "react";
import { Objective } from "@/domain/entities/objective";
import { KeyResultWithProgress } from "@/domain/entities/key-result-progress";
import { KeyResultRow } from "./key-result-row";

interface Props {
  objective: Objective;
  keyResults: KeyResultWithProgress[];
  onDeleteObjective: () => void;
  onAddKeyResult: (data: {
    title: string;
    unit: string;
    targetValue: number;
  }) => void;
  onSaveKeyResultValue: (keyResultId: string, value: number) => void;
  onDeleteKeyResult: (keyResultId: string) => void;
}

export function ObjectiveCard({
  objective,
  keyResults,
  onDeleteObjective,
  onAddKeyResult,
  onSaveKeyResultValue,
  onDeleteKeyResult,
}: Props) {
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");

  const submit = () => {
    const targetValue = Number(target);
    if (!title.trim() || Number.isNaN(targetValue) || targetValue <= 0) return;
    onAddKeyResult({ title: title.trim(), unit: unit.trim(), targetValue });
    setTitle("");
    setUnit("");
    setTarget("");
  };

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{objective.title}</h3>
        <button
          type="button"
          onClick={onDeleteObjective}
          style={{
            background: "none",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
            padding: "2px 8px",
          }}
        >
          刪除目標
        </button>
      </div>

      {keyResults.map(({ keyResult, progress }) => (
        <KeyResultRow
          key={keyResult.id}
          keyResult={keyResult}
          progress={progress}
          onSaveValue={(v) => onSaveKeyResultValue(keyResult.id, v)}
          onDelete={() => onDeleteKeyResult(keyResult.id)}
        />
      ))}

      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
        <input
          placeholder="KR 標題"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle(2)}
        />
        <input
          placeholder="單位"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={inputStyle(1)}
        />
        <input
          placeholder="目標值"
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={inputStyle(1)}
        />
        <button type="button" onClick={submit} style={addButtonStyle}>
          ＋
        </button>
      </div>
    </div>
  );
}

function inputStyle(flex: number): React.CSSProperties {
  return {
    flex,
    minWidth: 0,
    background: "var(--color-bg-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text-primary)",
    padding: "4px 8px",
    fontSize: "13px",
  };
}

const addButtonStyle: React.CSSProperties = {
  background: "var(--color-accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  color: "#fff",
  cursor: "pointer",
  padding: "4px 10px",
};
