"use client";
import { useState } from "react";
import { BlockType } from "@/domain/entities/block";
import { TaskTitleAutocomplete } from "./task-title-autocomplete";
import { BlockTypePicker } from "./block-type-picker";
import { useAppState } from "@/presentation/providers/app-state-provider";

interface BlockEditorProps {
  title: string;
  description: string;
  blockType: BlockType;
  onSave: (title: string, description: string, blockType: BlockType) => void;
}

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
