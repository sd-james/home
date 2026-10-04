import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { UsesStepper } from '@/components/pickers';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Label, Muted, Screen } from '@/components/ui';
import { ManualReplyCard } from '@/components/visitor/ManualReplyCard';
import { RecentCodes } from '@/components/visitor/RecentCodes';
import { ShareCodeCard } from '@/components/visitor/ShareCodeCard';
import { REPLY_TIMEOUT_MS, isAutoCodeAvailable, sendCodeRequest, waitForCodeReply } from '@/lib/autoCode';
import type { ParsedReply } from '@/lib/codeReply';
import { newId } from '@/lib/id';
import { clampUses } from '@/lib/settings';
import { composeSms } from '@/lib/sms';
import { ensureSmsPermissions } from '@/lib/smsPermissions';
import type { VisitorCode } from '@/lib/types';
import { buildRequestMessage } from '@/lib/visitorCode';
import { useSettingsStore, useVisitorCodesStore, withRecentCode } from '@/state/stores';

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'waiting'; since: number; deadline: number }
  /** The automatic flow didn't work; show the manual flow with the reason. */
  | { kind: 'manual'; reason: string | null; canWaitAgain?: { since: number }; permissionBlocked?: boolean };

export default function VisitorCodeScreen() {
  const { value: settings } = useSettingsStore();
  const { value: recent, set: setRecent } = useVisitorCodesStore();
  const auto = isAutoCodeAvailable();

  // Follows the default from Settings until the user picks a number here.
  const [pickedUses, setPickedUses] = useState<number | null>(null);
  const uses = pickedUses ?? settings.defaultUses;
  const requestMessage = buildRequestMessage(settings.requestFormat, uses);

  const [phase, setPhase] = useState<Phase>(auto ? { kind: 'idle' } : { kind: 'manual', reason: null });
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

  /** Shows a code; `save` adds it to recent codes now (typed codes are saved once used). */
  const showCode = (reply: ParsedReply, { copied, save }: { copied: boolean; save: boolean }) => {
    const code: VisitorCode = { id: newId(), requestedAt: new Date().toISOString(), ...reply };
    setCurrent(code);
    if (save) remember(code);
    setNote(copied ? 'Code copied to the clipboard.' : null);
    scrollToShare.current = true;
  };

  const openSmsApp = () => composeSms(settings.estateNumber, requestMessage);

  const wait = async (since: number) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setNow(Date.now());
    setPhase({ kind: 'waiting', since, deadline: Date.now() + REPLY_TIMEOUT_MS });
    const result = await waitForCodeReply({ from: settings.estateNumber, since, signal: controller.signal });
    if (controller.signal.aborted && result.kind !== 'code') return;
    if (result.kind === 'code') {
      await Clipboard.setStringAsync(result.reply.code);
      showCode(result.reply, { copied: true, save: true });
      setPhase({ kind: 'idle' });
    } else if (result.kind === 'timeout') {
      setPhase({
        kind: 'manual',
        reason: 'No reply from the estate within 2 minutes.',
        canWaitAgain: { since },
      });
    }
  };

  const getCode = async () => {
    const permission = await ensureSmsPermissions();
    if (permission !== 'granted') {
      setPhase({
        kind: 'manual',
        reason:
          permission === 'blocked'
            ? 'SMS permission is off for Home. Allow it in the phone’s settings to get codes automatically.'
            : 'Without SMS permission, request the code from your SMS app.',
        permissionBlocked: permission === 'blocked',
      });
      await openSmsApp();
      return;
    }
    setPhase({ kind: 'sending' });
    let since: number;
    try {
      since = await sendCodeRequest(settings.estateNumber, requestMessage);
    } catch (e) {
      setPhase({
        kind: 'manual',
        reason: e instanceof Error ? e.message : 'The SMS couldn’t be sent.',
      });
      return;
    }
    await wait(since);
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase({ kind: 'manual', reason: 'Stopped waiting. If the reply comes in, paste it below.' });
  };

  const busy = phase.kind === 'sending' || phase.kind === 'waiting';
  const secondsLeft = phase.kind === 'waiting' ? Math.max(0, Math.ceil((phase.deadline - now) / 1000)) : 0;

  return (
    <Screen ref={scrollRef}>
      <Card>
        <Label>Visitor gate code</Label>
        <UsesStepper value={uses} onChange={(n) => setPickedUses(clampUses(n))} />
        {auto ? (
          busy ? (
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
          )
        ) : (
          <Muted>This phone can’t send SMS from Home, so request the code by hand below.</Muted>
        )}
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

      {phase.kind === 'manual' ? (
        <>
          {phase.canWaitAgain ? (
            <Button
              title="Keep waiting for the reply"
              variant="secondary"
              onPress={() => phase.canWaitAgain && wait(phase.canWaitAgain.since)}
            />
          ) : null}
          {phase.permissionBlocked ? (
            <Button title="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
          ) : null}
          <ManualReplyCard
            requestMessage={requestMessage}
            estateNumber={settings.estateNumber}
            reason={phase.reason}
            onOpenSmsApp={openSmsApp}
            onReply={(reply, pasted) => showCode(reply, { copied: false, save: pasted })}
          />
        </>
      ) : auto && !busy ? (
        <Pressable onPress={() => setPhase({ kind: 'manual', reason: null })} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>Enter a reply by hand</Text>
        </Pressable>
      ) : null}

      <RecentCodes
        codes={recent}
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
  link: { fontSize: 16, color: colors.primary, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.sm },
});
