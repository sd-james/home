import { useState } from 'react';
import { Alert, View } from 'react-native';

import { UsesStepper } from '@/components/pickers';
import { spacing } from '@/components/theme';
import { Button, Card, Field, Label, Muted, Screen } from '@/components/ui';
import { DEFAULT_SETTINGS, clampUses } from '@/lib/settings';
import type { Settings } from '@/lib/types';
import { checkAndApplyUpdate, describeCurrentUpdate } from '@/lib/updates';
import { buildRequestMessage, fillTemplate } from '@/lib/visitorCode';
import { useSettingsStore } from '@/state/stores';

const EXAMPLE_CODE = {
  code: '61359',
  uses: 9,
  expiresAt: new Date(2026, 9, 4, 23, 59, 59).toISOString(),
  expiryText: null,
};

export default function SettingsScreen() {
  const { value: settings, set } = useSettingsStore();
  const update = (changes: Partial<Settings>) => set((s) => ({ ...s, ...changes }));
  const [checking, setChecking] = useState(false);
  const current = describeCurrentUpdate();

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const outcome = await checkAndApplyUpdate(); // Reloads the app when there's an update.
      if (outcome === 'up-to-date') Alert.alert('Up to date', 'You have the latest version.');
      if (outcome === 'unavailable') Alert.alert('Updates are off', 'This build doesn’t receive updates.');
    } catch (e) {
      Alert.alert('Couldn’t check for updates', e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  const reset = () =>
    Alert.alert(
      'Reset settings?',
      'The estate number, request format, default uses and visitor message go back to their defaults. Devices and recent codes are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => set(DEFAULT_SETTINGS) },
      ]
    );

  return (
    <Screen>
      <Card>
        <Label>Estate gate codes</Label>
        <Field
          label="Estate SMS number"
          value={settings.estateNumber}
          onChangeText={(estateNumber) => update({ estateNumber })}
          keyboardType="phone-pad"
          placeholder={DEFAULT_SETTINGS.estateNumber}
        />
        <Field
          label="Request format"
          value={settings.requestFormat}
          onChangeText={(requestFormat) => update({ requestFormat })}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={DEFAULT_SETTINGS.requestFormat}
          hint={`{uses} becomes the number of uses, e.g. "${buildRequestMessage(settings.requestFormat, 9)}".`}
        />
        <View style={{ gap: spacing.sm }}>
          <Label>Default number of uses</Label>
          <UsesStepper value={settings.defaultUses} onChange={(n) => update({ defaultUses: clampUses(n) })} />
        </View>
      </Card>

      <Card>
        <Label>Visitor message</Label>
        <Field
          label="Template"
          multiline
          value={settings.visitorTemplate}
          onChangeText={(visitorTemplate) => update({ visitorTemplate })}
          hint="Use {code}, {uses} and {expiry} where the details should go."
        />
        <Muted>Example: {fillTemplate(settings.visitorTemplate, EXAMPLE_CODE)}</Muted>
      </Card>

      <Button title="Reset settings to defaults" variant="danger" onPress={reset} />

      <Card>
        <Label>App updates</Label>
        <Muted>{current.title}</Muted>
        {current.detail ? <Muted>{current.detail}</Muted> : null}
        <Button
          title={checking ? 'Checking…' : 'Check for updates'}
          variant="secondary"
          onPress={checkForUpdates}
          disabled={checking}
        />
      </Card>
    </Screen>
  );
}
