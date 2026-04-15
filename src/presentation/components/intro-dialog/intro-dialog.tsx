"use client";

import { useEffect, useRef } from "react";

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_ROWS: { color: string; label: string; desc: string }[] = [
  { color: "var(--color-block-core)", label: "Core", desc: "must do" },
  { color: "var(--color-block-rest)", label: "Rest", desc: "recover & recharge" },
  { color: "var(--color-block-buffer)", label: "Buffer", desc: "flex: work or rest" },
  { color: "var(--color-block-general)", label: "General", desc: "everyday tasks" },
];

export function IntroDialog({ open, onClose }: IntroDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-dialog-title"
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
          id="intro-dialog-title"
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
            marginBottom: "16px",
          }}
        >
          The Block 6 — Less is More
        </h2>

        <p style={{ marginBottom: "16px", lineHeight: 1.5 }}>
          Each day = 6 blocks of ~2 hours.
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {TYPE_ROWS.map((row) => (
            <li
              key={row.label}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: row.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, minWidth: "72px" }}>
                {row.label}
              </span>
              <span style={{ color: "var(--color-text-secondary)" }}>
                — {row.desc}
              </span>
            </li>
          ))}
        </ul>

        <p
          style={{
            marginBottom: "20px",
            lineHeight: 1.5,
            color: "var(--color-text-secondary)",
          }}
        >
          A day naturally has highs and lows. Naming the rhythm helps you focus.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-accent)",
              color: "var(--color-bg-primary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
