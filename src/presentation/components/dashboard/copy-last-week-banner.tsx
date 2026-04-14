"use client";

interface Props {
  emptyCellCount: number;
  isCopying: boolean;
  onCopy: () => void;
}

export function CopyLastWeekBanner({
  emptyCellCount,
  isCopying,
  onCopy,
}: Props) {
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
        還有 {emptyCellCount} 格未填 — 要從上週複製嗎？
      </span>
      <button
        onClick={onCopy}
        disabled={isCopying}
        style={{
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "6px 14px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: isCopying ? "not-allowed" : "pointer",
          opacity: isCopying ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {isCopying ? "複製中…" : "從上週複製 →"}
      </button>
    </div>
  );
}
