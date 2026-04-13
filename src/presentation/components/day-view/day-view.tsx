import type { Block } from "@/domain/entities/block";
import { BlockCard } from "./block-card";

interface DayViewProps {
  dayOfWeek: number;
  blocks: Block[];
  onBlockClick: (dayOfWeek: number, slot: number) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
}
const SLOTS = [1, 2, 3, 4, 5, 6];
const DAY_LABELS = ["", "週一", "週二", "週三", "週四", "週五", "週六", "週日"];

export function DayView({
  dayOfWeek,
  blocks,
  onBlockClick,
  onPreviousDay,
  onNextDay,
}: DayViewProps) {
  function findBlock(slot: number): Block | null {
    return (
      blocks.find((b) => b.dayOfWeek === dayOfWeek && b.slot === slot) ?? null
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "8px 0",
        }}
      >
        {onPreviousDay && (
          <button
            onClick={onPreviousDay}
            aria-label="Previous day"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px 8px",
            }}
          >
            &larr;
          </button>
        )}
        <h2
          style={{
            color: "var(--color-text-primary)",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          {DAY_LABELS[dayOfWeek]}
        </h2>
        {onNextDay && (
          <button
            onClick={onNextDay}
            aria-label="Next day"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px 8px",
            }}
          >
            &rarr;
          </button>
        )}
      </div>
      {SLOTS.map((slot) => {
        const block = findBlock(slot);
        return (
          <BlockCard
            key={slot}
            block={block}
            slot={slot}
            onClick={() => onBlockClick(dayOfWeek, slot)}
          />
        );
      })}
    </div>
  );
}
