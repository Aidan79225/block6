import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface WeekOverviewProps { blocks: Block[]; onDayClick: (dayOfWeek: number) => void; }
const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];
const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)", [BlockType.Rest]: "var(--color-block-rest)", [BlockType.Buffer]: "var(--color-block-buffer)",
};

export function WeekOverview({ blocks, onDayClick }: WeekOverviewProps) {
  function findBlock(day: number, slot: number): Block | null { return blocks.find((b) => b.dayOfWeek === day && b.slot === slot) ?? null; }
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
        {DAY_LABELS.map((label, i) => (
          <div key={`label-${i}`} style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: "11px", padding: "4px 0" }}>{label}</div>
        ))}
        {SLOTS.map((slot) => DAY_LABELS.map((_, dayIndex) => {
          const day = dayIndex + 1;
          const block = findBlock(day, slot);
          const bgColor = block ? block.status === BlockStatus.Completed ? typeColorMap[block.blockType] : "var(--color-bg-tertiary)" : "var(--color-bg-secondary)";
          const borderColor = block ? typeColorMap[block.blockType] : "var(--color-border)";
          return <button key={`${day}-${slot}`} onClick={() => onDayClick(day)}
            style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: "2px", height: "16px", cursor: "pointer", padding: 0 }} />;
        }))}
      </div>
    </div>
  );
}
