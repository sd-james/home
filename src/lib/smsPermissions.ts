import { Alert, PermissionsAndroid, Platform } from 'react-native';

const SMS_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.SEND_SMS,
  PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  PermissionsAndroid.PERMISSIONS.READ_SMS,
];

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

async function allGranted(): Promise<boolean> {
  const checks = await Promise.all(SMS_PERMISSIONS.map((p) => PermissionsAndroid.check(p)));
  return checks.every(Boolean);
}

function explain(): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      'Get gate codes automatically',
      'Home will text the estate for you and read its reply, so the code appears by itself. It only reads messages from the estate number.\n\nAndroid will now ask to let Home send and view SMS messages.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  );
}

/**
 * Makes sure Home may send, receive and read SMS. The first time, it explains
 * why before Android's own prompts. "blocked" means Android won't ask again
 * and the user has to allow it in the phone's settings.
 */
export async function ensureSmsPermissions(): Promise<PermissionOutcome> {
  if (Platform.OS !== 'android') return 'denied';
  if (await allGranted()) return 'granted';
  if (!(await explain())) return 'denied';
  const results = await PermissionsAndroid.requestMultiple(SMS_PERMISSIONS);
  const values = SMS_PERMISSIONS.map((p) => results[p]);
  if (values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  if (values.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
  return 'denied';
}
