import type { Block } from "@/domain/entities/block";
import { BlockCard } from "./block-card";

interface DayViewProps {
  dayOfWeek: number;
  blocks: Block[];
  onBlockClick: (dayOfWeek: number, slot: number, block: Block | null) => void;
}
const SLOTS = [1, 2, 3, 4, 5, 6];
const DAY_LABELS = ["", "週一", "週二", "週三", "週四", "週五", "週六", "週日"];

export function DayView({ dayOfWeek, blocks, onBlockClick }: DayViewProps) {
  function findBlock(slot: number): Block | null {
    return (
      blocks.find((b) => b.dayOfWeek === dayOfWeek && b.slot === slot) ?? null
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <h2
        style={{
          textAlign: "center",
          color: "var(--color-text-primary)",
          fontSize: "16px",
          fontWeight: 600,
          padding: "8px 0",
        }}
      >
        {DAY_LABELS[dayOfWeek]}
      </h2>
      {SLOTS.map((slot) => {
        const block = findBlock(slot);
        return (
          <BlockCard
            key={slot}
            block={block}
            slot={slot}
            onClick={() => onBlockClick(dayOfWeek, slot, block)}
          />
        );
      })}
    </div>
  );
}
