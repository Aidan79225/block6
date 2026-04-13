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

export function WeekNavigator({ weekStart, onPreviousWeek, onNextWeek }: WeekNavigatorProps) {
  const weekEnd = addDays(weekStart, 6);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <button onClick={onPreviousWeek} aria-label="Previous week"
        style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer", fontSize: "18px", padding: "4px 8px" }}>
        &larr;
      </button>
      <span style={{ color: "var(--color-text-primary)", fontSize: "16px", fontWeight: 600, minWidth: "140px", textAlign: "center" }}>
        {formatDate(weekStart)} &ndash; {formatDate(weekEnd)}
      </span>
      <button onClick={onNextWeek} aria-label="Next week"
        style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer", fontSize: "18px", padding: "4px 8px" }}>
        &rarr;
      </button>
    </div>
  );
}
