"use client";

import type { Block } from "@/domain/entities/block";
import { BLOCK_TYPE_COLOR } from "@/presentation/components/block-type-color";

interface RegretPickerProps {
  blocks: Block[];
  onToggle: (blockId: string, regretted: boolean) => void;
  /** How many regretted blocks the rhythm would bring back every week. */
  rhythmSlotCount: number;
  onRemoveFromRhythm: () => void;
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];
// The method's unit: one block is roughly two hours.
const HOURS_PER_BLOCK = 2;

/**
 * The review's closing question. Its answer is next week's cheapest input:
 * regretted blocks are not copied forward, and can be dropped from the rhythm.
 */
export function RegretPicker({
  blocks,
  onToggle,
  rhythmSlotCount,
  onRemoveFromRhythm,
}: RegretPickerProps) {
  const regrettedCount = blocks.filter((b) => b.regretted).length;
  const find = (dayOfWeek: number, slot: number) =>
    blocks.find((b) => b.dayOfWeek === dayOfWeek && b.slot === slot);

  return (
    <section
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          哪幾格不值得？
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "13px",
            margin: "4px 0 0",
          }}
        >
          {regrettedCount === 0
            ? "點選事後覺得不值得的格子。它們不會被複製到下週。"
            : `${regrettedCount} 格不值得（約 ${regrettedCount * HOURS_PER_BLOCK} 小時），不會被複製到下週。`}
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "4px",
        }}
      >
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        ))}
        {SLOTS.map((slot) =>
          DAY_LABELS.map((_, i) => {
            const block = find(i + 1, slot);
            if (!block) return <div key={`${i}-${slot}`} />;
            const title = block.title || "未命名";
            return (
              <button
                key={`${i}-${slot}`}
                onClick={() => onToggle(block.id, !block.regretted)}
                aria-pressed={block.regretted}
                aria-label={`週${DAY_LABELS[i]}第 ${slot} 格：${title}`}
                title={title}
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  padding: "6px 4px",
                  fontSize: "11px",
                  borderRadius: "var(--radius-sm)",
                  border: block.regretted
                    ? "1px solid var(--color-block-buffer)"
                    : "1px solid var(--color-border)",
                  borderLeft: `3px solid ${BLOCK_TYPE_COLOR[block.blockType]}`,
                  background: block.regretted
                    ? "var(--color-bg-tertiary)"
                    : "var(--color-bg-primary)",
                  color: block.regretted
                    ? "var(--color-text-muted)"
                    : "var(--color-text-primary)",
                  textDecoration: block.regretted ? "line-through" : "none",
                  cursor: "pointer",
                }}
              >
                {title}
              </button>
            );
          }),
        )}
      </div>
      {rhythmSlotCount > 0 && (
        <button
          onClick={onRemoveFromRhythm}
          style={{
            alignSelf: "flex-start",
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "6px 12px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          下週起從常駐節奏拿掉這 {rhythmSlotCount} 格
        </button>
      )}
    </section>
  );
}
