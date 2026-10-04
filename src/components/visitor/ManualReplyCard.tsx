import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { parseReply, type ParsedReply } from '@/lib/codeReply';

import { colors, radius, spacing } from '../theme';
import { Button, Card, Field, Label, Muted } from '../ui';

type Props = {
  requestMessage: string;
  estateNumber: string;
  /** Why the manual flow is shown, e.g. "No reply within 2 minutes." */
  reason?: string | null;
  onOpenSmsApp: () => void;
  /** Called with a parsed reply; `pasted` is true when it came from the clipboard button. */
  onReply: (reply: ParsedReply, pasted: boolean) => void;
};

/** The manual flow: request in the SMS app, then paste or type the reply. */
export function ManualReplyCard({ requestMessage, estateNumber, reason, onOpenSmsApp, onReply }: Props) {
  const [text, setText] = useState('');
  const parsed = text.trim() ? parseReply(text) : null;

  const read = (value: string, pasted: boolean) => {
    setText(value);
    const reply = parseReply(value);
    if (reply) onReply(reply, pasted);
  };

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (!clip.trim()) {
      Alert.alert('Clipboard is empty', 'Copy the estate’s reply in your SMS app first.');
      return;
    }
    read(clip, true);
  };

  return (
    <Card>
      <Label>Do it by hand</Label>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
      <Button title={`Open SMS app (${requestMessage})`} variant="secondary" onPress={onOpenSmsApp} />
      <Muted>
        Sends “{requestMessage}” to {estateNumber} from your SMS app. When the reply arrives, copy it
        and paste it here.
      </Muted>
      <Button title="Paste reply" variant="secondary" onPress={paste} />
      <Field
        label="Or type the reply"
        multiline
        value={text}
        onChangeText={(t) => read(t, false)}
        placeholder="Les Maisons TAP code 61359 valid for 9 uses till 2026-10-04 23:59:59"
      />
      {text.trim() && !parsed ? (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Couldn’t find a code in this text:</Text>
          <Text style={styles.raw}>{text.trim()}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  reason: { fontSize: 15, color: colors.danger, fontWeight: '600' },
  warning: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  warningTitle: { fontSize: 15, fontWeight: '700', color: colors.danger },
  raw: { fontSize: 15, color: colors.text },
});
