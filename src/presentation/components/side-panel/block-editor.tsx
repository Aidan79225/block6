"use client";
import { useState } from "react";
import { BlockType } from "@/domain/entities/block";
import { TaskTitleAutocomplete } from "./task-title-autocomplete";
import { BlockTypePicker } from "./block-type-picker";
import { ProjectStepChecklist } from "./project-step-checklist";
import { useAppState } from "@/presentation/providers/app-state-provider";

interface BlockEditorProps {
  title: string;
  description: string;
  blockType: BlockType;
  onSave: (title: string, description: string, blockType: BlockType) => void;
  blockId: string | null;
  keyResultId: string | null;
  keyResultOptions: {
    keyResultId: string;
    title: string;
    objectiveTitle: string;
  }[];
  onLinkKeyResult: (keyResultId: string | null) => void;
  projectId: string | null;
  projectOptions: { projectId: string; title: string }[];
  onLinkProject: (projectId: string | null) => void;
}

export function BlockEditor({
  title: initialTitle,
  description: initialDescription,
  blockType: initialType,
  onSave,
  blockId,
  keyResultId,
  keyResultOptions,
  onLinkKeyResult,
  projectId,
  projectOptions,
  onLinkProject,
}: BlockEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [blockType, setBlockType] = useState(initialType);
  const { taskTitleSuggestions } = useAppState();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <BlockTypePicker value={blockType} onChange={setBlockType} />
      <TaskTitleAutocomplete
        value={title}
        suggestions={taskTitleSuggestions}
        onChange={setTitle}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="細項目標..."
        rows={3}
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
          resize: "vertical",
        }}
      />
      {blockId && keyResultOptions.length > 0 && (
        <div>
          <label
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "6px",
              display: "block",
            }}
          >
            歸屬 KR
          </label>
          <select
            value={keyResultId ?? ""}
            onChange={(e) => onLinkKeyResult(e.target.value || null)}
            style={{
              width: "100%",
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "8px",
              fontSize: "14px",
            }}
          >
            <option value="">— 不歸屬 —</option>
            {keyResultOptions.map((opt) => (
              <option key={opt.keyResultId} value={opt.keyResultId}>
                {opt.objectiveTitle} / {opt.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {blockId && projectOptions.length > 0 && (
        <div>
          <label
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "6px",
              display: "block",
            }}
          >
            歸屬 Project
          </label>
          <select
            value={projectId ?? ""}
            onChange={(e) => onLinkProject(e.target.value || null)}
            style={{
              width: "100%",
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "8px",
              fontSize: "14px",
            }}
          >
            <option value="">— 不歸屬 —</option>
            {projectOptions.map((opt) => (
              <option key={opt.projectId} value={opt.projectId}>
                {opt.title}
              </option>
            ))}
          </select>
          {projectId && (
            <div style={{ marginTop: "8px" }}>
              <ProjectStepChecklist projectId={projectId} />
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => onSave(title, description, blockType)}
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
