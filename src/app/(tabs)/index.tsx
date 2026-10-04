import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { DeviceFormSheet } from '@/components/devices/DeviceFormSheet';
import { GoogleHomeCard } from '@/components/devices/GoogleHomeCard';
import { ImportSheet } from '@/components/devices/ImportSheet';
import { colors, radius, spacing } from '@/components/theme';
import { Button, Card, Label, Muted, Screen } from '@/components/ui';
import { GOOGLE_HOME_URL, buildScript, countAutomations } from '@/lib/googleHomeScript';
import { newId } from '@/lib/id';
import { countEventsPerWeek } from '@/lib/schedule';
import type { Device } from '@/lib/types';
import { useDevicesStore } from '@/state/stores';

export default function DevicesScreen() {
  const router = useRouter();
  const { value: devices, set: setDevices, loaded } = useDevicesStore();
  const [editing, setEditing] = useState<Device | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const openForm = (device: Device | null) => {
    setEditing(device);
    setFormOpen(true);
  };

  const saveDevice = ({ name, room }: { name: string; room: string }) => {
    if (editing) {
      setDevices((list) => list.map((d) => (d.id === editing.id ? { ...d, name, room } : d)));
    } else {
      setDevices((list) => [...list, { id: newId(), name, room, events: [] }]);
    }
    setFormOpen(false);
  };

  const deleteDevice = () => {
    if (editing) setDevices((list) => list.filter((d) => d.id !== editing.id));
    setFormOpen(false);
  };

  const exportScript = async () => {
    const count = countAutomations(devices);
    if (count === 0) {
      Alert.alert('Nothing to export', 'Add some on/off events to your devices first.');
      return;
    }
    await Clipboard.setStringAsync(buildScript(devices));
    Alert.alert(
      'Script copied',
      `${count} automation${count === 1 ? '' : 's'} copied. In Google Home, open Automations, create a new script automation and paste it into the script editor.`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Open Google Home', onPress: () => Linking.openURL(GOOGLE_HOME_URL) },
      ]
    );
  };

  const sorted = [...devices].sort(
    (a, b) => a.room.localeCompare(b.room) || a.name.localeCompare(b.name)
  );

  return (
    <>
      <Screen>
        <GoogleHomeCard />

        <Button big title="+ Add device" onPress={() => openForm(null)} />

        {loaded && devices.length === 0 ? (
          <Card>
            <Label>No devices yet</Label>
            <Muted>
              Add each smart plug or switch with its exact Google Home name and room, or import an
              existing script from Google Home.
            </Muted>
          </Card>
        ) : null}

        {sorted.map((device) => {
          const perWeek = countEventsPerWeek(device.events);
          return (
            <Pressable
              key={device.id}
              onPress={() => router.push({ pathname: '/device/[id]', params: { id: device.id } })}
              onLongPress={() => openForm(device)}
              accessibilityRole="button"
              accessibilityHint="Opens the schedule"
              style={({ pressed }) => [styles.device, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceMeta}>
                  {[device.room || 'No room', perWeek ? `${perWeek} switch${perWeek === 1 ? '' : 'es'} a week` : 'No schedule'].join(' · ')}
                </Text>
              </View>
              <Pressable
                onPress={() => openForm(device)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${device.name}`}
                style={({ pressed }) => [styles.edit, pressed && { opacity: 0.6 }]}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </Pressable>
          );
        })}

        <Card>
          <Label>Google Home</Label>
          <Muted>
            The app can’t change Google Home directly. Copy a script and paste it into the script
            editor at home.google.com, or import one from there.
          </Muted>
          <Button title="Copy script for Google Home" onPress={exportScript} />
          <Button title="Import from Google Home" variant="secondary" onPress={() => setImportOpen(true)} />
        </Card>
      </Screen>

      <DeviceFormSheet
        visible={formOpen}
        device={editing}
        existing={devices}
        onSave={saveDevice}
        onDelete={deleteDevice}
        onClose={() => setFormOpen(false)}
      />
      <ImportSheet
        visible={importOpen}
        devices={devices}
        onImport={setDevices}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minHeight: 72,
  },
  deviceName: { fontSize: 19, fontWeight: '700', color: colors.text },
  deviceMeta: { fontSize: 15, color: colors.muted },
  edit: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  editText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
