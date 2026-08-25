"use client";

import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface BlockCellProps {
  block: Block | null;
  dayOfWeek: number;
  slot: number;
  isSelected?: boolean;
  onClick: () => void;
  onToggleComplete?: () => void;
  isFromRhythm?: boolean;
}

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};

const statusIcon: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "○",
  [BlockStatus.InProgress]: "▶",
  [BlockStatus.Completed]: "✓",
  [BlockStatus.Skipped]: "–",
};

const statusToggleLabel: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "標記完成",
  [BlockStatus.InProgress]: "標記完成",
  [BlockStatus.Completed]: "取消完成",
  [BlockStatus.Skipped]: "標記完成",
};

const SELECTED_OUTLINE = "2px solid var(--color-accent)";
const HOVER_OUTLINE = "2px dashed var(--color-accent)";
const OUTLINE_OFFSET = "1px";

export function BlockCell({
  block,
  dayOfWeek,
  slot,
  isSelected,
  onClick,
  onToggleComplete,
  isFromRhythm,
}: BlockCellProps) {
  const droppableId = `slot-${dayOfWeek}-${slot}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: droppableId });

  const draggableId = block ? `block-${block.id}` : `empty-${droppableId}`;
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
    transform,
  } = useDraggable({
    id: draggableId,
    disabled: !block,
  });

  const outline = isOver
    ? HOVER_OUTLINE
    : isSelected
      ? SELECTED_OUTLINE
      : "none";

  if (!block) {
    return (
      <button
        ref={setDropRef}
        onClick={onClick}
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          padding: "8px",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          outline,
          outlineOffset: outline === "none" ? "0" : OUTLINE_OFFSET,
        }}
      >
        +
      </button>
    );
  }

  const borderColor = typeColorMap[block.blockType];
  const isCompleted = block.status === BlockStatus.Completed;

  // The status toggle is a real button, so it cannot live inside the cell
  // button: the cell wraps both and carries the drop target and the transform.
  return (
    <div
      ref={setDropRef}
      style={{
        position: "relative",
        display: "flex",
        minHeight: "60px",
        opacity: isDragging || block.status === BlockStatus.Skipped ? 0.4 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        outline,
        outlineOffset: outline === "none" ? "0" : OUTLINE_OFFSET,
        borderRadius: "var(--radius-sm)",
      }}
    >
      <button
        ref={setDragRef}
        onClick={onClick}
        {...listeners}
        {...attributes}
        style={{
          flex: 1,
          minWidth: 0,
          background: "var(--color-bg-secondary)",
          borderLeft: `3px ${isFromRhythm ? "dashed" : "solid"} ${borderColor}`,
          borderTop: "1px solid var(--color-border)",
          borderRight: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          padding: "6px 22px 6px 8px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          textAlign: "left",
          fontSize: "12px",
          touchAction: "none",
        }}
      >
        <span
          style={{
            fontWeight: 500,
            fontSize: "11px",
            color:
              block.title && !isFromRhythm
                ? "var(--color-text-primary)"
                : "var(--color-text-muted)",
            textDecoration: isCompleted ? "line-through" : "none",
          }}
        >
          {block.title || "未命名"}
        </span>
      </button>
      <button
        onClick={onToggleComplete}
        disabled={!onToggleComplete}
        aria-label={statusToggleLabel[block.status]}
        aria-pressed={isCompleted}
        title={statusToggleLabel[block.status]}
        style={{
          position: "absolute",
          right: "2px",
          bottom: "2px",
          background: "none",
          border: "none",
          padding: "2px 4px",
          lineHeight: 1,
          fontSize: "12px",
          cursor: onToggleComplete ? "pointer" : "default",
          color: isCompleted ? borderColor : "var(--color-text-muted)",
        }}
      >
        {statusIcon[block.status]}
      </button>
    </div>
  );
}
