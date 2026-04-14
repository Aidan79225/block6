interface Entry {
  dayOfWeek: number;
  line1: string;
  line2: string;
  line3: string;
}

interface Props {
  entries: Array<Entry | null>; // length 7, index 0 = Monday
}

const DAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

export function DiaryWeekView({ entries }: Props) {
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
        本週日記
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(110px, 1fr))",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {DAY_LABELS.map((label, i) => {
          const entry = entries[i] ?? null;
          return (
            <div
              key={label}
              style={{
                background: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                padding: "8px",
                minHeight: "100px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              {entry ? (
                <>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "12px",
                    }}
                  >
                    {entry.line1}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "12px",
                    }}
                  >
                    {entry.line2}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "12px",
                    }}
                  >
                    {entry.line3}
                  </span>
                </>
              ) : (
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                  }}
                >
                  —
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
