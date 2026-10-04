import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAYS, DAY_SHORT, WEEKDAYS, WEEKEND, formatTime, sameDays, sortDays, splitTime } from '@/lib/days';
import type { Day } from '@/lib/types';

import { colors, radius, spacing, TOUCH } from './theme';
import { Chip, Label, Row } from './ui';

function StepButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

/** Hour and minute steppers (minutes move in 5s) plus quick :00/:15/:30/:45. */
export function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const { hours, minutes } = splitTime(value);
  const set = (h: number, m: number) => onChange(formatTime((h + 24) % 24, (m + 60) % 60));
  return (
    <View style={{ gap: spacing.md }}>
      <Label>Time</Label>
      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <StepButton label="+" accessibilityLabel="Hour later" onPress={() => set(hours + 1, minutes)} />
          <Text style={styles.timeText}>{String(hours).padStart(2, '0')}</Text>
          <StepButton label="−" accessibilityLabel="Hour earlier" onPress={() => set(hours - 1, minutes)} />
        </View>
        <Text style={styles.timeText}>:</Text>
        <View style={styles.timeColumn}>
          <StepButton label="+" accessibilityLabel="5 minutes later" onPress={() => set(hours, minutes + 5 - (minutes % 5))} />
          <Text style={styles.timeText}>{String(minutes).padStart(2, '0')}</Text>
          <StepButton
            label="−"
            accessibilityLabel="5 minutes earlier"
            onPress={() => set(hours, minutes % 5 ? minutes - (minutes % 5) : minutes - 5)}
          />
        </View>
      </View>
      <Row style={{ justifyContent: 'center' }}>
        {[0, 15, 30, 45].map((m) => (
          <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={minutes === m} onPress={() => set(hours, m)} />
        ))}
      </Row>
    </View>
  );
}

export function OnOffPicker({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Label>Action</Label>
      <View style={styles.segment}>
        {[true, false].map((on) => {
          const selected = value === on;
          return (
            <Pressable
              key={String(on)}
              onPress={() => onChange(on)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.segmentItem,
                selected && { backgroundColor: on ? colors.on : colors.off },
              ]}>
              <Text style={[styles.segmentText, selected && { color: colors.primaryText }]}>
                {on ? 'Turn on' : 'Turn off'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DayPicker({
  value,
  onChange,
  label = 'Days',
  exclude,
}: {
  value: Day[];
  onChange: (days: Day[]) => void;
  label?: string;
  /** A day that can't be picked (e.g. the source day when copying). */
  exclude?: Day;
}) {
  const choices = exclude ? DAYS.filter((d) => d !== exclude) : DAYS;
  const toggle = (day: Day) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : sortDays([...value, day]));
  const quick = (days: Day[]) => days.filter((d) => d !== exclude);
  const presets: { label: string; days: Day[] }[] = [
    { label: 'Every day', days: quick(DAYS) },
    { label: 'Weekdays', days: quick(WEEKDAYS) },
    { label: 'Weekends', days: quick(WEEKEND) },
  ];
  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{label}</Label>
      <Row>
        {presets.map((p) => (
          <Chip key={p.label} label={p.label} selected={value.length > 0 && sameDays(value, p.days)} onPress={() => onChange(p.days)} />
        ))}
      </Row>
      <View style={styles.dayGrid}>
        {choices.map((day) => (
          <Chip key={day} label={DAY_SHORT[day]} selected={value.includes(day)} onPress={() => toggle(day)} style={styles.dayChip} />
        ))}
      </View>
    </View>
  );
}

export function UsesStepper({
  value,
  onChange,
  quick = [1, 2, 5, 9],
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  quick?: number[];
  min?: number;
  max?: number;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.usesRow}>
        <StepButton label="−" accessibilityLabel="One fewer use" onPress={() => onChange(clamp(value - 1))} />
        <View style={{ alignItems: 'center', minWidth: 90 }}>
          <Text style={styles.usesNumber}>{value}</Text>
          <Text style={{ color: colors.muted }}>{value === 1 ? 'use' : 'uses'}</Text>
        </View>
        <StepButton label="+" accessibilityLabel="One more use" onPress={() => onChange(clamp(value + 1))} />
      </View>
      <Row style={{ justifyContent: 'center' }}>
        {quick.map((n) => (
          <Chip key={n} label={String(n)} selected={value === n} onPress={() => onChange(n)} style={{ minWidth: 56 }} />
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    width: 72,
    height: TOUCH,
    borderRadius: radius.md,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 28, fontWeight: '600', color: colors.primary },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  timeColumn: { alignItems: 'center', gap: spacing.sm },
  timeText: { fontSize: 48, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: TOUCH + 8,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 18, fontWeight: '700', color: colors.text },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayChip: { flexBasis: '22%', flexGrow: 1 },
  usesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  usesNumber: { fontSize: 48, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
