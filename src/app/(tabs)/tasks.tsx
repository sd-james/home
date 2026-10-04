import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { HouseholdSetup } from '@/components/tasks/HouseholdSetup';
import { TaskEditorSheet } from '@/components/tasks/TaskEditorSheet';
import { TaskRow } from '@/components/tasks/TaskRow';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Label, Muted, Screen } from '@/components/ui';
import { addTask, deleteTask, setTaskDone, updateTask } from '@/lib/householdApi';
import { groupTasks, type Task } from '@/lib/tasks';
import { useHousehold } from '@/state/household';

const SECTIONS = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'upcoming', title: 'Upcoming' },
  { key: 'someday', title: 'Someday' },
] as const;

export default function TasksScreen() {
  const state = useHousehold();
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const [showDone, setShowDone] = useState(false);

  if (state.status === 'not-configured') {
    return (
      <Screen>
        <Card>
          <Label>Household tasks aren’t set up yet</Label>
          <Muted>The shared household backend (Firebase) still needs its project settings in the app.</Muted>
        </Card>
      </Screen>
    );
  }
  if (state.status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <Card>
          <Label>Couldn’t load the household</Label>
          <Text style={styles.error}>{state.message}</Text>
          <Muted>Check the internet connection, then close and reopen Home.</Muted>
        </Card>
      </Screen>
    );
  }
  if (state.status === 'no-household') {
    return (
      <Screen>
        <HouseholdSetup />
      </Screen>
    );
  }

  const { uid, household, tasks, pushError } = state;
  const names = Object.fromEntries(household.members.map((m) => [m.id, m.name]));
  const groups = groupTasks(tasks, new Date());
  const openCount = tasks.filter((t) => !t.done).length;

  const toggle = (task: Task) =>
    setTaskDone(household.id, task, uid, !task.done).catch((e) =>
      Alert.alert('Couldn’t update', e instanceof Error ? e.message : String(e))
    );

  return (
    <>
      <Screen>
        <Button big title="+ Add task" onPress={() => setEditor({ task: null })} />
        {pushError ? <Text style={styles.warning}>{pushError}</Text> : null}

        {openCount === 0 ? (
          <Card>
            <Label>Nothing to do</Label>
            <Muted>Add a task or reminder; everyone in {household.name} will see it.</Muted>
          </Card>
        ) : null}

        {SECTIONS.map(({ key, title }) =>
          groups[key].length ? (
            <View key={key} style={styles.section}>
              <Text style={[styles.sectionTitle, key === 'overdue' && { color: colors.danger }]}>
                {title} · {groups[key].length}
              </Text>
              {groups[key].map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  names={names}
                  overdue={key === 'overdue'}
                  onToggle={() => toggle(task)}
                  onOpen={() => setEditor({ task })}
                />
              ))}
            </View>
          ) : null
        )}

        {groups.done.length ? (
          <View style={styles.section}>
            <Pressable onPress={() => setShowDone((v) => !v)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.sectionTitle}>
                {showDone ? '▾' : '▸'} Done · {groups.done.length}
              </Text>
            </Pressable>
            {showDone
              ? groups.done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    names={names}
                    onToggle={() => toggle(task)}
                    onOpen={() => setEditor({ task })}
                  />
                ))
              : null}
          </View>
        ) : null}
      </Screen>

      <TaskEditorSheet
        visible={editor !== null}
        task={editor?.task ?? null}
        members={household.members}
        onSave={async (draft) => {
          if (editor?.task) await updateTask(household.id, editor.task.id, draft);
          else await addTask(household.id, uid, draft);
          setEditor(null);
        }}
        onDelete={async () => {
          if (editor?.task) await deleteTask(household.id, editor.task.id);
          setEditor(null);
        }}
        onClose={() => setEditor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.muted, paddingHorizontal: spacing.xs },
  error: { fontSize: 15, color: colors.danger },
  warning: { fontSize: 14, color: colors.danger, textAlign: 'center' },
});
