"use client";
import { useState } from "react";

interface DiaryFormProps {
  bad: string;
  good: string;
  next: string;
  onSave: (bad: string, good: string, next: string) => void;
}

const FIELD_CONFIG: Array<{
  key: "bad" | "good" | "next";
  label: string;
  placeholder: string;
}> = [
  { key: "bad", label: "Bad", placeholder: "Bad — 今天哪裡不好..." },
  { key: "good", label: "Good", placeholder: "Good — 今天哪裡做得好..." },
  { key: "next", label: "Next", placeholder: "Next — 下一步怎麼調整..." },
];

export function DiaryForm({
  bad: initialBad,
  good: initialGood,
  next: initialNext,
  onSave,
}: DiaryFormProps) {
  const [bad, setBad] = useState(initialBad);
  const [good, setGood] = useState(initialGood);
  const [next, setNext] = useState(initialNext);

  const values = { bad, good, next };
  const setters = { bad: setBad, good: setGood, next: setNext };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        情緒日記
      </label>
      {FIELD_CONFIG.map(({ key, label, placeholder }) => (
        <div
          key={key}
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span
            style={{
              color: "var(--color-text-muted)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
          <input
            type="text"
            value={values[key]}
            onChange={(e) => setters[key](e.target.value)}
            placeholder={placeholder}
            style={{
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "8px",
              fontSize: "14px",
            }}
          />
        </div>
      ))}
      <button
        onClick={() => onSave(bad, good, next)}
        aria-label="儲存"
        style={{
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          padding: "8px 16px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          alignSelf: "flex-end",
        }}
      >
        儲存
      </button>
    </div>
  );
}
