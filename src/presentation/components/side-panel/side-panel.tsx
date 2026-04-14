import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
import type { Subtask } from "@/domain/entities/subtask";
import { BlockEditor } from "./block-editor";
import { StatusToggle } from "./status-toggle";
import { DiaryForm } from "./diary-form";
import { SubtaskList } from "./subtask-list";
import { BlockTimer } from "./block-timer";

interface SidePanelProps {
  dayOfWeek: number;
  slot: number;
  block: Block | null;
  diaryLines: { line1: string; line2: string; line3: string } | null;
  isToday: boolean;
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
  onSaveDiary: (line1: string, line2: string, line3: string) => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onReorderSubtasks: (orderedIds: string[]) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onAddManualTimer: (startedAt: Date, endedAt: Date) => void;
  onClose: () => void;
}

const DAY_LABELS = ["", "一", "二", "三", "四", "五", "六", "日"];

export function SidePanel({
  dayOfWeek,
  slot,
  block,
  diaryLines,
  isToday,
  subtasks,
  elapsedSeconds,
  isTimerActive,
  otherBlockIsActive,
  onSaveBlock,
  onStatusChange,
  onSaveDiary,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onStartTimer,
  onStopTimer,
  onAddManualTimer,
  onClose,
}: SidePanelProps) {
  return (
    <aside
      style={{
        width: "320px",
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
        blockType={block?.blockType ?? BlockType.Core}
        onSave={onSaveBlock}
      />
      {block && (
        <>
          <SubtaskList
            blockId={block.id}
            items={subtasks}
            onAdd={onAddSubtask}
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
        </>
      )}
      {isToday && (
        <DiaryForm
          key={`diary-${dayOfWeek}`}
          line1={diaryLines?.line1 ?? ""}
          line2={diaryLines?.line2 ?? ""}
          line3={diaryLines?.line3 ?? ""}
          onSave={onSaveDiary}
        />
      )}
    </aside>
  );
}
