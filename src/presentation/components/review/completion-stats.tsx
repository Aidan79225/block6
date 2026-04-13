interface CompletionStatsProps {
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number;
}

export function CompletionStats({
  totalBlocks,
  completedBlocks,
  completionRate,
}: CompletionStatsProps) {
  const percentage = Math.round(completionRate * 100);
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "12px",
        }}
      >
        完成率
      </h3>
      <div
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "var(--color-accent)",
          marginBottom: "8px",
        }}
      >
        {percentage}%
      </div>
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          marginBottom: "12px",
        }}
      >
        {completedBlocks} / {totalBlocks} 區塊完成
      </div>
      <div
        style={{
          background: "var(--color-bg-tertiary)",
          borderRadius: "var(--radius-sm)",
          height: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "var(--color-status-completed)",
            height: "100%",
            width: `${percentage}%`,
            borderRadius: "var(--radius-sm)",
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
