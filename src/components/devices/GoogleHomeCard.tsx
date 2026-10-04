import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getPermissionState,
  isGoogleHomeAvailable,
  isGoogleHomeModuleAvailable,
  listDevices,
  requestPermissions,
  setOnOff,
  type GoogleHomeDevice,
} from '@modules/googlehome';

import { colors, radius, spacing } from '../theme';
import { Button, Card, Label, Muted } from '../ui';

type State =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'not-connected' }
  | { kind: 'connected'; devices: GoogleHomeDevice[] }
  | { kind: 'error'; message: string };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function initialState(): State {
  if (!isGoogleHomeModuleAvailable) {
    return { kind: 'unavailable', reason: 'This build of Home doesn’t include Google Home yet.' };
  }
  if (!isGoogleHomeAvailable()) {
    return { kind: 'unavailable', reason: 'Google Play services is missing or needs updating.' };
  }
  return { kind: 'loading' };
}

/** Permission state and, once connected, the device list. */
async function fetchState(): Promise<State> {
  try {
    const permission = await getPermissionState();
    if (permission !== 'granted') return { kind: 'not-connected' };
    return { kind: 'connected', devices: await listDevices() };
  } catch (e) {
    return { kind: 'error', message: message(e) };
  }
}

/** Connects to Google Home and lists its on/off devices with direct controls. */
export function GoogleHomeCard() {
  const [state, setState] = useState<State>(initialState);
  const [busyId, setBusyId] = useState<string | null>(null);
  const available = state.kind !== 'unavailable';

  // Reloads after a button press (not from the effect below).
  const load = useCallback(async () => setState(await fetchState()), []);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    void fetchState().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [available]);

  const connect = async (force: boolean) => {
    try {
      const result = await requestPermissions(force);
      if (result === 'granted') {
        setState({ kind: 'loading' });
        await load();
      }
    } catch (e) {
      setState({ kind: 'error', message: message(e) });
    }
  };

  const toggle = async (device: GoogleHomeDevice, on: boolean) => {
    setBusyId(device.id);
    try {
      await setOnOff(device.id, on);
      setState((s) =>
        s.kind === 'connected'
          ? { ...s, devices: s.devices.map((d) => (d.id === device.id ? { ...d, on } : d)) }
          : s
      );
    } catch (e) {
      setState({ kind: 'error', message: message(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <Label>Google Home</Label>
      {state.kind === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
      {state.kind === 'unavailable' ? <Muted>{state.reason}</Muted> : null}
      {state.kind === 'not-connected' ? (
        <>
          <Muted>Connect to see your Google Home devices and switch them from here.</Muted>
          <Button big title="Connect Google Home" onPress={() => connect(false)} />
        </>
      ) : null}
      {state.kind === 'error' ? (
        <>
          <Text style={styles.error}>{state.message}</Text>
          <Button title="Try again" variant="secondary" onPress={() => { setState({ kind: 'loading' }); void load(); }} />
          <Button title="Connect Google Home" variant="ghost" onPress={() => connect(true)} />
        </>
      ) : null}
      {state.kind === 'connected' ? (
        <>
          {state.devices.length === 0 ? (
            <Muted>No devices that switch on and off were shared with Home.</Muted>
          ) : null}
          {state.devices.map((device) => (
            <View key={device.id} style={styles.device}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{device.name}</Text>
                <Text style={styles.meta}>
                  {[device.room || 'No room', device.on === null ? null : device.on ? 'On' : 'Off']
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {busyId === device.id ? (
                <ActivityIndicator color={colors.primary} style={{ width: 128 }} />
              ) : (
                <View style={styles.switches}>
                  <OnOffButton label="On" active={device.on === true} color={colors.on} onPress={() => toggle(device, true)} />
                  <OnOffButton label="Off" active={device.on === false} color={colors.off} onPress={() => toggle(device, false)} />
                </View>
              )}
            </View>
          ))}
          <View style={styles.footer}>
            <Pressable onPress={() => { setState({ kind: 'loading' }); void load(); }} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Refresh</Text>
            </Pressable>
            <Pressable onPress={() => connect(true)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Change home or devices</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function OnOffButton({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.switch,
        active && { backgroundColor: color, borderColor: color },
        pressed && { opacity: 0.6 },
      ]}>
      <Text style={[styles.switchText, active && { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 15, fontWeight: '600', color: colors.danger },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.muted },
  switches: { flexDirection: 'row', gap: spacing.sm },
  switch: {
    minWidth: 60,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  switchText: { fontSize: 16, fontWeight: '700', color: colors.text },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
