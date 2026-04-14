import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface BlockCardProps {
  block: Block | null;
  slot: number;
  isSelected?: boolean;
  onClick: () => void;
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
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `4px solid ${borderColor}`,
        borderTop: "1px solid var(--color-border)",
        borderRight: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        textAlign: "left",
        opacity: block.status === BlockStatus.Skipped ? 0.5 : 1,
        outline: isSelected ? SELECTED_OUTLINE : "none",
        outlineOffset: isSelected ? SELECTED_OUTLINE_OFFSET : "0",
      }}
    >
      <div>
        <div
          style={{
            color: "var(--color-text-primary)",
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          {block.title}
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
      </div>
      {statusLabel[block.status] && (
        <span style={{ color: borderColor, fontSize: "12px", flexShrink: 0 }}>
          {statusLabel[block.status]}
        </span>
      )}
    </button>
  );
}
