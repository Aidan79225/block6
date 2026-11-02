import { getMonday, isSameLocalDay } from "@/lib/date-helpers";

export type DiaryMode = "editable" | "readonly" | "hidden";

// A day's diary stays open until this hour the next morning.
const NEXT_MORNING_GRACE_HOURS = 8;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Whether a day's diary can be written now. Every day of the current week up
 * to today can — missing a day should not lock it for good — and yesterday's
 * stays open until 08:00 even when the week turned over in between. Earlier
 * days are read-only; days still ahead have nothing to write about yet.
 */
export function diaryModeFor(day: Date, now: Date): DiaryMode {
  const target = startOfDay(day);
  const today = startOfDay(now);
  if (target > today) return "hidden";
  if (target >= getMonday(now)) return "editable";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    now.getHours() < NEXT_MORNING_GRACE_HOURS &&
    isSameLocalDay(target, yesterday)
  ) {
    return "editable";
  }
  return "readonly";
}

/** The day "write today's diary" means: before 08:00, that is yesterday. */
export function currentDiaryDay(now: Date): Date {
  const day = startOfDay(now);
  if (now.getHours() < NEXT_MORNING_GRACE_HOURS) {
    day.setDate(day.getDate() - 1);
  }
  return day;
}
