import { useState } from 'react';
import { Alert, Share, StyleSheet, Text } from 'react-native';

import { leaveHousehold, updateHousehold } from '@/lib/householdApi';
import { useHousehold } from '@/state/household';

import { colors, spacing } from '../theme';
import { Button, Card, Field, Label, Muted } from '../ui';

/** Settings: household name, members, join code to share, your name, leave. */
export function HouseholdCard() {
  const state = useHousehold();
  if (state.status !== 'ready') return null;
  // Re-mount the editable fields when the stored names change.
  const me = state.household.members.find((m) => m.id === state.uid);
  return <HouseholdDetails key={`${state.household.name}|${me?.name}`} />;
}

function HouseholdDetails() {
  const state = useHousehold();
  const household = state.status === 'ready' ? state.household : null;
  const me = state.status === 'ready' ? household?.members.find((m) => m.id === state.uid) : undefined;
  const [householdName, setHouseholdName] = useState(household?.name ?? '');
  const [myName, setMyName] = useState(me?.name ?? '');
  const [busy, setBusy] = useState(false);
  if (!household || state.status !== 'ready') return null;

  const save = async (changes: { memberName?: string; householdName?: string }) => {
    setBusy(true);
    try {
      await updateHousehold(changes);
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const shareCode = () =>
    Share.share({
      message: `Join our household “${household.name}” in the Home app: open Tasks and enter the code ${household.joinCode}`,
    });

  const leave = () =>
    Alert.alert(
      'Leave household?',
      household.members.length === 1
        ? 'You’re the only member, so the household and its tasks will be deleted.'
        : 'You’ll stop seeing its tasks and getting its notifications. You can rejoin with the code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveHousehold().catch((e) => Alert.alert('Couldn’t leave', String(e))),
        },
      ]
    );

  return (
    <Card>
      <Label>Household</Label>
      <Field
        label="Household name"
        value={householdName}
        onChangeText={setHouseholdName}
        onEndEditing={() => householdName.trim() && householdName !== household.name && save({ householdName })}
        autoCapitalize="words"
      />
      <Field
        label="Your name"
        value={myName}
        onChangeText={setMyName}
        onEndEditing={() => myName.trim() && myName !== me?.name && save({ memberName: myName })}
        autoCapitalize="words"
      />
      <Muted>Members: {household.members.map((m) => (m.id === state.uid ? `${m.name} (you)` : m.name)).join(', ')}</Muted>
      <Text style={styles.code} selectable>
        {household.joinCode}
      </Text>
      <Button title="Share join code" variant="secondary" onPress={shareCode} disabled={busy} />
      <Muted>Others install Home, open Tasks and enter this code.</Muted>
      <Button title="Leave household" variant="danger" onPress={leave} disabled={busy} />
    </Card>
  );
}

const styles = StyleSheet.create({
  code: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
});
