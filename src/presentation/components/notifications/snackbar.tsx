"use client";

export type NotificationType = "error" | "success" | "info";

interface SnackbarProps {
  id: string;
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const colorForType: Record<NotificationType, string> = {
  error: "var(--color-block-buffer)",
  success: "var(--color-block-core)",
  info: "var(--color-accent)",
};

export function Snackbar({ message, type, onClose }: SnackbarProps) {
  return (
    <div
      role="status"
      data-type={type}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `4px solid ${colorForType[type]}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        color: "var(--color-text-primary)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "240px",
        maxWidth: "360px",
      }}
    >
      <span style={{ flex: 1, fontSize: "13px" }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="close"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "16px",
          padding: "0 4px",
        }}
      >
        &times;
      </button>
    </div>
  );
}
