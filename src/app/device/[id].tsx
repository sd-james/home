import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CopyDaySheet } from '@/components/devices/CopyDaySheet';
import { EventEditorSheet, type EventDraft } from '@/components/devices/EventEditorSheet';
import { useAppInsets } from '@/components/insets';
import { colors, radius, spacing } from '@/components/theme';
import { Button, Card, Muted, Screen } from '@/components/ui';
import { DAYS, DAY_LONG, dayOfDate } from '@/lib/days';
import { addEvent, copyDay, deleteEvent, eventsForDay, updateEvent } from '@/lib/schedule';
import type { Day, Device, ScheduleEvent } from '@/lib/types';
import { useDevicesStore } from '@/state/stores';

export default function DeviceScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useAppInsets();
  const { value: devices, set: setDevices, loaded } = useDevicesStore();
  const device = devices.find((d) => d.id === id);

  const [editor, setEditor] = useState<{ event: ScheduleEvent | null; day: Day | null } | null>(null);
  const [copyFrom, setCopyFrom] = useState<Day | null>(null);
  const [lastTime, setLastTime] = useState('08:00');

  if (!device) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Schedule' }} />
        <Muted>{loaded ? 'This device no longer exists.' : 'Loading…'}</Muted>
      </Screen>
    );
  }

  const updateEvents = (change: (events: ScheduleEvent[]) => ScheduleEvent[]) =>
    setDevices((list) =>
      list.map((d): Device => (d.id === device.id ? { ...d, events: change(d.events) } : d))
    );

  const save = (draft: EventDraft) => {
    const editing = editor?.event;
    updateEvents((events) => (editing ? updateEvent(events, editing.id, draft) : addEvent(events, draft)));
    setLastTime(draft.time);
    setEditor(null);
  };

  const remove = (onlyDay?: Day) => {
    const editing = editor?.event;
    if (editing) updateEvents((events) => deleteEvent(events, editing.id, onlyDay));
    setEditor(null);
  };

  const today = dayOfDate(new Date());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: device.room ? `${device.name} · ${device.room}` : device.name }} />
      <Screen>
        {DAYS.map((day) => {
          const events = eventsForDay(device.events, day);
          return (
            <Card key={day} style={day === today && styles.today}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>
                  {DAY_LONG[day]}
                  {day === today ? <Text style={styles.todayTag}>  Today</Text> : null}
                </Text>
                <Pressable
                  onPress={() => setCopyFrom(day)}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.copy, pressed && { opacity: 0.6 }]}>
                  <Text style={styles.copyText}>Copy day to…</Text>
                </Pressable>
              </View>
              <View style={styles.events}>
                {events.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => setEditor({ event, day })}
                    accessibilityRole="button"
                    accessibilityLabel={`${event.time} ${event.on ? 'on' : 'off'}, edit`}
                    style={({ pressed }) => [
                      styles.event,
                      { backgroundColor: event.on ? colors.onSoft : colors.offSoft },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={styles.eventTime}>{event.time}</Text>
                    <Text style={[styles.eventAction, { color: event.on ? colors.on : colors.off }]}>
                      {event.on ? 'On' : 'Off'}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setEditor({ event: null, day })}
                  accessibilityRole="button"
                  accessibilityLabel={`Add event on ${DAY_LONG[day]}`}
                  style={({ pressed }) => [styles.event, styles.add, pressed && { opacity: 0.6 }]}>
                  <Text style={styles.addText}>+</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </Screen>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button big title="+ Add event" onPress={() => setEditor({ event: null, day: null })} />
      </View>

      <EventEditorSheet
        visible={editor !== null}
        event={editor?.event ?? null}
        day={editor?.day ?? null}
        defaultTime={lastTime}
        onSave={save}
        onDelete={remove}
        onClose={() => setEditor(null)}
      />
      <CopyDaySheet
        visible={copyFrom !== null}
        from={copyFrom}
        eventCount={copyFrom ? eventsForDay(device.events, copyFrom).length : 0}
        onCopy={(targets, replace) => {
          if (copyFrom) updateEvents((events) => copyDay(events, copyFrom, targets, replace));
          setCopyFrom(null);
        }}
        onClose={() => setCopyFrom(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  today: { borderWidth: 2, borderColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 18, fontWeight: '700', color: colors.text },
  todayTag: { fontSize: 14, fontWeight: '600', color: colors.primary },
  copy: { paddingVertical: spacing.sm, paddingLeft: spacing.md },
  copyText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  events: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  event: {
    minHeight: 52,
    minWidth: 84,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  eventTime: { fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  eventAction: { fontSize: 16, fontWeight: '700' },
  add: { backgroundColor: colors.chip, minWidth: 64 },
  addText: { fontSize: 26, fontWeight: '600', color: colors.primary },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
