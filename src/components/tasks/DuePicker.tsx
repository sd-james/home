import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, dayKey, describeDay, quickDueDates } from '@/lib/tasks';

import { colors, radius, spacing, TOUCH } from '../theme';
import { Chip, Label, Row } from '../ui';

/** Due day: quick picks plus a stepper for any other day, or no date. */
export function DuePicker({ value, onChange }: { value: string | null; onChange: (key: string | null) => void }) {
  const now = new Date();
  const today = dayKey(now);
  const quick = quickDueDates(now);
  return (
    <View style={{ gap: spacing.sm }}>
      <Label>When</Label>
      <Row>
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} selected={value === q.key} onPress={() => onChange(q.key)} />
        ))}
        <Chip label="No date" selected={value === null} onPress={() => onChange(null)} />
      </Row>
      {value ? (
        <View style={styles.stepper}>
          <Step
            label="‹"
            accessibilityLabel="A day earlier"
            disabled={value <= today}
            onPress={() => onChange(addDays(value, -1))}
          />
          <Text style={styles.day}>{describeDay(value, now)}</Text>
          <Step label="›" accessibilityLabel="A day later" onPress={() => onChange(addDays(value, 1))} />
        </View>
      ) : null}
    </View>
  );
}

function Step({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.step, (pressed || disabled) && { opacity: disabled ? 0.3 : 0.6 }]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 64,
    height: TOUCH,
    borderRadius: radius.md,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 30, fontWeight: '600', color: colors.primary },
  day: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text },
});
