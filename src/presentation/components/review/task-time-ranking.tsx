interface Item {
  title: string;
  totalSeconds: number;
}

interface Props {
  items: Item[];
}

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function TaskTimeRanking({ items }: Props) {
  const max = items.reduce((m, i) => Math.max(m, i.totalSeconds), 0);

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
          marginBottom: "16px",
        }}
      >
        本週時間分佈
      </h3>
      {items.length === 0 ? (
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "13px",
            fontStyle: "italic",
          }}
        >
          本週尚無計時紀錄
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item) => {
            const width = max === 0 ? 0 : (item.totalSeconds / max) * 100;
            return (
              <div key={item.title}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "12px",
                    }}
                  >
                    {formatDuration(item.totalSeconds)}
                  </span>
                </div>
                <div
                  style={{
                    background: "var(--color-bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    height: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "var(--color-accent)",
                      height: "100%",
                      width: `${width}%`,
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
