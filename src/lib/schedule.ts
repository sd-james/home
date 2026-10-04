import { sortDays } from './days';
import { newId } from './id';
import type { Day, ScheduleEvent } from './types';

/**
 * Merges events that share a time and action, drops events with no days and
 * sorts by time (then On before Off). Every schedule change goes through this,
 * so a device never has two events for the same time and action.
 */
export function normalizeEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  const byKey = new Map<string, ScheduleEvent>();
  for (const event of events) {
    const key = `${event.time}|${event.on}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.days = sortDays([...existing.days, ...event.days]);
    } else {
      byKey.set(key, { ...event, days: sortDays(event.days) });
    }
  }
  return [...byKey.values()]
    .filter((e) => e.days.length > 0)
    .sort((a, b) => a.time.localeCompare(b.time) || Number(b.on) - Number(a.on));
}

export function eventsForDay(events: ScheduleEvent[], day: Day): ScheduleEvent[] {
  return events.filter((e) => e.days.includes(day));
}

export function addEvent(
  events: ScheduleEvent[],
  event: Omit<ScheduleEvent, 'id'>
): ScheduleEvent[] {
  return normalizeEvents([...events, { ...event, id: newId() }]);
}

export function updateEvent(
  events: ScheduleEvent[],
  id: string,
  changes: Omit<ScheduleEvent, 'id'>
): ScheduleEvent[] {
  return normalizeEvents(events.map((e) => (e.id === id ? { ...e, ...changes } : e)));
}

/** Deletes the event on every day, or only on `day` when given. */
export function deleteEvent(events: ScheduleEvent[], id: string, day?: Day): ScheduleEvent[] {
  return normalizeEvents(
    events.map((e) =>
      e.id !== id ? e : { ...e, days: day ? e.days.filter((d) => d !== day) : [] }
    )
  );
}

/**
 * Copies the events on `from` to each target day. With `replace`, the target
 * days lose their own events first so they end up identical to `from`.
 */
export function copyDay(
  events: ScheduleEvent[],
  from: Day,
  targets: Day[],
  replace: boolean
): ScheduleEvent[] {
  const others = targets.filter((d) => d !== from);
  return normalizeEvents(
    events.map((e) => {
      let days = e.days;
      if (replace) days = days.filter((d) => !others.includes(d));
      if (e.days.includes(from)) days = [...days, ...others];
      return { ...e, days };
    })
  );
}

export function countEventsPerWeek(events: ScheduleEvent[]): number {
  return events.reduce((n, e) => n + e.days.length, 0);
}
