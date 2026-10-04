import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  estateNumber: '0637127256',
  requestFormat: 'TAP{uses}',
  defaultUses: 1,
  visitorTemplate:
    'Hi! Your gate code for Les Maisons is {code}. It works for {uses} entries until {expiry}.',
};

export const MIN_USES = 1;
export const MAX_USES = 99;

export function clampUses(n: number): number {
  if (!Number.isFinite(n)) return MIN_USES;
  return Math.min(MAX_USES, Math.max(MIN_USES, Math.round(n)));
}
