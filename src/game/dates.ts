// Local-calendar day keys ("2026-10-18"). Streaks follow the singer's own midnight.

export type DayKey = string;

export function dayKey(d: Date = new Date()): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

/** Weeks (for weekly XP and friend rankings) run Monday to Sunday. */
export function weekStart(key: DayKey): DayKey {
  const d = parseDay(key);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(key, -dow);
}

export function weekDays(start: DayKey): DayKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}


export function timeOfDayGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}
