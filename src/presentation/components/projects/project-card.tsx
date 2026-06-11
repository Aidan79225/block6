"use client";

import { useState } from "react";
import { Project } from "@/domain/entities/project";
import { ProjectStep } from "@/domain/entities/project-step";
import { ProjectStepRow } from "./project-step-row";

interface Props {
  project: Project;
  steps: ProjectStep[];
  keyResultOptions: { keyResultId: string; title: string; objectiveTitle: string }[];
  onAddStep: (title: string) => void;
  onRenameStep: (stepId: string, title: string) => void;
  onDeleteStep: (stepId: string) => void;
  onSetKeyResult: (keyResultId: string | null) => void;
  onArchiveToggle: () => void;
  onDeleteProject: () => void;
}

export function ProjectCard({
  project,
  steps,
  keyResultOptions,
  onAddStep,
  onRenameStep,
  onDeleteStep,
  onSetKeyResult,
  onArchiveToggle,
  onDeleteProject,
}: Props) {
  const [newStep, setNewStep] = useState("");
  const done = steps.filter((s) => s.completed).length;

  const submit = () => {
    const t = newStep.trim();
    if (!t) return;
    onAddStep(t);
    setNewStep("");
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
        opacity: project.status === "archived" ? 0.6 : 1,
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
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{project.title}</h3>
        <span
          style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
        >
          {done}/{steps.length}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" onClick={onArchiveToggle} style={smallBtn}>
            {project.status === "archived" ? "取消歸檔" : "歸檔"}
          </button>
          <button type="button" onClick={onDeleteProject} style={smallBtn}>
            刪除
          </button>
        </div>
      </div>

      {keyResultOptions.length > 0 && (
        <select
          value={project.keyResultId ?? ""}
          onChange={(e) => onSetKeyResult(e.target.value || null)}
          aria-label="歸屬 KR"
          style={{
            alignSelf: "flex-start",
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
            fontSize: "12px",
            padding: "2px 6px",
            marginBottom: "4px",
          }}
        >
          <option value="">— 不歸屬 KR —</option>
          {keyResultOptions.map((opt) => (
            <option key={opt.keyResultId} value={opt.keyResultId}>
              {opt.objectiveTitle} / {opt.title}
            </option>
          ))}
        </select>
      )}

      {steps.map((step) => (
        <ProjectStepRow
          key={step.id}
          step={step}
          onRename={(title) => onRenameStep(step.id, title)}
          onDelete={() => onDeleteStep(step.id)}
        />
      ))}

      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
        <input
          placeholder="＋ 新增步驟"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          style={{
            flex: 1,
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "4px 8px",
            fontSize: "13px",
          }}
        />
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontSize: "12px",
  padding: "2px 8px",
};
