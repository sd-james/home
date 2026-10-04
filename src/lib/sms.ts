import { Contact, requestPermissionsAsync } from 'expo-contacts';
import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

/** Opens the SMS app with the message filled in. The user taps send. */
export async function composeSms(to: string | string[], message: string): Promise<void> {
  if (!(await SMS.isAvailableAsync())) {
    Alert.alert('SMS not available', "This phone can't send text messages.");
    return;
  }
  await SMS.sendSMSAsync(to, message);
}

export type PickedContact = { name: string; phones: { label: string; number: string }[] };

/** Lets the user pick a contact; returns null if they cancel or deny access. */
export async function pickContact(): Promise<PickedContact | null> {
  const { granted } = await requestPermissionsAsync();
  if (!granted) {
    Alert.alert('No access to contacts', 'Allow contacts access in your phone settings to pick someone.');
    return null;
  }
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const [name, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
  return {
    name: name || 'Contact',
    phones: phones
      .filter((p) => p.number && p.number.trim())
      .map((p) => ({ label: p.label ?? '', number: p.number!.trim() })),
  };
}
