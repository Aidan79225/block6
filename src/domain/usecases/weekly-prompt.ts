import { formatDateKey, getMonday } from "@/lib/date-helpers";

/**
 * The weekly reminder asks what is different about this week — not to come
 * and plan. With a standing rhythm, the week is already planned; only the
 * exceptions need a decision (docs/product-core.md §九 #6).
 */
export const WEEKLY_PROMPT = "這週有什麼不一樣嗎？";

// The reminder goes out on Monday at this hour.
export const REMINDER_HOUR = 8;

/** Whether this week has not been asked yet. */
export function weeklyPromptDue(
  now: Date,
  lastAskedWeekKey: string | null,
): boolean {
  return formatDateKey(getMonday(now)) !== lastAskedWeekKey;
}

/** The next Monday at REMINDER_HOUR — this week's, while it is still ahead. */
export function nextReminderAt(now: Date): Date {
  const at = getMonday(now);
  at.setHours(REMINDER_HOUR, 0, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 7);
  return at;
}
