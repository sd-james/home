import { useState } from 'react';
import { Alert } from 'react-native';

import { deviceRef } from '@/lib/googleHomeScript';
import type { Device } from '@/lib/types';

import { Button, Field, Muted, Sheet } from '../ui';

type Props = {
  visible: boolean;
  /** The device being edited, or null to add a new one. */
  device: Device | null;
  existing: Device[];
  onSave: (values: { name: string; room: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export function DeviceFormSheet(props: Props) {
  // Mounting the form only while open gives it fresh state each time.
  return props.visible ? <DeviceForm {...props} /> : null;
}

function DeviceForm({ device, existing, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(device?.name ?? '');
  const [room, setRoom] = useState(device?.room ?? '');

  const save = () => {
    const values = { name: name.trim(), room: room.trim() };
    if (!values.name) {
      Alert.alert('Name needed', 'Enter the device name exactly as it appears in Google Home.');
      return;
    }
    const ref = deviceRef(values).toLowerCase();
    if (existing.some((d) => d.id !== device?.id && deviceRef(d).toLowerCase() === ref)) {
      Alert.alert('Already added', `"${deviceRef(values)}" is already in your list.`);
      return;
    }
    onSave(values);
  };

  const confirmDelete = () =>
    Alert.alert('Delete device?', `Delete "${device ? deviceRef(device) : ''}" and its schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Sheet
      visible
      title={device ? 'Edit device' : 'Add device'}
      onClose={onClose}
      footer={
        <>
          <Button big title={device ? 'Save' : 'Add device'} onPress={save} />
          {device && onDelete ? <Button title="Delete device" variant="danger" onPress={confirmDelete} /> : null}
        </>
      }>
      <Field
        label="Name in Google Home"
        placeholder="Kettle"
        value={name}
        onChangeText={setName}
        autoFocus={!device}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <Field
        label="Room"
        placeholder="Kitchen"
        value={room}
        onChangeText={setRoom}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <Muted>
        Use the exact names from the Google Home app. The script refers to this device as “
        {deviceRef({ name: name.trim() || 'Name', room: room.trim() })}”.
      </Muted>
    </Sheet>
  );
}
