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
}

const DAY_LABELS = ["", "一", "二", "三", "四", "五", "六", "日"];

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
}: SidePanelProps) {
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
