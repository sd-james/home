import type { Day } from './types';

export const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const WEEKDAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
export const WEEKEND: Day[] = ['SAT', 'SUN'];

export const DAY_SHORT: Record<Day, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

export const DAY_LONG: Record<Day, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

/** Returns the days in Mon–Sun order without duplicates. */
export function sortDays(days: Iterable<Day>): Day[] {
  const set = new Set(days);
  return DAYS.filter((d) => set.has(d));
}

export function sameDays(a: Day[], b: Day[]): boolean {
  const sa = sortDays(a);
  const sb = sortDays(b);
  return sa.length === sb.length && sa.every((d, i) => d === sb[i]);
}

/** "Every day", "Weekdays", "Weekends" or e.g. "Mon, Wed, Fri". */
export function describeDays(days: Day[]): string {
  if (sameDays(days, DAYS)) return 'Every day';
  if (sameDays(days, WEEKDAYS)) return 'Weekdays';
  if (sameDays(days, WEEKEND)) return 'Weekends';
  return sortDays(days)
    .map((d) => DAY_SHORT[d])
    .join(', ');
}

const DAY_ALIASES: Record<string, Day> = {
  MO: 'MON', MON: 'MON', MONDAY: 'MON',
  TU: 'TUE', TUE: 'TUE', TUES: 'TUE', TUESDAY: 'TUE',
  WE: 'WED', WED: 'WED', WEDNESDAY: 'WED',
  TH: 'THU', THU: 'THU', THUR: 'THU', THURS: 'THU', THURSDAY: 'THU',
  FR: 'FRI', FRI: 'FRI', FRIDAY: 'FRI',
  SA: 'SAT', SAT: 'SAT', SATURDAY: 'SAT',
  SU: 'SUN', SUN: 'SUN', SUNDAY: 'SUN',
};

export function parseDay(value: unknown): Day | null {
  if (typeof value !== 'string') return null;
  return DAY_ALIASES[value.trim().toUpperCase()] ?? null;
}

/** The app's day for a JS Date (JS weeks start on Sunday). */
export function dayOfDate(date: Date): Day {
  return DAYS[(date.getDay() + 6) % 7];
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatTime(hours: number, minutes: number): string {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/** Accepts "8:00", "08:00" or "08:00:00"; returns "HH:MM" or null. */
export function normalizeTime(value: string): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return formatTime(h, min);
}

export function splitTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}
