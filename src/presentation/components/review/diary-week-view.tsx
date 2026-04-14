interface Entry {
  dayOfWeek: number;
  bad: string;
  good: string;
  next: string;
}

interface Props {
  entries: Array<Entry | null>;
}

const DAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

const FIELDS: Array<{ key: "bad" | "good" | "next"; label: string }> = [
  { key: "bad", label: "Bad" },
  { key: "good", label: "Good" },
  { key: "next", label: "Next" },
];

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
          gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
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
                minHeight: "120px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
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
                FIELDS.map(({ key, label: fieldLabel }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "10px",
                        fontWeight: 600,
                      }}
                    >
                      {fieldLabel}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontSize: "12px",
                      }}
                    >
                      {entry[key] || "—"}
                    </span>
                  </div>
                ))
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
