import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { UsesStepper } from '@/components/pickers';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Label, Muted, Screen } from '@/components/ui';
import { RecentCodes } from '@/components/visitor/RecentCodes';
import { ShareCodeCard } from '@/components/visitor/ShareCodeCard';
import { REPLY_TIMEOUT_MS, isAutoCodeAvailable, sendCodeRequest, waitForCodeReply } from '@/lib/autoCode';
import type { ParsedReply } from '@/lib/codeReply';
import { newId } from '@/lib/id';
import { clampUses } from '@/lib/settings';
import { ensureSmsPermissions } from '@/lib/smsPermissions';
import type { VisitorCode } from '@/lib/types';
import { buildRequestMessage, isStillValid } from '@/lib/visitorCode';
import { useSettingsStore, useVisitorCodesStore, withRecentCode } from '@/state/stores';

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'waiting'; since: number; deadline: number }
  /** The automatic flow didn't work; explain why and offer what can be done. */
  | { kind: 'failed'; reason: string; canWaitAgain?: { since: number }; permissionBlocked?: boolean };

export default function VisitorCodeScreen() {
  const { value: settings } = useSettingsStore();
  const { value: recent, set: setRecent } = useVisitorCodesStore();
  const auto = isAutoCodeAvailable();

  // Follows the default from Settings until the user picks a number here.
  const [pickedUses, setPickedUses] = useState<number | null>(null);
  const uses = pickedUses ?? settings.defaultUses;
  const requestMessage = buildRequestMessage(settings.requestFormat, uses);

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [current, setCurrent] = useState<VisitorCode | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollToShare = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Stop waiting if the screen goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Countdown while waiting.
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase.kind]);

  const remember = (code: VisitorCode) => setRecent((list) => withRecentCode(list, code));

  const showCode = (reply: ParsedReply) => {
    const code: VisitorCode = { id: newId(), requestedAt: new Date().toISOString(), ...reply };
    setCurrent(code);
    remember(code);
    setNote('Code copied to the clipboard.');
    scrollToShare.current = true;
  };

  const wait = async (since: number) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setNow(Date.now());
    setPhase({ kind: 'waiting', since, deadline: Date.now() + REPLY_TIMEOUT_MS });
    const result = await waitForCodeReply({ from: settings.estateNumber, since, signal: controller.signal });
    if (controller.signal.aborted && result.kind !== 'code') return;
    if (result.kind === 'code') {
      await Clipboard.setStringAsync(result.reply.code);
      showCode(result.reply);
      setPhase({ kind: 'idle' });
    } else if (result.kind === 'timeout') {
      setPhase({
        kind: 'failed',
        reason: 'No reply from the estate within 2 minutes.',
        canWaitAgain: { since },
      });
    }
  };

  const getCode = async () => {
    const permission = await ensureSmsPermissions();
    if (permission !== 'granted') {
      setPhase({
        kind: 'failed',
        reason:
          permission === 'blocked'
            ? 'SMS permission is off for Home. Allow it in the phone’s settings, then try again.'
            : 'Home needs SMS permission to request the code.',
        permissionBlocked: permission === 'blocked',
      });
      return;
    }
    setPhase({ kind: 'sending' });
    let since: number;
    try {
      since = await sendCodeRequest(settings.estateNumber, requestMessage);
    } catch (e) {
      setPhase({
        kind: 'failed',
        reason: e instanceof Error ? e.message : 'The SMS couldn’t be sent.',
      });
      return;
    }
    await wait(since);
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase({ kind: 'idle' });
  };

  const busy = phase.kind === 'sending' || phase.kind === 'waiting';
  const secondsLeft = phase.kind === 'waiting' ? Math.max(0, Math.ceil((phase.deadline - now) / 1000)) : 0;

  return (
    <Screen ref={scrollRef}>
      <Card>
        <Label>Visitor gate code</Label>
        <UsesStepper value={uses} onChange={(n) => setPickedUses(clampUses(n))} />
        {!auto ? (
          <Muted>This phone can’t send SMS, so Home can’t request codes.</Muted>
        ) : busy ? (
          <View style={styles.waiting}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.waitingText}>
              {phase.kind === 'sending'
                ? `Sending “${requestMessage}”…`
                : `Waiting for reply… ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
            </Text>
            {phase.kind === 'waiting' ? <Button title="Cancel" variant="ghost" onPress={cancel} /> : null}
          </View>
        ) : (
          <>
            <Button big title={`Get code (${requestMessage})`} onPress={getCode} />
            <Muted>
              Texts “{requestMessage}” to {settings.estateNumber} and waits for the code.
            </Muted>
          </>
        )}
        {phase.kind === 'failed' ? (
          <View style={styles.failed}>
            <Text style={styles.failedText}>{phase.reason}</Text>
            {phase.canWaitAgain ? (
              <Button
                title="Keep waiting"
                variant="secondary"
                onPress={() => phase.canWaitAgain && wait(phase.canWaitAgain.since)}
              />
            ) : null}
            {phase.permissionBlocked ? (
              <Button title="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
            ) : null}
          </View>
        ) : null}
      </Card>

      {current ? (
        <ShareCodeCard
          key={current.id}
          code={current}
          template={settings.visitorTemplate}
          note={note}
          onUsed={remember}
          onLayout={(e) => {
            if (!scrollToShare.current) return;
            scrollToShare.current = false;
            scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - spacing.lg), animated: true });
          }}
        />
      ) : null}

      <RecentCodes
        codes={recent.filter((code) => isStillValid(code))}
        selectedId={current?.id ?? null}
        onSelect={(code) => {
          setCurrent(code);
          setNote(null);
          scrollToShare.current = true;
        }}
        onRemove={(code) => setRecent((list) => list.filter((c) => c.id !== code.id))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  waiting: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  waitingText: { fontSize: 18, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  failed: { gap: spacing.sm },
  failedText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
