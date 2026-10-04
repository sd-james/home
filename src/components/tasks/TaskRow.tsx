import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayKey, describeDay, formatClock, REPEAT_LABEL, taskDay, type Task } from '@/lib/tasks';

import { colors, radius, spacing } from '../theme';

type Props = {
  task: Task;
  /** Member names by id. */
  names: Record<string, string>;
  overdue?: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

/** One task: a big tick target on the left, details on the right (tap to edit). */
export function TaskRow({ task, names, overdue, onToggle, onOpen }: Props) {
  const now = new Date();
  const day = taskDay(task);
  const details = [
    day ? describeDay(day, now) : null,
    task.remindAt ? `🔔 ${formatClock(task.remindAt)}` : null,
    task.repeat !== 'none' ? `↻ ${REPEAT_LABEL[task.repeat].toLowerCase()}` : null,
    task.assigneeId ? names[task.assigneeId] ?? 'Someone' : null,
  ].filter(Boolean);
  const doneLine = task.done
    ? `Done by ${task.doneBy ? names[task.doneBy] ?? 'someone' : 'someone'}${task.doneAt ? ` · ${describeDay(dayKey(task.doneAt), now)}` : ''}`
    : null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={task.done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`}
        style={({ pressed }) => [styles.tick, pressed && { opacity: 0.5 }]}>
        <MaterialCommunityIcons
          name={task.done ? 'check-circle' : 'circle-outline'}
          size={34}
          color={task.done ? colors.on : overdue ? colors.danger : colors.muted}
        />
      </Pressable>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityHint="Edit the task"
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.6 }]}>
        <Text style={[styles.title, task.done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {details.length ? (
          <Text style={[styles.details, overdue && { color: colors.danger }]} numberOfLines={1}>
            {details.join('  ·  ')}
          </Text>
        ) : null}
        {doneLine ? <Text style={styles.details}>{doneLine}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    minHeight: 64,
    paddingRight: spacing.md,
  },
  tick: { width: 60, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingVertical: spacing.md, gap: 2 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  details: { fontSize: 14, color: colors.muted },
});
