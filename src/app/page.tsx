"use client";

import { useState } from "react";
import { Header } from "@/presentation/components/header/header";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";
import { SidePanel } from "@/presentation/components/side-panel/side-panel";
import { useTheme } from "@/presentation/hooks/use-theme";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { useBlocks } from "@/presentation/hooks/use-blocks";
import { useDiary } from "@/presentation/hooks/use-diary";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface SelectedCell { dayOfWeek: number; slot: number; block: Block | null; }

function formatDateKey(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

function isTodayInWeek(weekStart: Date, dayOfWeek: number): boolean {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const today = new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekPlan();
  const { blocks, saveBlock, updateStatus } = useBlocks();
  const { saveDiary, getDiary } = useDiary();
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const handleBlockClick = (dayOfWeek: number, slot: number, block: Block | null) => {
    setSelected({ dayOfWeek, slot, block });
  };

  const handleSaveBlock = (title: string, description: string, blockType: BlockType) => {
    if (!selected) return;
    saveBlock("local-plan", selected.dayOfWeek, selected.slot, title, description, blockType);
    const updatedBlock = blocks.find((b) => b.dayOfWeek === selected.dayOfWeek && b.slot === selected.slot);
    setSelected((prev) => prev ? { ...prev, block: updatedBlock ?? prev.block } : null);
  };

  const handleStatusChange = (status: BlockStatus) => {
    if (!selected?.block) return;
    updateStatus(selected.block.id, status);
  };

  const handleSaveDiary = (line1: string, line2: string, line3: string) => {
    if (!selected) return;
    const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
    saveDiary(dateKey, line1, line2, line3);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header weekStart={weekStart} theme={theme} onPreviousWeek={goToPreviousWeek} onNextWeek={goToNextWeek} onToggleTheme={toggleTheme} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, padding: "16px", overflow: "auto" }}>
          <WeekGrid blocks={blocks} onBlockClick={handleBlockClick} />
        </main>
        {selected && (
          <SidePanel
            dayOfWeek={selected.dayOfWeek}
            slot={selected.slot}
            block={blocks.find((b) => b.dayOfWeek === selected.dayOfWeek && b.slot === selected.slot) ?? null}
            diaryLines={getDiary(formatDateKey(weekStart, selected.dayOfWeek))}
            isToday={isTodayInWeek(weekStart, selected.dayOfWeek)}
            onSaveBlock={handleSaveBlock}
            onStatusChange={handleStatusChange}
            onSaveDiary={handleSaveDiary}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
