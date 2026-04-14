import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface BlockCellProps {
  block: Block | null;
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

const statusIcon: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "",
  [BlockStatus.InProgress]: "\u25B6",
  [BlockStatus.Completed]: "\u2713",
  [BlockStatus.Skipped]: "\u2013",
};

export function BlockCell({ block, isSelected, onClick }: BlockCellProps) {
  if (!block) {
    return (
      <button
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
          outline: isSelected ? SELECTED_OUTLINE : "none",
          outlineOffset: isSelected ? SELECTED_OUTLINE_OFFSET : "0",
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
      onClick={onClick}
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
        opacity: block.status === BlockStatus.Skipped ? 0.5 : 1,
        outline: isSelected ? SELECTED_OUTLINE : "none",
        outlineOffset: isSelected ? SELECTED_OUTLINE_OFFSET : "0",
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
