"use client";

import { useEffect } from "react";
import { useAppState } from "@/presentation/providers/app-state-provider";

interface Props {
  projectId: string;
}

export function ProjectStepChecklist({ projectId }: Props) {
  const { projectSteps, loadProjectSteps, toggleProjectStepCompleted } =
    useAppState();
  const steps = projectSteps[projectId];

  useEffect(() => {
    loadProjectSteps(projectId);
  }, [projectId, loadProjectSteps]);

  if (!steps || steps.length === 0) {
    return (
      <p
        style={{
          fontSize: "12px",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        這個專案還沒有步驟
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {steps.map((step) => (
        <label
          key={step.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={step.completed}
            onChange={(e) =>
              toggleProjectStepCompleted(projectId, step.id, e.target.checked)
            }
            style={{ cursor: "pointer" }}
          />
          <span
            style={{
              textDecoration: step.completed ? "line-through" : "none",
              opacity: step.completed ? 0.6 : 1,
            }}
          >
            {step.title}
          </span>
        </label>
      ))}
    </div>
  );
}
