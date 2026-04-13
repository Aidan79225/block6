"use client";
import { useState } from "react";

interface ReflectionEditorProps {
  reflection: string;
  onSave: (reflection: string) => void;
}

export function ReflectionEditor({
  reflection: initialReflection,
  onSave,
}: ReflectionEditorProps) {
  const [reflection, setReflection] = useState(initialReflection);
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "12px",
        }}
      >
        週反思
      </h3>
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="回顧這一週，記錄你的感想和下週的改進方向..."
        rows={6}
        style={{
          width: "100%",
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "12px",
          fontSize: "14px",
          resize: "vertical",
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={() => onSave(reflection)}
        style={{
          marginTop: "12px",
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          padding: "8px 20px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        儲存反思
      </button>
    </div>
  );
}
