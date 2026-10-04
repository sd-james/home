/**
 * Over-the-air updates (EAS Update, channel "main"). The native automatic
 * check is limited to error recovery in app.json; this module checks when the
 * app opens and applies a new update straight away.
 */
import * as Updates from 'expo-updates';

export type UpdateOutcome = 'updated' | 'up-to-date' | 'unavailable';

/** Downloads and applies a newer update if there is one (reloads the app). */
export async function checkAndApplyUpdate(): Promise<UpdateOutcome> {
  if (__DEV__ || !Updates.isEnabled) return 'unavailable';
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'up-to-date';
  const fetched = await Updates.fetchUpdateAsync();
  if (!fetched.isNew) return 'up-to-date';
  await Updates.reloadAsync();
  return 'updated';
}

/** Runs once when the app opens; failures (e.g. offline) are ignored. */
export function applyUpdateOnLaunch(): void {
  checkAndApplyUpdate().catch((e) => console.warn('Update check failed', e));
}

/** E.g. "Update from Sun 4 Oct, 14:02" or "Built-in version from …". */
export function describeCurrentUpdate(): { title: string; detail: string } {
  if (__DEV__) return { title: 'Development build', detail: 'Running from the development server.' };
  if (!Updates.isEnabled) return { title: 'Updates are off', detail: '' };
  const when = Updates.createdAt ? formatWhen(Updates.createdAt) : 'unknown date';
  const title = Updates.isEmbeddedLaunch ? `Built-in version from ${when}` : `Update from ${when}`;
  const detail = [
    `Channel ${Updates.channel ?? 'unknown'}`,
    Updates.updateId ? `update ${Updates.updateId.slice(0, 8)}` : null,
    Updates.isEmergencyLaunch ? 'recovered from an error' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return { title, detail };
}

function formatWhen(date: Date): string {
  const day = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time}`;
}
