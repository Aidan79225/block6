"use client";

import { useState } from "react";
import type { Subtask } from "@/domain/entities/subtask";
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

interface SubtaskListProps {
  blockId: string;
  items: Subtask[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

function SortableItem({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
        opacity: subtask.completed ? 0.6 : 1,
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
        checked={subtask.completed}
        onChange={() => onToggle(subtask.id)}
        style={{ cursor: "pointer" }}
      />
      <span
        style={{
          flex: 1,
          color: "var(--color-text-primary)",
          fontSize: "13px",
          textDecoration: subtask.completed ? "line-through" : "none",
        }}
      >
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.id)}
        aria-label="delete"
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

export function SubtaskList({
  items,
  onAdd,
  onToggle,
  onDelete,
  onReorder,
}: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  };

  const submitNew = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        細項任務
      </label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((subtask) => (
            <SortableItem
              key={subtask.id}
              subtask={subtask}
              onToggle={onToggle}
              onDelete={onDelete}
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
        placeholder="+ 新增細項..."
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "6px 8px",
          fontSize: "13px",
        }}
      />
      {items.length > 7 && (
        <span
          style={{
            color: "var(--color-block-rest)",
            fontSize: "11px",
            fontStyle: "italic",
          }}
        >
          建議不超過 7 項以保持專注
        </span>
      )}
    </div>
  );
}
