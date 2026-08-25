"use client";

interface Props {
  emptyCellCount: number;
  isCopying: boolean;
  isApplyingTemplate: boolean;
  onCopy?: () => void;
  onApplyTemplate: () => void;
}

const actionButtonStyle = (disabled: boolean, primary: boolean) => ({
  background: primary ? "var(--color-accent)" : "var(--color-bg-tertiary)",
  color: primary ? "white" : "var(--color-text-primary)",
  border: primary ? "none" : "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  whiteSpace: "nowrap" as const,
});

export function WeekStartBanner({
  emptyCellCount,
  isCopying,
  isApplyingTemplate,
  onCopy,
  onApplyTemplate,
}: Props) {
  const busy = isCopying || isApplyingTemplate;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--color-bg-secondary)",
        borderLeft: "4px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        padding: "10px 16px",
        marginBottom: "12px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          color: "var(--color-text-primary)",
          fontSize: "13px",
          flex: 1,
          minWidth: 0,
        }}
      >
        還有 {emptyCellCount} 格未填 — 要怎麼起頭？
      </span>
      {onCopy && (
        <button
          onClick={onCopy}
          disabled={busy}
          style={actionButtonStyle(busy, true)}
        >
          {isCopying ? "複製中…" : "從最近一週複製"}
        </button>
      )}
      <button
        onClick={onApplyTemplate}
        disabled={busy}
        style={actionButtonStyle(busy, !onCopy)}
      >
        {isApplyingTemplate ? "套用中…" : "套用預設節奏"}
      </button>
    </div>
  );
}
