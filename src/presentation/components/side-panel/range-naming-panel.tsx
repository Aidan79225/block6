"use client";

import { useState } from "react";
import { BlockType } from "@/domain/entities/block";
import { BlockTypePicker } from "./block-type-picker";
import {
  TaskTitleAutocomplete,
  type TitleSuggestion,
} from "./task-title-autocomplete";

interface RangeNamingPanelProps {
  slotCount: number;
  titleSuggestions: TitleSuggestion[];
  onApply: (title: string, blockType: BlockType) => void;
  onClose: () => void;
}

/**
 * Names every slot of a selected range at once: one decision for the whole
 * range instead of one per cell.
 */
export function RangeNamingPanel({
  slotCount,
  titleSuggestions,
  onApply,
  onClose,
}: RangeNamingPanelProps) {
  const [title, setTitle] = useState("");
  const [blockType, setBlockType] = useState(BlockType.Core);

  return (
    <aside
      className="side-panel"
      style={{
        background: "var(--color-panel-bg)",
        borderLeft: "1px solid var(--color-border)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
          一次命名 {slotCount} 格
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          &times;
        </button>
      </div>
      <BlockTypePicker value={blockType} onChange={setBlockType} />
      <TaskTitleAutocomplete
        value={title}
        suggestions={titleSuggestions}
        onChange={setTitle}
      />
      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "12px",
          margin: 0,
        }}
      >
        已有的區塊只換標題與類型，狀態、細項與計時都保留。
      </p>
      <button
        onClick={() => onApply(title.trim(), blockType)}
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
        套用到 {slotCount} 格
      </button>
    </aside>
  );
}
