"use client";

import { useState } from "react";
import type { Block } from "@/domain/entities/block";
import { BlockCell } from "./block-cell";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { containsSlot, type SlotPosition } from "@/domain/usecases/slot-range";
import { BLOCK_TYPE_COLOR } from "@/presentation/components/block-type-color";

interface WeekGridProps {
  blocks: Block[];
  selectedDayOfWeek?: number | null;
  selectedSlot?: number | null;
  /** `extend` is true for Shift+click, which selects a range. */
  onBlockClick: (dayOfWeek: number, slot: number, extend: boolean) => void;
  /** Cells of a selected range, highlighted together. */
  rangeSlots?: readonly SlotPosition[];
  /** Clicking a day header selects that whole day. */
  onSelectDay?: (dayOfWeek: number) => void;
  onSwapBlocks: (idA: string, idB: string) => void;
  onMoveBlock: (id: string, dayOfWeek: number, slot: number) => void;
  onToggleComplete?: (blockId: string) => void;
  isRhythmBlock?: (blockId: string) => boolean;
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];

const headerStyle = {
  textAlign: "center",
  color: "var(--color-text-secondary)",
  fontSize: "13px",
  fontWeight: 600,
  padding: "8px 0",
} as const;

function parseSlotId(id: string): { day: number; slot: number } | null {
  const m = /^slot-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { day: Number(m[1]), slot: Number(m[2]) };
}

function parseBlockId(id: string): string | null {
  const m = /^block-(.+)$/.exec(id);
  return m ? m[1] : null;
}

export function WeekGrid({
  blocks,
  selectedDayOfWeek,
  selectedSlot,
  onBlockClick,
  onSwapBlocks,
  onMoveBlock,
  onToggleComplete,
  isRhythmBlock,
  rangeSlots = [],
  onSelectDay,
}: WeekGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
  );

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  function findBlock(day: number, slot: number): Block | null {
    return blocks.find((b) => b.dayOfWeek === day && b.slot === slot) ?? null;
  }

  const activeBlock = activeBlockId
    ? (blocks.find((b) => b.id === activeBlockId) ?? null)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = parseBlockId(String(event.active.id));
    if (id) setActiveBlockId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveBlockId(null);
    const { active, over } = event;
    if (!over) return;
    const sourceBlockId = parseBlockId(String(active.id));
    const target = parseSlotId(String(over.id));
    if (!sourceBlockId || !target) return;

    const source = blocks.find((b) => b.id === sourceBlockId);
    if (!source) return;
    if (source.dayOfWeek === target.day && source.slot === target.slot) return;

    const targetBlock = findBlock(target.day, target.slot);
    if (targetBlock) {
      onSwapBlocks(sourceBlockId, targetBlock.id);
    } else {
      onMoveBlock(sourceBlockId, target.day, target.slot);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveBlockId(null)}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          flex: 1,
        }}
      >
        {DAY_LABELS.map((label, i) =>
          onSelectDay ? (
            <button
              key={`header-${i}`}
              onClick={() => onSelectDay(i + 1)}
              aria-label={`選取週${label}整天`}
              title="選取整天，一次命名"
              style={{
                ...headerStyle,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ) : (
            <div key={`header-${i}`} style={headerStyle}>
              {label}
            </div>
          ),
        )}
        {SLOTS.map((slot) =>
          DAY_LABELS.map((_, dayIndex) => {
            const dayOfWeek = dayIndex + 1;
            const block = findBlock(dayOfWeek, slot);
            return (
              <BlockCell
                key={`${dayOfWeek}-${slot}`}
                block={block}
                dayOfWeek={dayOfWeek}
                slot={slot}
                isSelected={
                  (selectedDayOfWeek === dayOfWeek && selectedSlot === slot) ||
                  containsSlot(rangeSlots, dayOfWeek, slot)
                }
                onClick={(e) => onBlockClick(dayOfWeek, slot, e.shiftKey)}
                onToggleComplete={
                  block && onToggleComplete
                    ? () => onToggleComplete(block.id)
                    : undefined
                }
                isFromRhythm={!!block && !!isRhythmBlock?.(block.id)}
              />
            );
          }),
        )}
      </div>
      <DragOverlay>
        {activeBlock && (
          <div
            style={{
              background: "var(--color-bg-secondary)",
              borderLeft: `3px solid ${BLOCK_TYPE_COLOR[activeBlock.blockType]}`,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "6px 8px",
              minHeight: "60px",
              fontSize: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              opacity: 0.9,
            }}
          >
            <span style={{ fontWeight: 500, fontSize: "11px" }}>
              {activeBlock.title}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
