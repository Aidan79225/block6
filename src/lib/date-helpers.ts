export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCellDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The week key `weeks` weeks after (or, if negative, before) `weekKey`. */
export function addWeeks(weekKey: string, weeks: number): string {
  const d = parseDateKey(weekKey);
  d.setDate(d.getDate() + weeks * 7);
  return formatDateKey(d);
}

/** Every week key from one to another, both included, in order. */
export function weekKeysFrom(fromWeekKey: string, toWeekKey: string): string[] {
  const keys: string[] = [];
  for (let k = fromWeekKey; k <= toWeekKey; k = addWeeks(k, 1)) keys.push(k);
  return keys;
}

/** Every week key of a year: the Mondays that fall in it, in order. */
export function weekKeysOfYear(year: number): string[] {
  const first = new Date(year, 0, 1);
  // Move forward to the first Monday on or after 1 January.
  first.setDate(first.getDate() + ((8 - first.getDay()) % 7));
  const keys: string[] = [];
  for (let d = first; d.getFullYear() === year; d.setDate(d.getDate() + 7)) {
    keys.push(formatDateKey(d));
  }
  return keys;
}
