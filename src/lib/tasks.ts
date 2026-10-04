/**
 * Household tasks: pure logic (no Firebase, no React), tested in
 * tasks.test.ts. Dates are local calendar days as "YYYY-MM-DD" keys.
 */

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

export type Task = {
  id: string;
  title: string;
  notes: string;
  /** Calendar day it's due ("YYYY-MM-DD"), or null for "someday". */
  dueDate: string | null;
  /** When everyone (or the assignee) gets a reminder, or null. */
  remindAt: Date | null;
  /** True until the reminder has been sent (the server sets it to false). */
  reminderPending: boolean;
  assigneeId: string | null;
  repeat: Repeat;
  done: boolean;
  doneBy: string | null;
  doneAt: Date | null;
  createdBy: string;
  createdAt: Date | null;
};

/** What the editor produces; the rest is filled in when saving. */
export type TaskDraft = {
  title: string;
  notes: string;
  dueDate: string | null;
  /** Reminder time "HH:MM" on the due day (or the next such time without a due day). */
  remindTime: string | null;
  assigneeId: string | null;
  repeat: Repeat;
};

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'Doesn’t repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

// --- Calendar days ---------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** Same day next month, clamped to the month's last day (31 Jan → 28/29 Feb). */
export function addMonths(key: string, months: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return dayKey(target);
}

/** Quick picks for the due date, relative to `now`. */
export function quickDueDates(now: Date): { label: string; key: string }[] {
  const today = dayKey(now);
  const weekday = now.getDay(); // 0 = Sunday
  const toSaturday = (6 - weekday + 7) % 7;
  const toNextMonday = ((1 - weekday + 7) % 7) || 7;
  return [
    { label: 'Today', key: today },
    { label: 'Tomorrow', key: addDays(today, 1) },
    // On a Saturday or Sunday "this weekend" is today.
    { label: 'Weekend', key: weekday === 0 ? today : addDays(today, toSaturday) },
    { label: 'Next week', key: addDays(today, toNextMonday) },
  ];
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today", "Tomorrow", "Yesterday" or "Fri 10 Oct". */
export function describeDay(key: string, now: Date): string {
  const today = dayKey(now);
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return 'Tomorrow';
  if (key === addDays(today, -1)) return 'Yesterday';
  const d = parseDayKey(key);
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}${year}`;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// --- Reminders and repeats ---------------------------------------------------

/**
 * The reminder moment for a draft: the time on the due day, or (without a
 * due day) the next time that clock time comes round.
 */
export function remindAtFor(dueDate: string | null, remindTime: string | null, now: Date): Date | null {
  if (!remindTime) return null;
  const [h, m] = remindTime.split(':').map(Number);
  const base = parseDayKey(dueDate ?? dayKey(now));
  base.setHours(h, m, 0, 0);
  if (!dueDate && base.getTime() <= now.getTime()) base.setDate(base.getDate() + 1);
  return base;
}

function advance(key: string, repeat: Repeat): string {
  if (repeat === 'daily') return addDays(key, 1);
  if (repeat === 'weekly') return addDays(key, 7);
  return addMonths(key, 1);
}

/**
 * For a repeating task that was just completed: the next due day (after
 * today) and reminder, keeping the reminder's time of day.
 */
export function nextOccurrence(
  task: Pick<Task, 'dueDate' | 'remindAt' | 'repeat'>,
  now: Date
): { dueDate: string; remindAt: Date | null } | null {
  if (task.repeat === 'none') return null;
  const today = dayKey(now);
  let due = task.dueDate ?? (task.remindAt ? dayKey(task.remindAt) : today);
  do {
    due = advance(due, task.repeat);
  } while (due <= today);
  let remindAt: Date | null = null;
  if (task.remindAt) {
    remindAt = parseDayKey(due);
    remindAt.setHours(task.remindAt.getHours(), task.remindAt.getMinutes(), 0, 0);
  }
  return { dueDate: due, remindAt };
}

// --- Grouping ---------------------------------------------------------------

export type TaskGroups = {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  someday: Task[];
  done: Task[];
};

/** How long finished tasks stay listed. */
const DONE_VISIBLE_DAYS = 7;

/** The day a task belongs to: its due day, else its reminder's day. */
export function taskDay(task: Pick<Task, 'dueDate' | 'remindAt'>): string | null {
  return task.dueDate ?? (task.remindAt ? dayKey(task.remindAt) : null);
}

const byDayThenTime = (a: Task, b: Task) =>
  (taskDay(a) ?? '').localeCompare(taskDay(b) ?? '') ||
  (a.remindAt?.getTime() ?? Infinity) - (b.remindAt?.getTime() ?? Infinity) ||
  a.title.localeCompare(b.title);

export function groupTasks(tasks: Task[], now: Date): TaskGroups {
  const today = dayKey(now);
  const doneSince = now.getTime() - DONE_VISIBLE_DAYS * 24 * 60 * 60 * 1000;
  const groups: TaskGroups = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  for (const task of tasks) {
    if (task.done) {
      if (!task.doneAt || task.doneAt.getTime() >= doneSince) groups.done.push(task);
      continue;
    }
    const day = taskDay(task);
    if (!day) groups.someday.push(task);
    else if (day < today) groups.overdue.push(task);
    else if (day === today) groups.today.push(task);
    else groups.upcoming.push(task);
  }
  groups.overdue.sort(byDayThenTime);
  groups.today.sort(byDayThenTime);
  groups.upcoming.sort(byDayThenTime);
  groups.someday.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  groups.done.sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0));
  return groups;
}
