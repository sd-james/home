import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import type { Member } from '@/lib/householdApi';
import { formatClock, REPEAT_LABEL, type Repeat, type Task, type TaskDraft } from '@/lib/tasks';

import { TimePicker } from '../pickers';
import { colors, spacing } from '../theme';
import { Button, Chip, Field, Label, Row, Sheet } from '../ui';
import { DuePicker } from './DuePicker';

type Props = {
  visible: boolean;
  /** The task being edited, or null to add one. */
  task: Task | null;
  members: Member[];
  onSave: (draft: TaskDraft) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

export function TaskEditorSheet(props: Props) {
  // Mounting the editor only while open gives it fresh state each time.
  return props.visible ? <TaskEditor {...props} /> : null;
}

const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly'];

function TaskEditor({ task, members, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState<string | null>(task?.dueDate ?? null);
  const [remindTime, setRemindTime] = useState<string | null>(task?.remindAt ? formatClock(task.remindAt) : null);
  const [assigneeId, setAssigneeId] = useState<string | null>(task?.assigneeId ?? null);
  const [repeat, setRepeat] = useState<Repeat>(task?.repeat ?? 'none');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('What needs doing?', 'Give the task a short title.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, notes, dueDate, remindTime, assigneeId, repeat });
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete task?', task?.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete().catch((e) => Alert.alert('Couldn’t delete', String(e))),
      },
    ]);

  return (
    <Sheet
      visible
      title={task ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button big title={saving ? 'Saving…' : task ? 'Save' : 'Add task'} onPress={save} disabled={saving} />
          {task ? <Button title="Delete task" variant="danger" onPress={confirmDelete} /> : null}
        </>
      }>
      <Field
        label="What needs doing"
        placeholder="Take the bins out"
        value={title}
        onChangeText={setTitle}
        autoFocus={!task}
        autoCapitalize="sentences"
        maxLength={200}
      />
      <DuePicker value={dueDate} onChange={setDueDate} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Switch value={remindTime !== null} onValueChange={(on) => setRemindTime(on ? '18:00' : null)} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Remind</Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            {remindTime
              ? `Notifies ${assigneeId ? 'them' : 'everyone'} at ${remindTime}${dueDate ? '' : ' (next time it comes round)'}`
              : 'No reminder'}
          </Text>
        </View>
      </View>
      {remindTime ? <TimePicker value={remindTime} onChange={setRemindTime} /> : null}

      <View style={{ gap: spacing.sm }}>
        <Label>Who</Label>
        <Row>
          <Chip label="Anyone" selected={assigneeId === null} onPress={() => setAssigneeId(null)} />
          {members.map((m) => (
            <Chip key={m.id} label={m.name} selected={assigneeId === m.id} onPress={() => setAssigneeId(m.id)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Label>Repeat</Label>
        <Row>
          {REPEATS.map((r) => (
            <Chip key={r} label={REPEAT_LABEL[r]} selected={repeat === r} onPress={() => setRepeat(r)} />
          ))}
        </Row>
      </View>

      <Field label="Notes (optional)" multiline value={notes} onChangeText={setNotes} maxLength={2000} />
    </Sheet>
  );
}
