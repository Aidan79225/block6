"use client";

import { useState } from "react";

interface Props {
  currentValue: number;
  unit: string;
  targetValue: number;
  onSave: (value: number) => void;
}

export function KeyResultValueEditor({
  currentValue,
  unit,
  targetValue,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(currentValue));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(currentValue));
          setEditing(true);
        }}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: "13px",
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        {currentValue} / {targetValue} {unit}
      </button>
    );
  }

  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
  };

  return (
    <input
      type="number"
      min={0}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      style={{
        width: "72px",
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-primary)",
        padding: "2px 6px",
        fontSize: "13px",
      }}
    />
  );
}
