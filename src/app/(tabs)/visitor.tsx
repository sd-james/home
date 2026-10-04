import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { UsesStepper } from '@/components/pickers';
import { colors, radius, spacing } from '@/components/theme';
import { Button, Card, Field, Label, Muted, Row, Screen, Sheet } from '@/components/ui';
import { newId } from '@/lib/id';
import { clampUses } from '@/lib/settings';
import { composeSms, pickContact, type PickedContact } from '@/lib/sms';
import type { VisitorCode } from '@/lib/types';
import {
  buildRequestMessage,
  describeExpiry,
  fillTemplate,
  formatDateTime,
  isExpired,
  parseReply,
} from '@/lib/visitorCode';
import { useSettingsStore, useVisitorCodesStore, withRecentCode } from '@/state/stores';

export default function VisitorCodeScreen() {
  const { value: settings } = useSettingsStore();
  const { value: recent, set: setRecent } = useVisitorCodesStore();

  // Follows the default from Settings until the user picks a number here.
  const [pickedUses, setPickedUses] = useState<number | null>(null);
  const uses = pickedUses ?? settings.defaultUses;
  const [replyText, setReplyText] = useState('');
  const [current, setCurrent] = useState<VisitorCode | null>(null);
  // An edited message applies only to the code it was edited for.
  const [messageEdit, setMessageEdit] = useState<{ codeId: string; text: string } | null>(null);
  const message = !current
    ? ''
    : messageEdit?.codeId === current.id
      ? messageEdit.text
      : fillTemplate(settings.visitorTemplate, current);
  const setMessage = (text: string) => current && setMessageEdit({ codeId: current.id, text });
  const [contact, setContact] = useState<PickedContact | null>(null);

  const requestMessage = buildRequestMessage(settings.requestFormat, uses);

  const readReply = (text: string, save: boolean) => {
    setReplyText(text);
    const parsed = parseReply(text);
    if (!parsed) {
      setCurrent(null);
      return;
    }
    const code: VisitorCode = { id: newId(), requestedAt: new Date().toISOString(), ...parsed };
    setCurrent(code);
    if (save) setRecent((list) => withRecentCode(list, code));
  };

  const pasteReply = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      Alert.alert('Clipboard is empty', 'Copy the estate’s reply in your SMS app first.');
      return;
    }
    readReply(text, true);
  };

  /** Saves a typed-in code to the recent list once it's used. */
  const remember = (code: VisitorCode) => setRecent((list) => withRecentCode(list, code));

  const copyCode = async () => {
    if (!current) return;
    await Clipboard.setStringAsync(current.code);
    remember(current);
    Alert.alert('Copied', `Code ${current.code} is on the clipboard.`);
  };

  const share = async () => {
    if (!current || !message.trim()) return;
    remember(current);
    await Share.share({ message });
  };

  const sendToContact = async () => {
    if (!current || !message.trim()) return;
    const picked = await pickContact();
    if (!picked) return;
    if (picked.phones.length === 0) {
      Alert.alert('No phone number', `${picked.name} has no phone number saved.`);
      return;
    }
    remember(current);
    if (picked.phones.length === 1) await composeSms(picked.phones[0].number, message);
    else setContact(picked);
  };

  const parsedFromText = useMemo(() => (replyText.trim() ? parseReply(replyText) : null), [replyText]);
  const expired = current ? isExpired(current) : false;

  return (
    <>
      <Screen>
        <Card>
          <Label>1. Request a code</Label>
          <UsesStepper value={uses} onChange={(n) => setPickedUses(clampUses(n))} />
          <Button
            big
            title={`Request code (${requestMessage})`}
            onPress={() => composeSms(settings.estateNumber, requestMessage)}
          />
          <Muted>
            Opens your SMS app with “{requestMessage}” to {settings.estateNumber}. You tap send.
          </Muted>
        </Card>

        <Card>
          <Label>2. Read the reply</Label>
          <Button big title="Paste reply" variant="secondary" onPress={pasteReply} />
          <Field
            label="Or type / paste it here"
            multiline
            value={replyText}
            onChangeText={(t) => readReply(t, false)}
            placeholder="Les Maisons TAP code 61359 valid for 9 uses till 2026-10-04 23:59:59"
          />
          {replyText.trim() && !parsedFromText ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Couldn’t find a code in this text:</Text>
              <Text style={styles.raw}>{replyText.trim()}</Text>
            </View>
          ) : null}
        </Card>

        {current ? (
          <Card>
            <Label>3. Share the code</Label>
            <View style={[styles.codeBox, expired && { opacity: 0.5 }]}>
              <Text style={styles.code} selectable>
                {current.code}
              </Text>
              <Text style={styles.codeMeta}>
                {current.uses === null ? 'Uses unknown' : `${current.uses} ${current.uses === 1 ? 'use' : 'uses'}`}
                {' · '}
                {expired ? 'Expired ' : 'Until '}
                {describeExpiry(current)}
              </Text>
            </View>
            <Button big title="Copy code" onPress={copyCode} />
            <Field
              label="Message (edit for this share only)"
              multiline
              value={message}
              onChangeText={setMessage}
            />
            <Pressable onPress={() => setMessageEdit(null)} hitSlop={8}>
              <Text style={styles.link}>Reset message from template</Text>
            </Pressable>
            <Row>
              <Button title="Share" onPress={share} style={{ flex: 1 }} disabled={!message.trim()} />
              <Button
                title="Send by SMS"
                variant="secondary"
                onPress={sendToContact}
                style={{ flex: 1 }}
                disabled={!message.trim()}
              />
            </Row>
          </Card>
        ) : null}

        {recent.length > 0 ? (
          <Card>
            <Label>Recent codes</Label>
            <Muted>Tap one to share it again.</Muted>
            {recent.map((code) => {
              const old = isExpired(code);
              const selected = current?.code === code.code && current?.expiresAt === code.expiresAt;
              return (
                <Pressable
                  key={code.id}
                  onPress={() => {
                    setReplyText('');
                    setCurrent(code);
                  }}
                  onLongPress={() =>
                    Alert.alert(`Remove code ${code.code}?`, undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => setRecent((list) => list.filter((c) => c.id !== code.id)),
                      },
                    ])
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.recent,
                    selected && styles.recentSelected,
                    old && { opacity: 0.45 },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Text style={styles.recentCode}>{code.code}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentMeta}>
                      {code.uses === null ? '?' : code.uses} {code.uses === 1 ? 'use' : 'uses'} ·{' '}
                      {old ? 'expired' : `until ${describeExpiry(code)}`}
                    </Text>
                    <Text style={styles.recentDate}>Requested {formatDateTime(code.requestedAt)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ) : null}
      </Screen>

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
    </>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.chip,
    gap: spacing.xs,
  },
  code: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  codeMeta: { fontSize: 16, color: colors.text, textAlign: 'center', paddingHorizontal: spacing.md },
  link: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  warning: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  warningTitle: { fontSize: 15, fontWeight: '700', color: colors.danger },
  raw: { fontSize: 15, color: colors.text },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  recentSelected: { borderWidth: 2, borderColor: colors.primary },
  recentCode: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 90, fontVariant: ['tabular-nums'] },
  recentMeta: { fontSize: 15, color: colors.text },
  recentDate: { fontSize: 13, color: colors.muted },
});
