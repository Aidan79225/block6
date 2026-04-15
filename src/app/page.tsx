"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/presentation/components/header/header";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";
import { SidePanel } from "@/presentation/components/side-panel/side-panel";
import { DayView } from "@/presentation/components/day-view/day-view";
import { WeekOverview } from "@/presentation/components/week-overview/week-overview";
import { FloatingChecklistButton } from "@/presentation/components/checklist/floating-checklist-button";
import { WeeklyChecklistPanel } from "@/presentation/components/checklist/weekly-checklist-panel";
import { useTheme } from "@/presentation/hooks/use-theme";
import { useWeekPlan } from "@/presentation/hooks/use-week-plan";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useNotify } from "@/presentation/providers/notification-provider";
import { CopyLastWeekBanner } from "@/presentation/components/dashboard/copy-last-week-banner";
import { BlockType, BlockStatus } from "@/domain/entities/block";

type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "empty"; dayOfWeek: number; slot: number };

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
    editSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    swapBlocks,
    moveBlock,
    activeTimer,
    getElapsedSeconds,
    startTimer,
    stopTimer,
    addManualTimer,
    clearTimer,
    weeklyTasks,
    weeklyCompletions,
    addWeeklyTask,
    editWeeklyTask,
    disableWeeklyTask,
    reorderWeeklyTasks,
    toggleWeeklyTaskCompletion,
    loadWeeklyCompletions,
    copyPreviousWeekPlan,
  } = useAppState();
  const notify = useNotify();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mobileDay, setMobileDay] = useState<number>(new Date().getDay() || 7);
  const [mobileView, setMobileView] = useState<
    "day" | "overview" | "checklist"
  >("day");
  const [, forceTick] = useState(0);
  const [isCopying, setIsCopying] = useState(false);

  const weekKey = weekStart.toISOString().split("T")[0];
  const blocks = getBlocksForWeek(weekKey);

  useEffect(() => {
    loadWeek(weekKey);
  }, [weekKey, loadWeek]);

  useEffect(() => {
    loadWeeklyCompletions(weekKey);
  }, [weekKey, loadWeeklyCompletions]);

  // Force a re-render every second while a timer is running
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const selectedBlock =
    selection?.kind === "block"
      ? (blocks.find((b) => b.id === selection.blockId) ?? null)
      : null;

  const selectedDayOfWeek =
    selection?.kind === "block"
      ? (selectedBlock?.dayOfWeek ?? null)
      : (selection?.dayOfWeek ?? null);

  const selectedSlot =
    selection?.kind === "block"
      ? (selectedBlock?.slot ?? null)
      : (selection?.slot ?? null);

  useEffect(() => {
    if (selectedDayOfWeek != null) {
      const dateKey = formatDateKey(weekStart, selectedDayOfWeek);
      loadDiary(dateKey);
    }
  }, [selectedDayOfWeek, weekStart, loadDiary]);

  useEffect(() => {
    if (
      selection?.kind === "block" &&
      !blocks.find((b) => b.id === selection.blockId)
    ) {
      setSelection(null);
    }
  }, [selection, blocks]);

  const completedCount = blocks.filter(
    (b) => b.status === BlockStatus.Completed,
  ).length;
  const totalCount = blocks.length;
  const completionPct =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleCopyLastWeek = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      const count = await copyPreviousWeekPlan(weekKey);
      if (count === 0) {
        notify.info("上週沒有可複製的內容");
      } else {
        notify.info(`已複製 ${count} 個區塊`);
      }
    } catch (err) {
      console.error(err);
      notify.error("複製失敗，請稍後再試");
    } finally {
      setIsCopying(false);
    }
  };

  const handleBlockClick = (dayOfWeek: number, slot: number) => {
    const block = blocks.find(
      (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
    );
    if (block) {
      setSelection({ kind: "block", blockId: block.id });
    } else {
      setSelection({ kind: "empty", dayOfWeek, slot });
    }
  };

  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selection) return;
    const day =
      selection.kind === "block"
        ? selectedBlock?.dayOfWeek
        : selection.dayOfWeek;
    const slot =
      selection.kind === "block" ? selectedBlock?.slot : selection.slot;
    if (day == null || slot == null) return;

    const saved = saveBlock(weekKey, day, slot, title, description, blockType);

    if (selection.kind === "empty") {
      setSelection({ kind: "block", blockId: saved.id });
    }
  };

  const handleStatusChange = (status: BlockStatus) => {
    if (!selectedBlock) return;
    updateStatus(selectedBlock.id, status);
  };

  const handleSaveDiary = (bad: string, good: string, next: string) => {
    if (selectedDayOfWeek == null) return;
    const dateKey = formatDateKey(weekStart, selectedDayOfWeek);
    saveDiary(dateKey, bad, good, next);
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
          {user && blocks.length < 42 && (
            <CopyLastWeekBanner
              emptyCellCount={42 - blocks.length}
              isCopying={isCopying}
              onCopy={handleCopyLastWeek}
            />
          )}
          <div className="desktop-only">
            <WeekGrid
              blocks={blocks}
              selectedDayOfWeek={selectedDayOfWeek}
              selectedSlot={selectedSlot}
              onBlockClick={handleBlockClick}
              onSwapBlocks={swapBlocks}
              onMoveBlock={moveBlock}
            />
          </div>
          <div className="mobile-only">
            {mobileView === "day" && (
              <DayView
                dayOfWeek={mobileDay}
                blocks={blocks}
                selectedDayOfWeek={selectedDayOfWeek}
                selectedSlot={selectedSlot}
                onBlockClick={handleBlockClick}
                onPreviousDay={
                  mobileDay > 1 ? () => setMobileDay((d) => d - 1) : undefined
                }
                onNextDay={
                  mobileDay < 7 ? () => setMobileDay((d) => d + 1) : undefined
                }
              />
            )}
            {mobileView === "overview" && (
              <WeekOverview
                blocks={blocks}
                onDayClick={(day) => {
                  setMobileDay(day);
                  setMobileView("day");
                }}
              />
            )}
            {mobileView === "checklist" && user && (
              <WeeklyChecklistPanel
                tasks={weeklyTasks}
                completedIds={weeklyCompletions[weekKey] ?? new Set()}
                onAdd={addWeeklyTask}
                onEdit={editWeeklyTask}
                onToggle={(id) => toggleWeeklyTaskCompletion(id, weekKey)}
                onDisable={disableWeeklyTask}
                onReorder={reorderWeeklyTasks}
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
              {user && (
                <button
                  onClick={() => setMobileView("checklist")}
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      mobileView === "checklist"
                        ? "var(--color-accent)"
                        : "var(--color-text-secondary)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  清單
                </button>
              )}
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
        {selection && selectedDayOfWeek != null && selectedSlot != null && (
          <SidePanel
            dayOfWeek={selectedDayOfWeek}
            slot={selectedSlot}
            block={selectedBlock}
            diaryLines={getDiary(formatDateKey(weekStart, selectedDayOfWeek))}
            isToday={isTodayInWeek(weekStart, selectedDayOfWeek)}
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
            onEditSubtask={editSubtask}
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
            onClose={() => setSelection(null)}
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
          <Link
            href="/review"
            style={{
              color: "var(--color-accent)",
              fontSize: "13px",
              whiteSpace: "nowrap",
              marginLeft: "12px",
            }}
          >
            查看詳細回顧 &rarr;
          </Link>
        </footer>
      )}
      {user && (
        <div className="desktop-only">
          <FloatingChecklistButton
            tasks={weeklyTasks}
            completedIds={weeklyCompletions[weekKey] ?? new Set()}
            onAdd={addWeeklyTask}
            onEdit={editWeeklyTask}
            onToggle={(id) => toggleWeeklyTaskCompletion(id, weekKey)}
            onDisable={disableWeeklyTask}
            onReorder={reorderWeeklyTasks}
            rightOffset={selection ? "336px" : "16px"}
          />
        </div>
      )}
    </div>
  );
}
