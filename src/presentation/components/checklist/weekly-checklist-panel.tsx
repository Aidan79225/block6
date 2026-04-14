"use client";

import { useState } from "react";
import type { WeeklyTask } from "@/domain/entities/weekly-task";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  tasks: WeeklyTask[];
  completedIds: Set<string>;
  onAdd: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  onDisable: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

function SortableRow({
  task,
  checked,
  onEdit,
  onToggle,
  onDisable,
}: {
  task: WeeklyTask;
  checked: boolean;
  onEdit: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  onDisable: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commit = () => {
    const t = draft.trim();
    if (t && t !== task.title) onEdit(task.id, t);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 4px",
        background: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span
        {...attributes}
        {...listeners}
        aria-label="drag handle"
        style={{
          cursor: "grab",
          color: "var(--color-text-muted)",
          userSelect: "none",
          fontSize: "14px",
          padding: "0 4px",
        }}
      >
        ⋮⋮
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(task.id)}
        style={{ cursor: "pointer" }}
      />
      {isEditing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(task.title);
              setIsEditing(false);
            }
          }}
          autoFocus
          style={{
            flex: 1,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            padding: "2px 6px",
            fontSize: "13px",
          }}
        />
      ) : (
        <span
          onClick={() => {
            setDraft(task.title);
            setIsEditing(true);
          }}
          style={{
            flex: 1,
            fontSize: "13px",
            color: "var(--color-text-primary)",
            textDecoration: checked ? "line-through" : "none",
            opacity: checked ? 0.6 : 1,
            cursor: "text",
          }}
        >
          {task.title}
        </span>
      )}
      <button
        onClick={() => onDisable(task.id)}
        aria-label="disable"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        &times;
      </button>
    </div>
  );
}

export function WeeklyChecklistPanel({
  tasks,
  completedIds,
  onAdd,
  onEdit,
  onToggle,
  onDisable,
  onReorder,
}: Props) {
  const [newTitle, setNewTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    onReorder(reordered.map((t) => t.id));
  };

  const submitNew = () => {
    const t = newTitle.trim();
    if (!t) return;
    onAdd(t);
    setNewTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableRow
              key={task.id}
              task={task}
              checked={completedIds.has(task.id)}
              onEdit={onEdit}
              onToggle={onToggle}
              onDisable={onDisable}
            />
          ))}
        </SortableContext>
      </DndContext>
      <input
        type="text"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitNew();
        }}
        placeholder="+ 新增任務..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "6px 8px",
          fontSize: "13px",
        }}
      />
      {tasks.length === 0 && (
        <span
          style={{
            color: "var(--color-text-muted)",
            fontSize: "12px",
            fontStyle: "italic",
          }}
        >
          尚未建立任何週任務
        </span>
      )}
    </div>
  );
}
