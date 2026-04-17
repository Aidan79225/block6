interface DiaryReadOnlyViewProps {
  bad: string;
  good: string;
  next: string;
}

const FIELD_CONFIG: Array<{
  key: "bad" | "good" | "next";
  label: string;
}> = [
  { key: "bad", label: "Bad" },
  { key: "good", label: "Good" },
  { key: "next", label: "Next" },
];

export function DiaryReadOnlyView({
  bad,
  good,
  next,
}: DiaryReadOnlyViewProps) {
  const values = { bad, good, next };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        情緒日記
      </span>
      {FIELD_CONFIG.map(({ key, label }) => (
        <div
          key={key}
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span
            style={{
              color: "var(--color-text-muted)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
          <span
            style={{
              color: "var(--color-text-primary)",
              fontSize: "14px",
            }}
          >
            {values[key] || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
