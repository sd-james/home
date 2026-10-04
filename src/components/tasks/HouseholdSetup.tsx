import { useState } from 'react';
import { Alert } from 'react-native';

import { createHousehold, joinHousehold } from '@/lib/householdApi';

import { Button, Card, Field, Label, Muted } from '../ui';

/** First run: your name, then create a household or join one with its code. */
export function HouseholdSetup() {
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    if (!name.trim()) {
      Alert.alert('Your name', 'Enter the name the rest of the household will see.');
      return;
    }
    setBusy(true);
    try {
      await action();
      // The household appears by itself once the server has added you.
    } catch (e) {
      Alert.alert('That didn’t work', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <Label>Shared household tasks</Label>
        <Muted>
          Everyone in the household sees the same to-dos and reminders, and gets a notification when
          something is added or due.
        </Muted>
        <Field label="Your name" placeholder="Steven" value={name} onChangeText={setName} autoCapitalize="words" />
      </Card>

      <Card>
        <Label>Start a household</Label>
        <Field
          label="Household name"
          placeholder="Our home"
          value={householdName}
          onChangeText={setHouseholdName}
          autoCapitalize="words"
        />
        <Button
          big
          title={busy ? 'Working…' : 'Create household'}
          disabled={busy}
          onPress={() => run(() => createHousehold(householdName.trim() || 'Our home', name.trim()))}
        />
        <Muted>You’ll get a code to share so others can join.</Muted>
      </Card>

      <Card>
        <Label>Join a household</Label>
        <Field
          label="Join code"
          placeholder="K7M-4QX"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          title={busy ? 'Working…' : 'Join'}
          variant="secondary"
          disabled={busy || code.replace(/[^a-z0-9]/gi, '').length < 6}
          onPress={() => run(() => joinHousehold(code, name.trim()))}
        />
      </Card>
    </>
  );
}
