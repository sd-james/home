/**
 * JS side of the local `HomeSms` Kotlin module (modules/sms/android).
 * Android only: on other platforms, or in a build without the module,
 * `isSmsModuleAvailable` is false and the app uses the manual SMS flow.
 */
import { requireOptionalNativeModule, type EventSubscription, type NativeModule } from 'expo';
import { Platform } from 'react-native';

export type SmsMessage = {
  /** Sender's number or name as the phone shows it, e.g. "+27637127256". */
  from: string;
  body: string;
  /** Milliseconds since 1970. */
  timestamp: number;
};

type HomeSmsEvents = {
  onSmsReceived: (message: SmsMessage) => void;
};

declare class HomeSmsModule extends NativeModule<HomeSmsEvents> {
  canSendSms(): boolean;
  sendSms(to: string, body: string): Promise<'sent' | 'unconfirmed'>;
  readInbox(sinceMs: number, limit: number): Promise<SmsMessage[]>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<HomeSmsModule>('HomeSms') : null;

export const isSmsModuleAvailable = native !== null;

export function canSendSms(): boolean {
  return native?.canSendSms() ?? false;
}

/** Sends an SMS directly (needs SEND_SMS). */
export async function sendSms(to: string, body: string): Promise<'sent' | 'unconfirmed'> {
  if (!native) throw new Error('Sending SMS directly is not available in this build.');
  return native.sendSms(to, body);
}

/** Inbox messages received since `sinceMs`, newest first (needs READ_SMS). */
export async function readInbox(sinceMs: number, limit = 30): Promise<SmsMessage[]> {
  if (!native) return [];
  return native.readInbox(sinceMs, limit);
}

/** Calls `listener` for every SMS received while subscribed (needs RECEIVE_SMS). */
export function addSmsListener(listener: (message: SmsMessage) => void): EventSubscription {
  if (!native) return { remove() {} };
  return native.addListener('onSmsReceived', listener);
}
