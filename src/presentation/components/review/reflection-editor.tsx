"use client";
import { useEffect, useState } from "react";

interface ReflectionEditorProps {
  reflection: string;
  onSave: (reflection: string) => void;
}

export function ReflectionEditor({
  reflection: initialReflection,
  onSave,
}: ReflectionEditorProps) {
  const [reflection, setReflection] = useState(initialReflection);
  useEffect(() => {
    setReflection(initialReflection);
  }, [initialReflection]);
  const isValid = reflection.trim() !== "";

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
        disabled={!isValid}
        suppressHydrationWarning
        style={{
          marginTop: "12px",
          background: isValid
            ? "var(--color-accent)"
            : "var(--color-bg-tertiary)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: isValid ? "white" : "var(--color-text-muted)",
          padding: "8px 20px",
          cursor: isValid ? "pointer" : "not-allowed",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        儲存反思
      </button>
    </div>
  );
}
