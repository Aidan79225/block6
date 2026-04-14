"use client";
import { useState } from "react";
import { BlockType } from "@/domain/entities/block";
import { TaskTitleAutocomplete } from "./task-title-autocomplete";
import { useAppState } from "@/presentation/providers/app-state-provider";

interface BlockEditorProps {
  title: string;
  description: string;
  blockType: BlockType;
  onSave: (title: string, description: string, blockType: BlockType) => void;
}

const typeOptions: { value: BlockType; label: string; color: string }[] = [
  { value: BlockType.Core, label: "核心", color: "var(--color-block-core)" },
  { value: BlockType.Rest, label: "休息", color: "var(--color-block-rest)" },
  {
    value: BlockType.Buffer,
    label: "緩衝",
    color: "var(--color-block-buffer)",
  },
  {
    value: BlockType.General,
    label: "一般",
    color: "var(--color-block-general)",
  },
];

export function BlockEditor({
  title: initialTitle,
  description: initialDescription,
  blockType: initialType,
  onSave,
}: BlockEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [blockType, setBlockType] = useState(initialType);
  const { taskTitleSuggestions } = useAppState();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setBlockType(opt.value)}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              border:
                blockType === opt.value
                  ? `2px solid ${opt.color}`
                  : "1px solid var(--color-border)",
              background:
                blockType === opt.value
                  ? opt.color
                  : "var(--color-bg-tertiary)",
              color:
                blockType === opt.value
                  ? "var(--color-bg-primary)"
                  : "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: blockType === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
