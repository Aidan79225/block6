"use client";

import { useEffect, useRef, useState } from "react";

interface PlanChangeDialogProps {
  open: boolean;
  summary: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function PlanChangeDialog({
  open,
  summary,
  onCancel,
  onConfirm,
}: PlanChangeDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastOpenState, setLastOpenState] = useState(open);
  const [reason, setReason] = useState("");

  if (open !== lastOpenState) {
    setLastOpenState(open);
    if (open) setReason("");
  }

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canConfirm = trimmed.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-change-dialog-title"
        aria-describedby="plan-change-dialog-desc"
        style={{
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h2
          id="plan-change-dialog-title"
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--color-accent)",
            marginBottom: "8px",
          }}
        >
          Why are you changing today&apos;s plan?
        </h2>
        <p
          id="plan-change-dialog-desc"
          style={{
            fontSize: "13px",
            color: "var(--color-text-secondary)",
            marginBottom: "16px",
          }}
        >
          {summary}
        </p>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          aria-label="Reason for change"
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "8px",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: "16px",
          }}
        />
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
        >
          <button
            onClick={onCancel}
            style={{
              background: "none",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              background: canConfirm
                ? "var(--color-accent)"
                : "var(--color-bg-tertiary)",
              color: canConfirm
                ? "var(--color-bg-primary)"
                : "var(--color-text-secondary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
