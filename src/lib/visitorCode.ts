/**
 * Les Maisons estate gate codes. You text the request format (default
 * "TAP{uses}", e.g. "TAP9") to the estate number, and the estate replies:
 *
 *   Les Maisons TAP code 61359 valid for 9 uses till 2026-10-04 23:59:59
 */
import type { VisitorCode } from './types';

export type ParsedReply = {
  code: string;
  uses: number | null;
  expiresAt: string | null;
  expiryText: string | null;
};

const DATE_TIME = String.raw`(\d{4}-\d{1,2}-\d{1,2}(?:[ T]+\d{1,2}:\d{2}(?::\d{2})?)?)`;

export function buildRequestMessage(format: string, uses: number): string {
  return format.replace(/\{uses\}/gi, String(uses));
}

/** Parses "2026-10-04 23:59:59" (with or without a time) as local time. */
export function parseExpiry(text: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const hasTime = h !== undefined;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    hasTime ? Number(h) : 23,
    hasTime ? Number(mi) : 59,
    hasTime ? Number(s ?? 0) : 59
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Pulls the code, number of uses and expiry out of the estate's reply.
 * Forgiving about wording, spacing and case; returns null without a code.
 */
export function parseReply(text: string): ParsedReply | null {
  const body = text.replace(/\s+/g, ' ').trim();
  if (!body) return null;

  const expiryMatch =
    new RegExp(String.raw`(?:till|until|expir\w*|valid to|exp)\s*:?\s*` + DATE_TIME, 'i').exec(body) ??
    new RegExp(DATE_TIME).exec(body);
  const expiryText = expiryMatch ? expiryMatch[1] : null;
  const expiry = expiryText ? parseExpiry(expiryText) : null;

  // Look for the code after the word "code"; otherwise take the first 4–8
  // digit number that isn't part of the date.
  const withoutDate = expiryMatch ? body.replace(expiryMatch[0], ' ') : body;
  const codeMatch =
    /code\D{0,12}?(\d{3,10})/i.exec(withoutDate) ?? /(?:^|[^\d-])(\d{4,8})(?![\d-])/.exec(withoutDate);
  if (!codeMatch) return null;

  const usesMatch =
    /(\d{1,3})\s*(?:uses?|entr(?:y|ies)|times?)\b/i.exec(withoutDate) ??
    /\bfor\s+(\d{1,3})\b/i.exec(withoutDate);

  return {
    code: codeMatch[1],
    uses: usesMatch ? Number(usesMatch[1]) : null,
    expiresAt: expiry ? expiry.toISOString() : null,
    expiryText,
  };
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
