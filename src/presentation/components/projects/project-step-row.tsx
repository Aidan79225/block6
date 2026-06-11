"use client";

import { useState } from "react";
import { ProjectStep } from "@/domain/entities/project-step";

interface Props {
  step: ProjectStep;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ProjectStepRow({ step, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.title);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== step.title) onRename(t);
    setEditing(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 0",
      }}
    >
      <span
        aria-hidden
        style={{
          color: step.completed
            ? "var(--color-accent)"
            : "var(--color-text-muted)",
          fontSize: "13px",
        }}
      >
        {step.completed ? "✓" : "○"}
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            flex: 1,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "2px 6px",
            fontSize: "13px",
          }}
        />
      ) : (
        <span
          onClick={() => {
            setDraft(step.title);
            setEditing(true);
          }}
          style={{
            flex: 1,
            fontSize: "13px",
            cursor: "text",
            color: "var(--color-text-primary)",
            textDecoration: step.completed ? "line-through" : "none",
            opacity: step.completed ? 0.6 : 1,
          }}
        >
          {step.title}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="刪除步驟"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        ✕
      </button>
    </div>
  );
}
