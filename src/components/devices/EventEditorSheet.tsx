import { useState } from 'react';
import { Alert } from 'react-native';

import { DAY_LONG, describeDays } from '@/lib/days';
import type { Day, ScheduleEvent } from '@/lib/types';

import { DayPicker, OnOffPicker, TimePicker } from '../pickers';
import { Button, Sheet } from '../ui';

export type EventDraft = Omit<ScheduleEvent, 'id'>;

type Props = {
  visible: boolean;
  /** The event being edited, or null to add one. */
  event: ScheduleEvent | null;
  /** The day the editor was opened from: preselected when adding, offered when deleting. */
  day: Day | null;
  /** Starting time for new events. */
  defaultTime: string;
  onSave: (draft: EventDraft) => void;
  onDelete: (onlyDay?: Day) => void;
  onClose: () => void;
};

export function EventEditorSheet(props: Props) {
  // Mounting the editor only while open gives it fresh state each time.
  return props.visible ? <EventEditor {...props} /> : null;
}

function EventEditor({ event, day, defaultTime, onSave, onDelete, onClose }: Props) {
  const [time, setTime] = useState(event?.time ?? defaultTime);
  const [on, setOn] = useState(event?.on ?? true);
  const [days, setDays] = useState<Day[]>(event?.days ?? (day ? [day] : []));

  const save = () => {
    if (days.length === 0) {
      Alert.alert('Pick a day', 'Choose at least one day for this event.');
      return;
    }
    onSave({ time, on, days });
  };

  const confirmDelete = () => {
    if (!event) return;
    const label = `${event.time} ${event.on ? 'On' : 'Off'}`;
    if (day && event.days.length > 1 && event.days.includes(day)) {
      Alert.alert(`Delete ${label}?`, `It runs on: ${describeDays(event.days)}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: `Only ${DAY_LONG[day]}`, onPress: () => onDelete(day) },
        { text: 'All days', style: 'destructive', onPress: () => onDelete() },
      ]);
    } else {
      Alert.alert(`Delete ${label}?`, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete() },
      ]);
    }
  };

  return (
    <Sheet
      visible
      title={event ? 'Edit event' : 'Add event'}
      onClose={onClose}
      footer={
        <>
          <Button big title={event ? 'Save' : 'Add event'} onPress={save} />
          {event ? <Button title="Delete event" variant="danger" onPress={confirmDelete} /> : null}
        </>
      }>
      <TimePicker value={time} onChange={setTime} />
      <OnOffPicker value={on} onChange={setOn} />
      <DayPicker value={days} onChange={setDays} />
    </Sheet>
  );
}
