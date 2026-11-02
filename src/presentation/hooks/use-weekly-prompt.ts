"use client";

import { useEffect, useState } from "react";
import {
  nextReminderAt,
  WEEKLY_PROMPT,
  weeklyPromptDue,
} from "@/domain/usecases/weekly-prompt";
import { formatDateKey, getMonday } from "@/lib/date-helpers";

const STORAGE_KEY = "block6:weeklyPrompt";
const REMINDER_BODY = "常駐節奏已經排好，只要改不一樣的格子。";

interface Stored {
  /** The week the prompt was last answered for. */
  askedWeekKey: string | null;
  /** Whether the user asked for a system notification on Monday mornings. */
  remind: boolean;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { askedWeekKey: null, remind: false, ...JSON.parse(raw) };
  } catch {
    // Unreadable storage: ask again rather than never.
  }
  return { askedWeekKey: null, remind: false };
}

function write(value: Stored): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

function notificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * The once-a-week "這週有什麼不一樣嗎？": due on the first visit of a new
 * week until dismissed. With the reminder on, it is also sent as a system
 * notification on Monday morning while the app is open in the background.
 */
export function useWeeklyPrompt() {
  // Read after mount: localStorage does not exist during server rendering.
  const [stored, setStored] = useState<Stored | null>(null);
  // Bumped when a reminder fires: re-renders the banner and schedules the
  // next Monday, so an app left open for weeks keeps reminding.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Promise.resolve().then(() => setStored(read()));
  }, []);

  const remind = stored?.remind ?? false;

  useEffect(() => {
    if (!remind || !notificationsSupported()) return;
    if (Notification.permission !== "granted") return;
    const timer = setTimeout(
      () => {
        setTick((t) => t + 1); // a new week has begun: show the banner
        if (document.visibilityState === "visible") return;
        navigator.serviceWorker.ready
          .then((registration) =>
            registration.showNotification(WEEKLY_PROMPT, {
              body: REMINDER_BODY,
              icon: "/icons/icon-192.png",
              tag: "weekly-prompt",
            }),
          )
          .catch((err) => console.error(err));
      },
      nextReminderAt(new Date()).getTime() - Date.now(),
    );
    return () => clearTimeout(timer);
  }, [remind, tick]);

  const update = (change: Partial<Stored>) => {
    const next = { ...read(), ...change };
    write(next);
    setStored(next);
  };

  return {
    due: stored !== null && weeklyPromptDue(new Date(), stored.askedWeekKey),
    dismiss: () =>
      update({ askedWeekKey: formatDateKey(getMonday(new Date())) }),
    canRemind: notificationsSupported(),
    remindEnabled: remind,
    enableReminder: async (): Promise<boolean> => {
      if (!notificationsSupported()) return false;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
      update({ remind: true });
      return true;
    },
  };
}
