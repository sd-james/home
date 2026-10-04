/** Sending notifications through Expo's push service (which delivers via FCM). */

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

/**
 * Sends the messages and returns tokens Expo reports as no longer valid
 * (app uninstalled or notifications turned off), so they can be deleted.
 */
export async function sendPush(messages: PushMessage[]): Promise<string[]> {
  const invalid: string[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK).map((m) => ({
      ...m,
      sound: 'default',
      priority: 'high',
      channelId: 'household',
    }));
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      console.error('Expo push failed', response.status, await response.text());
      continue;
    }
    const { data } = (await response.json()) as { data: Ticket[] };
    data.forEach((ticket, j) => {
      if (ticket.status === 'error') {
        console.warn('Push error', chunk[j].to, ticket.details);
        if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(chunk[j].to);
      }
    });
  }
  return invalid;
}
