import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface BlockCardProps {
  block: Block | null;
  slot: number;
  isSelected?: boolean;
  onClick: () => void;
  onToggleComplete?: () => void;
}

const SELECTED_OUTLINE = "2px solid var(--color-accent)";
const SELECTED_OUTLINE_OFFSET = "1px";

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};

const statusLabel: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "",
  [BlockStatus.InProgress]: "\u25B6 進行中",
  [BlockStatus.Completed]: "\u2713 已完成",
  [BlockStatus.Skipped]: "\u2013 跳過",
};

export function BlockCard({
  block,
  slot,
  isSelected,
  onClick,
  onToggleComplete,
}: BlockCardProps) {
  if (!block) {
    return (
      <button
        onClick={onClick}
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: "14px",
          width: "100%",
          outline: isSelected ? SELECTED_OUTLINE : "none",
          outlineOffset: isSelected ? SELECTED_OUTLINE_OFFSET : "0",
        }}
      >
        區塊 {slot} — 點擊新增
      </button>
    );
  }
  const borderColor = typeColorMap[block.blockType];
  const isCompleted = block.status === BlockStatus.Completed;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "var(--color-bg-secondary)",
        borderLeft: `4px solid ${borderColor}`,
        borderTop: "1px solid var(--color-border)",
        borderRight: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        width: "100%",
        opacity: block.status === BlockStatus.Skipped ? 0.5 : 1,
        outline: isSelected ? SELECTED_OUTLINE : "none",
        outlineOffset: isSelected ? SELECTED_OUTLINE_OFFSET : "0",
      }}
    >
      <button
        onClick={onClick}
        style={{
          flex: 1,
          minWidth: 0,
          background: "none",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "14px 8px 14px 16px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            color: block.title
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            fontSize: "15px",
            fontWeight: 500,
            textDecoration: isCompleted ? "line-through" : "none",
          }}
        >
          {block.title || "未命名"}
        </div>
        {block.description && (
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "12px",
              marginTop: "4px",
            }}
          >
            {block.description}
          </div>
        )}
      </button>
      <button
        onClick={onToggleComplete}
        disabled={!onToggleComplete}
        aria-label={isCompleted ? "取消完成" : "標記完成"}
        aria-pressed={isCompleted}
        style={{
          background: "none",
          border: "none",
          borderLeft: "1px solid var(--color-border)",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          color: isCompleted ? borderColor : "var(--color-text-muted)",
          cursor: onToggleComplete ? "pointer" : "default",
          fontSize: "12px",
          flexShrink: 0,
          padding: "0 14px",
          minWidth: "72px",
        }}
      >
        {statusLabel[block.status] || "\u25CB 未完成"}
      </button>
    </div>
  );
}
