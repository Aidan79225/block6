import type { Block } from "@/domain/entities/block";
import { BlockCell } from "./block-cell";

interface WeekGridProps {
  blocks: Block[];
  selectedDayOfWeek?: number | null;
  selectedSlot?: number | null;
  onBlockClick: (dayOfWeek: number, slot: number) => void;
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];

export function WeekGrid({
  blocks,
  selectedDayOfWeek,
  selectedSlot,
  onBlockClick,
}: WeekGridProps) {
  function findBlock(day: number, slot: number): Block | null {
    return blocks.find((b) => b.dayOfWeek === day && b.slot === slot) ?? null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px",
        flex: 1,
      }}
    >
      {DAY_LABELS.map((label, i) => (
        <div
          key={`header-${i}`}
          style={{
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            padding: "8px 0",
          }}
        >
          {label}
        </div>
      ))}
      {SLOTS.map((slot) =>
        DAY_LABELS.map((_, dayIndex) => {
          const dayOfWeek = dayIndex + 1;
          const block = findBlock(dayOfWeek, slot);
          return (
            <BlockCell
              key={`${dayOfWeek}-${slot}`}
              block={block}
              isSelected={
                selectedDayOfWeek === dayOfWeek && selectedSlot === slot
              }
              onClick={() => onBlockClick(dayOfWeek, slot)}
            />
          );
        }),
      )}
    </div>
  );
}
