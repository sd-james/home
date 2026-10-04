// Run with `npm test`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addMonths,
  describeDay,
  groupTasks,
  nextOccurrence,
  quickDueDates,
  remindAtFor,
  type Task,
} from './tasks';

// Wednesday 8 Oct 2026, 10:00 local time.
const NOW = new Date(2026, 9, 8, 10, 0);

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.title ?? 'x',
    title: 'x',
    notes: '',
    dueDate: null,
    remindAt: null,
    reminderPending: false,
    assigneeId: null,
    repeat: 'none',
    done: false,
    doneBy: null,
    doneAt: null,
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

describe('quickDueDates', () => {
  it('gives today, tomorrow, the weekend and next Monday', () => {
    assert.deepEqual(
      quickDueDates(NOW).map((q) => q.key),
      ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-12']
    );
  });

  it('treats a Sunday as this weekend and next week as the following Monday', () => {
    const sunday = new Date(2026, 9, 11, 9, 0);
    assert.deepEqual(quickDueDates(sunday).map((q) => q.key).slice(2), ['2026-10-11', '2026-10-12']);
  });
});

describe('describeDay', () => {
  it('names nearby days and formats the rest', () => {
    assert.equal(describeDay('2026-10-08', NOW), 'Today');
    assert.equal(describeDay('2026-10-09', NOW), 'Tomorrow');
    assert.equal(describeDay('2026-10-07', NOW), 'Yesterday');
    assert.equal(describeDay('2026-10-16', NOW), 'Fri 16 Oct');
    assert.equal(describeDay('2027-01-04', NOW), 'Mon 4 Jan 2027');
  });
});

describe('remindAtFor', () => {
  it('uses the time on the due day', () => {
    assert.equal(remindAtFor('2026-10-10', '19:30', NOW)?.getTime(), new Date(2026, 9, 10, 19, 30).getTime());
  });

  it('without a due day, picks the next time that clock time comes round', () => {
    assert.equal(remindAtFor(null, '18:00', NOW)?.getTime(), new Date(2026, 9, 8, 18, 0).getTime());
    assert.equal(remindAtFor(null, '07:00', NOW)?.getTime(), new Date(2026, 9, 9, 7, 0).getTime());
  });

  it('is null without a time', () => {
    assert.equal(remindAtFor('2026-10-10', null, NOW), null);
  });
});

describe('nextOccurrence', () => {
  it('moves a weekly task a week on, keeping the reminder time', () => {
    const next = nextOccurrence(
      { repeat: 'weekly', dueDate: '2026-10-06', remindAt: new Date(2026, 9, 6, 19, 0) },
      NOW
    );
    assert.deepEqual(next?.dueDate, '2026-10-13');
    assert.equal(next?.remindAt?.getTime(), new Date(2026, 9, 13, 19, 0).getTime());
  });

  it('skips past occurrences so the next one is after today', () => {
    const next = nextOccurrence({ repeat: 'daily', dueDate: '2026-10-01', remindAt: null }, NOW);
    assert.equal(next?.dueDate, '2026-10-09');
  });

  it('clamps monthly repeats to the end of short months', () => {
    assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
    const next = nextOccurrence({ repeat: 'monthly', dueDate: '2026-09-30', remindAt: null }, NOW);
    assert.equal(next?.dueDate, '2026-10-30');
  });

  it('returns null for tasks that don’t repeat', () => {
    assert.equal(nextOccurrence({ repeat: 'none', dueDate: '2026-10-06', remindAt: null }, NOW), null);
  });
});

describe('groupTasks', () => {
  it('sorts tasks into overdue, today, upcoming, someday and recent done', () => {
    const groups = groupTasks(
      [
        task({ title: 'late', dueDate: '2026-10-06' }),
        task({ title: 'today-late', dueDate: '2026-10-08', remindAt: new Date(2026, 9, 8, 18, 0) }),
        task({ title: 'today-early', dueDate: '2026-10-08', remindAt: new Date(2026, 9, 8, 9, 0) }),
        task({ title: 'reminder-only', remindAt: new Date(2026, 9, 9, 8, 0) }),
        task({ title: 'later', dueDate: '2026-10-20' }),
        task({ title: 'someday' }),
        task({ title: 'done-recent', done: true, doneAt: new Date(2026, 9, 7) }),
        task({ title: 'done-old', done: true, doneAt: new Date(2026, 8, 1) }),
      ],
      NOW
    );
    const titles = (list: Task[]) => list.map((t) => t.title);
    assert.deepEqual(titles(groups.overdue), ['late']);
    assert.deepEqual(titles(groups.today), ['today-early', 'today-late']);
    assert.deepEqual(titles(groups.upcoming), ['reminder-only', 'later']);
    assert.deepEqual(titles(groups.someday), ['someday']);
    assert.deepEqual(titles(groups.done), ['done-recent']);
  });
});
