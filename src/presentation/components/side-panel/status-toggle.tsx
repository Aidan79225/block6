import { BlockStatus } from "@/domain/entities/block";

interface StatusToggleProps {
  status: BlockStatus;
  onChange: (status: BlockStatus) => void;
}

const statuses: BlockStatus[] = [
  BlockStatus.Planned,
  BlockStatus.InProgress,
  BlockStatus.Completed,
  BlockStatus.Skipped,
];

const statusColorMap: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "var(--color-status-planned)",
  [BlockStatus.InProgress]: "var(--color-status-in-progress)",
  [BlockStatus.Completed]: "var(--color-status-completed)",
  [BlockStatus.Skipped]: "var(--color-status-skipped)",
};

export function StatusToggle({ status, onChange }: StatusToggleProps) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          aria-pressed={s === status}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--radius-sm)",
            border:
              s === status
                ? `2px solid ${statusColorMap[s]}`
                : "1px solid var(--color-border)",
            background:
              s === status ? statusColorMap[s] : "var(--color-bg-tertiary)",
            color:
              s === status
                ? "var(--color-bg-primary)"
                : "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: s === status ? 600 : 400,
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
