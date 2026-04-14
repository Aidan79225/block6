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
}

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};

const statusIcon: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "",
  [BlockStatus.InProgress]: "\u25B6",
  [BlockStatus.Completed]: "\u2713",
  [BlockStatus.Skipped]: "\u2013",
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

  const combinedRef = (node: HTMLButtonElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

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
  const icon = statusIcon[block.status];

  return (
    <button
      ref={combinedRef}
      onClick={onClick}
      {...listeners}
      {...attributes}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `3px solid ${borderColor}`,
        borderTop: "1px solid var(--color-border)",
        borderRight: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
        padding: "6px 8px",
        minHeight: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        fontSize: "12px",
        opacity: isDragging || block.status === BlockStatus.Skipped ? 0.4 : 1,
        outline,
        outlineOffset: outline === "none" ? "0" : OUTLINE_OFFSET,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
    >
      <span style={{ fontWeight: 500, fontSize: "11px" }}>{block.title}</span>
      {icon && (
        <span
          style={{
            alignSelf: "flex-end",
            fontSize: "12px",
            color: borderColor,
          }}
        >
          {icon}
        </span>
      )}
    </button>
  );
}
