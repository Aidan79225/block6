interface TypeData {
  total: number;
  completed: number;
}

interface BlockTypeBreakdownProps {
  byType: {
    core: TypeData;
    rest: TypeData;
    buffer: TypeData;
  };
}

const typeConfig = [
  { key: "core" as const, label: "核心", color: "var(--color-block-core)" },
  { key: "rest" as const, label: "休息", color: "var(--color-block-rest)" },
  { key: "buffer" as const, label: "緩衝", color: "var(--color-block-buffer)" },
];

export function BlockTypeBreakdown({ byType }: BlockTypeBreakdownProps) {
  return (
    <div style={{ background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", padding: "20px", border: "1px solid var(--color-border)" }}>
      <h3 style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>區塊類型分佈</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {typeConfig.map(({ key, label, color }) => {
          const data = byType[key];
          const rate = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--color-text-primary)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: "12px" }}>{data.completed}/{data.total} ({rate}%)</span>
              </div>
              <div style={{ background: "var(--color-bg-tertiary)", borderRadius: "var(--radius-sm)", height: "6px", overflow: "hidden" }}>
                <div style={{ background: color, height: "100%", width: `${rate}%`, borderRadius: "var(--radius-sm)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
