"use client";

import { useState } from "react";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
import type { Subtask } from "@/domain/entities/subtask";
import { BlockEditor } from "./block-editor";
import { StatusToggle } from "./status-toggle";
import { DiaryForm } from "./diary-form";
import { DiaryReadOnlyView } from "./diary-readonly-view";
import { SubtaskList } from "./subtask-list";
import { BlockTimer } from "./block-timer";

interface SidePanelProps {
  dayOfWeek: number;
  slot: number;
  block: Block | null;
  diaryLines: { bad: string; good: string; next: string } | null;
  diaryMode: "editable" | "readonly" | "hidden";
  subtasks: Subtask[];
  elapsedSeconds: number;
  isTimerActive: boolean;
  otherBlockIsActive: boolean;
  onSaveBlock: (
    title: string,
    description: string,
    blockType: BlockType,
  ) => void;
  onStatusChange: (status: BlockStatus) => void;
  onSaveDiary: (bad: string, good: string, next: string) => void;
  onAddSubtask: (title: string) => void;
  onEditSubtask: (id: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onReorderSubtasks: (orderedIds: string[]) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onAddManualTimer: (startedAt: Date, endedAt: Date) => void;
  onClearTimer: () => void;
  onClose: () => void;
  onDeleteBlock: () => void;
  keyResultOptions: {
    keyResultId: string;
    title: string;
    objectiveTitle: string;
  }[];
  onLinkBlockKeyResult: (keyResultId: string | null) => void;
  projectOptions: { projectId: string; title: string }[];
  onLinkBlockProject: (projectId: string | null) => void;
}

const DAY_LABELS = ["", "一", "二", "三", "四", "五", "六", "日"];

const dangerButtonStyle = {
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-block-buffer)",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
} as const;

export function SidePanel({
  dayOfWeek,
  slot,
  block,
  diaryLines,
  diaryMode,
  subtasks,
  elapsedSeconds,
  isTimerActive,
  otherBlockIsActive,
  onSaveBlock,
  onStatusChange,
  onSaveDiary,
  onAddSubtask,
  onEditSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onStartTimer,
  onStopTimer,
  onAddManualTimer,
  onClearTimer,
  onClose,
  onDeleteBlock,
  keyResultOptions,
  onLinkBlockKeyResult,
  projectOptions,
  onLinkBlockProject,
}: SidePanelProps) {
  // Keyed by block id so switching blocks drops a pending confirmation
  // instead of carrying it over to the next one.
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const confirmingDelete = block !== null && confirmTarget === block.id;

  return (
    <aside
      className="side-panel"
      style={{
        background: "var(--color-panel-bg)",
        borderLeft: "1px solid var(--color-border)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
          週{DAY_LABELS[dayOfWeek]} · 區塊 {slot}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          &times;
        </button>
      </div>
      <BlockEditor
        key={`editor-${dayOfWeek}-${slot}`}
        title={block?.title ?? ""}
        description={block?.description ?? ""}
        blockType={block?.blockType ?? BlockType.General}
        onSave={onSaveBlock}
        blockId={block?.id ?? null}
        keyResultId={block?.keyResultId ?? null}
        keyResultOptions={keyResultOptions}
        onLinkKeyResult={onLinkBlockKeyResult}
        projectId={block?.projectId ?? null}
        projectOptions={projectOptions}
        onLinkProject={onLinkBlockProject}
      />
      {block && (
        <>
          <SubtaskList
            blockId={block.id}
            items={subtasks}
            onAdd={onAddSubtask}
            onEdit={onEditSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
            onReorder={onReorderSubtasks}
          />
          <BlockTimer
            elapsedSeconds={elapsedSeconds}
            isActive={isTimerActive}
            otherBlockIsActive={otherBlockIsActive}
            onStart={onStartTimer}
            onStop={onStopTimer}
            onAddManual={onAddManualTimer}
            onClear={onClearTimer}
          />
          <div>
            <label
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "6px",
                display: "block",
              }}
            >
              狀態
            </label>
            <StatusToggle status={block.status} onChange={onStatusChange} />
          </div>
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {confirmingDelete ? (
              <>
                <span
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "13px",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  刪除這個區塊？
                </span>
                <button
                  onClick={() => setConfirmTarget(null)}
                  style={{
                    background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text-secondary)",
                    padding: "6px 12px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setConfirmTarget(null);
                    onDeleteBlock();
                  }}
                  style={{
                    ...dangerButtonStyle,
                    background: "var(--color-block-buffer)",
                    color: "var(--color-bg-primary)",
                    fontWeight: 600,
                  }}
                >
                  確認刪除
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmTarget(block.id)}
                style={dangerButtonStyle}
              >
                刪除區塊
              </button>
            )}
          </div>
        </>
      )}
      {diaryMode === "editable" && (
        <DiaryForm
          key={`diary-${dayOfWeek}`}
          bad={diaryLines?.bad ?? ""}
          good={diaryLines?.good ?? ""}
          next={diaryLines?.next ?? ""}
          onSave={onSaveDiary}
        />
      )}
      {diaryMode === "readonly" && diaryLines && (
        <DiaryReadOnlyView
          bad={diaryLines.bad}
          good={diaryLines.good}
          next={diaryLines.next}
        />
      )}
    </aside>
  );
}
