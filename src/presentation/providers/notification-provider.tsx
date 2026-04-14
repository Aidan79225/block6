"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Snackbar,
  NotificationType,
} from "@/presentation/components/notifications/snackbar";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notify: (message: string, type: NotificationType) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Auto-dismiss: 5s for success/info, 8s for errors
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((item) => {
      const ms = item.type === "error" ? 8000 : 5000;
      return setTimeout(() => removeItem(item.id), ms);
    });
    return () => timers.forEach(clearTimeout);
  }, [items, removeItem]);

  const value: NotificationState = {
    notify,
    error: (m) => notify(m, "error"),
    success: (m) => notify(m, "success"),
    info: (m) => notify(m, "info"),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999,
        }}
      >
        {items.map((n) => (
          <Snackbar
            key={n.id}
            id={n.id}
            message={n.message}
            type={n.type}
            onClose={() => removeItem(n.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotify must be used within NotificationProvider");
  return ctx;
}
