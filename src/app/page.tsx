"use client";

import { useState, useEffect } from "react";
import { Header } from "@/presentation/components/header/header";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";
import { SidePanel } from "@/presentation/components/side-panel/side-panel";
import { DayView } from "@/presentation/components/day-view/day-view";
import { WeekOverview } from "@/presentation/components/week-overview/week-overview";
import { useTheme } from "@/presentation/hooks/use-theme";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useAuth } from "@/presentation/providers/auth-provider";
import { BlockType, BlockStatus } from "@/domain/entities/block";

interface SelectedCell {
  dayOfWeek: number;
  slot: number;
}

function formatDateKey(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.toISOString().split("T")[0];
}

function isTodayInWeek(weekStart: Date, dayOfWeek: number): boolean {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekPlan();
  const {
    getBlocksForWeek,
    saveBlock,
    updateStatus,
    saveDiary,
    getDiary,
    loadWeek,
    loadDiary,
    getSubtasksForBlock,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    activeTimer,
    getElapsedSeconds,
    startTimer,
    stopTimer,
    addManualTimer,
    clearTimer,
  } = useAppState();
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [mobileDay, setMobileDay] = useState<number>(new Date().getDay() || 7);
  const [mobileView, setMobileView] = useState<"day" | "overview">("day");
  const [, forceTick] = useState(0);

  const weekKey = weekStart.toISOString().split("T")[0];
  const blocks = getBlocksForWeek(weekKey);

  useEffect(() => {
    loadWeek(weekKey);
  }, [weekKey, loadWeek]);

  useEffect(() => {
    if (selected) {
      const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
      loadDiary(dateKey);
    }
  }, [selected, weekStart, loadDiary]);

  // Force a re-render every second while a timer is running
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const completedCount = blocks.filter(
    (b) => b.status === BlockStatus.Completed,
  ).length;
  const totalCount = blocks.length;
  const completionPct =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleBlockClick = (dayOfWeek: number, slot: number) => {
    setSelected({ dayOfWeek, slot });
  };

  const selectedBlock = selected
    ? (blocks.find(
        (b) => b.dayOfWeek === selected.dayOfWeek && b.slot === selected.slot,
      ) ?? null)
    : null;

  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selected) return;
    saveBlock(
      weekKey,
      selected.dayOfWeek,
      selected.slot,
      title,
      description,
      blockType,
    );
  };

  const handleStatusChange = (status: BlockStatus) => {
    if (!selectedBlock) return;
    updateStatus(selectedBlock.id, status);
  };

  const handleSaveDiary = (line1: string, line2: string, line3: string) => {
    if (!selected) return;
    const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
    saveDiary(dateKey, line1, line2, line3);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header
        weekStart={weekStart}
        theme={theme}
        userEmail={user?.email ?? null}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, padding: "16px", overflow: "auto" }}>
          <div className="desktop-only">
            <WeekGrid blocks={blocks} onBlockClick={handleBlockClick} />
          </div>
          <div className="mobile-only">
            {mobileView === "day" ? (
              <DayView
                dayOfWeek={mobileDay}
                blocks={blocks}
                onBlockClick={handleBlockClick}
                onPreviousDay={
                  mobileDay > 1 ? () => setMobileDay((d) => d - 1) : undefined
                }
                onNextDay={
                  mobileDay < 7 ? () => setMobileDay((d) => d + 1) : undefined
                }
              />
            ) : (
              <WeekOverview
                blocks={blocks}
                onDayClick={(day) => {
                  setMobileDay(day);
                  setMobileView("day");
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                padding: "12px 0",
                borderTop: "1px solid var(--color-border)",
                marginTop: "16px",
              }}
            >
              <button
                onClick={() => setMobileView("overview")}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    mobileView === "overview"
                      ? "var(--color-accent)"
                      : "var(--color-text-secondary)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                週總覽
              </button>
              <button
                onClick={() => setMobileView("day")}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    mobileView === "day"
                      ? "var(--color-accent)"
                      : "var(--color-text-secondary)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                今日
              </button>
              <a
                href="/review"
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                }}
              >
                回顧
              </a>
            </div>
          </div>
        </main>
        {selected && (
          <SidePanel
            dayOfWeek={selected.dayOfWeek}
            slot={selected.slot}
            block={selectedBlock}
            diaryLines={getDiary(formatDateKey(weekStart, selected.dayOfWeek))}
            isToday={isTodayInWeek(weekStart, selected.dayOfWeek)}
            subtasks={
              selectedBlock ? getSubtasksForBlock(selectedBlock.id) : []
            }
            elapsedSeconds={
              selectedBlock
                ? getElapsedSeconds(selectedBlock.id, new Date())
                : 0
            }
            isTimerActive={
              !!(selectedBlock && activeTimer?.blockId === selectedBlock.id)
            }
            otherBlockIsActive={
              !!activeTimer &&
              !!selectedBlock &&
              activeTimer.blockId !== selectedBlock.id
            }
            onSaveBlock={handleSaveBlock}
            onStatusChange={handleStatusChange}
            onSaveDiary={handleSaveDiary}
            onAddSubtask={(title) => {
              if (selectedBlock) addSubtask(selectedBlock.id, title);
            }}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
            onReorderSubtasks={(orderedIds) => {
              if (selectedBlock) reorderSubtasks(selectedBlock.id, orderedIds);
            }}
            onStartTimer={() => {
              if (selectedBlock) startTimer(selectedBlock.id);
            }}
            onStopTimer={() => {
              stopTimer();
            }}
            onAddManualTimer={(s, e) => {
              if (selectedBlock) addManualTimer(selectedBlock.id, s, e);
            }}
            onClearTimer={() => {
              if (selectedBlock) clearTimer(selectedBlock.id);
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      {blocks.length > 0 && (
        <footer
          className="desktop-only"
          style={{
            padding: "8px 24px",
            backgroundColor: "var(--color-bg-secondary)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            本週完成率 {completionPct}% ({completedCount}/{totalCount})
          </span>
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              height: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "var(--color-status-completed)",
                height: "100%",
                width: `${completionPct}%`,
                borderRadius: "var(--radius-sm)",
                transition: "width 0.3s",
              }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}
