/**
 * Les Maisons estate gate codes: the request SMS and the message sent to
 * visitors. You text the request format (default "TAP{uses}", e.g. "TAP9")
 * to the estate number; reading the reply is in codeReply.ts.
 */
import type { VisitorCode } from './types';

export function buildRequestMessage(format: string, uses: number): string {
  return format.replace(/\{uses\}/gi, String(uses));
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sun 4 Oct, 23:59" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}, ${hh}:${mm}`;
}

export function describeExpiry(code: Pick<VisitorCode, 'expiresAt' | 'expiryText'>): string {
  if (code.expiresAt) return formatDateTime(code.expiresAt);
  return code.expiryText ?? 'unknown';
}

export function isExpired(code: Pick<VisitorCode, 'expiresAt'>, now = new Date()): boolean {
  return code.expiresAt !== null && new Date(code.expiresAt).getTime() < now.getTime();
}

export function fillTemplate(
  template: string,
  code: Pick<VisitorCode, 'code' | 'uses' | 'expiresAt' | 'expiryText'>
): string {
  return template
    .replace(/\{code\}/gi, code.code)
    .replace(/\{uses\}/gi, code.uses === null ? '?' : String(code.uses))
    .replace(/\{expiry\}/gi, describeExpiry(code));
}
