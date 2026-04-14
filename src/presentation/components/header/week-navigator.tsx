interface WeekNavigatorProps {
  weekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function WeekNavigator({
  weekStart,
  onPreviousWeek,
  onNextWeek,
}: WeekNavigatorProps) {
  const weekEnd = addDays(weekStart, 6);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        minWidth: 0,
      }}
    >
      <button
        onClick={onPreviousWeek}
        aria-label="Previous week"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: "18px",
          padding: "4px 6px",
          flexShrink: 0,
        }}
      >
        &larr;
      </button>
      <span
        style={{
          color: "var(--color-text-primary)",
          fontSize: "14px",
          fontWeight: 600,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {formatDate(weekStart)} &ndash; {formatDate(weekEnd)}
      </span>
      <button
        onClick={onNextWeek}
        aria-label="Next week"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          cursor: "pointer",
          fontSize: "18px",
          padding: "4px 6px",
          flexShrink: 0,
        }}
      >
        &rarr;
      </button>
    </div>
  );
}
