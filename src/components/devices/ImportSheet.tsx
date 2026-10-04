import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import {
  applyImport,
  devicesWithExistingEvents,
  deviceRef,
  parseScript,
  type ImportResult,
} from '@/lib/googleHomeScript';
import type { Device } from '@/lib/types';

import { colors, spacing } from '../theme';
import { Button, Card, Field, Label, Muted, Sheet } from '../ui';

type Props = {
  visible: boolean;
  devices: Device[];
  onImport: (devices: Device[]) => void;
  onClose: () => void;
};

export function ImportSheet(props: Props) {
  // Mounting the sheet only while open gives it fresh state each time.
  return props.visible ? <Import {...props} /> : null;
}

function Import({ devices, onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (!clip.trim()) {
      Alert.alert('Clipboard is empty', 'Copy the script in the Google Home script editor first.');
      return;
    }
    setText(clip);
    setResult(null);
    setSummary(null);
  };

  const finish = (parsed: ImportResult, replace: boolean) => {
    const { devices: next, created } = applyImport(devices, parsed.events, replace);
    onImport(next);
    const parts = [`Imported ${parsed.events.length} event${parsed.events.length === 1 ? '' : 's'}.`];
    if (created.length) parts.push(`New devices: ${created.join(', ')}.`);
    setSummary(parts.join(' '));
  };

  const runImport = () => {
    const parsed = parseScript(text);
    setResult(parsed);
    setSummary(null);
    if (parsed.events.length === 0) return;

    const affected = devicesWithExistingEvents(devices, parsed.events);
    if (affected.length === 0) {
      finish(parsed, false);
      return;
    }
    Alert.alert(
      'Replace existing events?',
      `${affected.map(deviceRef).join(', ')} already ${affected.length === 1 ? 'has' : 'have'} events. Replace them with the imported ones, or add to them?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: () => finish(parsed, false) },
        { text: 'Replace', style: 'destructive', onPress: () => finish(parsed, true) },
      ]
    );
  };

  return (
    <Sheet
      visible
      title="Import from Google Home"
      onClose={onClose}
      footer={
        summary ? (
          <Button big title="Done" onPress={onClose} />
        ) : (
          <>
            <Button big title="Import" onPress={runImport} disabled={!text.trim()} />
            <Button title="Paste from clipboard" variant="secondary" onPress={paste} />
          </>
        )
      }>
      <Muted>
        In the Google Home script editor, select the whole script, copy it, then paste it here. Time
        schedules that switch devices on or off are imported; missing devices are created.
      </Muted>
      <Field
        label="Script"
        multiline
        value={text}
        onChangeText={(t) => {
          setText(t);
          setResult(null);
          setSummary(null);
        }}
        placeholder={'metadata:\n  name: …\nautomations:\n  - starters: …'}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 14, minHeight: 160 }}
      />
      {summary ? (
        <Card style={{ backgroundColor: colors.onSoft }}>
          <Text style={{ fontSize: 16, color: colors.on, fontWeight: '600' }}>{summary}</Text>
        </Card>
      ) : null}
      {result && result.events.length === 0 && result.issues.length === 0 ? (
        <Muted>No On/Off time schedules were found in this script.</Muted>
      ) : null}
      {result && result.issues.length > 0 ? (
        <Card style={{ backgroundColor: colors.dangerSoft }}>
          <Label>
            {result.events.length === 0 ? 'Nothing could be imported' : "Some parts weren't imported"}
          </Label>
          <View style={{ gap: spacing.xs }}>
            {result.issues.map((issue, i) => (
              <Text key={i} style={{ color: colors.text, fontSize: 15 }}>
                • {issue}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}
    </Sheet>
  );
}
