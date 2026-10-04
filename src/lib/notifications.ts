/**
 * Push notifications for the household (expo-notifications + Expo's push
 * service over Firebase Cloud Messaging). The server side is
 * firebase/functions/src/expoPush.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { newId } from './id';

/** Must match `channelId` in firebase/functions/src/expoPush.ts. */
export const HOUSEHOLD_CHANNEL = 'household';
const DEVICE_ID_KEY = 'home.deviceId';

// Show notifications even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** A random id for this install, used as the push token's document id. */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = newId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

/**
 * Asks for notification permission (Android 13+ shows a prompt) and returns
 * this phone's Expo push token, or null if notifications are off.
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HOUSEHOLD_CHANNEL, {
      name: 'Household tasks and reminders',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** The app route a tapped notification should open, e.g. "/tasks". */
export function routeFromNotification(response: Notifications.NotificationResponse): string | null {
  const url = response.notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') ? url : null;
}
