import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { composeSms, pickContact, type PickedContact } from '@/lib/sms';
import type { VisitorCode } from '@/lib/types';
import { describeExpiry, fillTemplate, isExpired } from '@/lib/visitorCode';

import { colors, radius, spacing } from '../theme';
import { Button, Card, Field, Label, Muted, Row, Sheet } from '../ui';

type Props = {
  code: VisitorCode;
  template: string;
  /** Shown above the code, e.g. "Copied to clipboard". */
  note?: string | null;
  /** Called when the code is copied or shared, to keep it in recent codes. */
  onUsed: (code: VisitorCode) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function ShareCodeCard({ code, template, note, onUsed, onLayout }: Props) {
  // An edited message applies only to the code it was edited for.
  const [edit, setEdit] = useState<{ codeId: string; text: string } | null>(null);
  const message = edit?.codeId === code.id ? edit.text : fillTemplate(template, code);
  const [contact, setContact] = useState<PickedContact | null>(null);
  const expired = isExpired(code);

  const copyCode = async () => {
    await Clipboard.setStringAsync(code.code);
    onUsed(code);
    Alert.alert('Copied', `Code ${code.code} is on the clipboard.`);
  };

  const share = async () => {
    onUsed(code);
    await Share.share({ message });
  };

  const sendToContact = async () => {
    const picked = await pickContact();
    if (!picked) return;
    if (picked.phones.length === 0) {
      Alert.alert('No phone number', `${picked.name} has no phone number saved.`);
      return;
    }
    onUsed(code);
    if (picked.phones.length === 1) await composeSms(picked.phones[0].number, message);
    else setContact(picked);
  };

  return (
    <Card style={styles.card} onLayout={onLayout}>
      <Label>Share the code</Label>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <View style={[styles.codeBox, expired && { opacity: 0.5 }]}>
        <Text style={styles.code} selectable>
          {code.code}
        </Text>
        <Text style={styles.meta}>
          {code.uses === null ? 'Uses unknown' : `${code.uses} ${code.uses === 1 ? 'use' : 'uses'}`}
          {' · '}
          {expired ? 'Expired ' : 'Until '}
          {describeExpiry(code)}
        </Text>
      </View>
      <Row>
        <Button big title="Share" onPress={share} style={{ flex: 1 }} disabled={!message.trim()} />
        <Button big title="Send by SMS" variant="secondary" onPress={sendToContact} style={{ flex: 1 }} disabled={!message.trim()} />
      </Row>
      <Button title="Copy code" variant="secondary" onPress={copyCode} />
      <Field
        label="Message (edit for this share only)"
        multiline
        value={message}
        onChangeText={(text) => setEdit({ codeId: code.id, text })}
      />
      <Pressable onPress={() => setEdit(null)} hitSlop={8} accessibilityRole="button">
        <Text style={styles.link}>Reset message from template</Text>
      </Pressable>

      <Sheet visible={contact !== null} title={`Text ${contact?.name ?? ''}`} onClose={() => setContact(null)}>
        <Muted>Pick a number:</Muted>
        {contact?.phones.map((phone) => (
          <Button
            key={`${phone.label}-${phone.number}`}
            title={phone.label ? `${phone.number} (${phone.label})` : phone.number}
            variant="secondary"
            onPress={async () => {
              setContact(null);
              await composeSms(phone.number, message);
            }}
          />
        ))}
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: colors.primary },
  note: { fontSize: 15, fontWeight: '600', color: colors.on },
  codeBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.chip,
    gap: spacing.xs,
  },
  code: { fontSize: 48, fontWeight: '800', letterSpacing: 6, color: colors.text, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 16, color: colors.text, textAlign: 'center', paddingHorizontal: spacing.md },
  link: { fontSize: 15, color: colors.primary, fontWeight: '600' },
});
