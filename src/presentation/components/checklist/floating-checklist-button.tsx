"use client";

import { useState, useEffect, useRef } from "react";
import { WeeklyChecklistPanel } from "./weekly-checklist-panel";
import type { WeeklyTask } from "@/domain/entities/weekly-task";

interface Props {
  tasks: WeeklyTask[];
  completedIds: Set<string>;
  onAdd: (title: string) => void;
  onEdit: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  onDisable: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  rightOffset?: string;
}

export function FloatingChecklistButton({
  rightOffset = "16px",
  ...props
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        bottom: "72px",
        right: rightOffset,
        zIndex: 100,
        transition: "right 0.2s",
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: "8px",
            width: "300px",
            maxHeight: "60vh",
            overflowY: "auto",
            background: "var(--color-panel-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <strong
              style={{
                color: "var(--color-text-primary)",
                fontSize: "14px",
              }}
            >
              本週任務
            </strong>
            <button
              onClick={() => setOpen(false)}
              aria-label="close"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              &times;
            </button>
          </div>
          <WeeklyChecklistPanel {...props} />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle weekly checklist"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        &#9745;
      </button>
    </div>
  );
}
