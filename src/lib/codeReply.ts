/**
 * Reading the estate's gate code replies. No imports, so the tests in
 * codeReply.test.ts run in plain Node.
 *
 * Example reply:
 *   Les Maisons TAP code 61359 valid for 9 uses till 2026-10-04 23:59:59
 */

export type ParsedReply = {
  code: string;
  uses: number | null;
  /** ISO timestamp, or null when no expiry could be read. */
  expiresAt: string | null;
  /** The expiry exactly as written in the SMS. */
  expiryText: string | null;
};

const DATE_TIME = String.raw`(\d{4}-\d{1,2}-\d{1,2}(?:[ T]+\d{1,2}:\d{2}(?::\d{2})?)?)`;

/** Parses "2026-10-04 23:59:59" (time optional) as local time; a bare date means 23:59:59. */
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
 * Pulls the code, number of uses and expiry out of a reply. Forgiving about
 * wording, spacing and case; returns null when there's no code.
 */
export function parseReply(text: string): ParsedReply | null {
  const body = text.replace(/\s+/g, ' ').trim();
  if (!body) return null;

  const expiryMatch =
    new RegExp(String.raw`(?:till|until|expir\w*|valid to|exp)\s*:?\s*` + DATE_TIME, 'i').exec(body) ??
    new RegExp(DATE_TIME).exec(body);
  const expiryText = expiryMatch ? expiryMatch[1] : null;
  const expiry = expiryText ? parseExpiry(expiryText) : null;

  // The code is the number after "code"; otherwise the first 4–8 digit
  // number that isn't part of the date.
  const rest = expiryMatch ? body.replace(expiryMatch[0], ' ') : body;
  const codeMatch = /code\D{0,12}?(\d{3,10})/i.exec(rest) ?? /(?:^|[^\d-])(\d{4,8})(?![\d-])/.exec(rest);
  if (!codeMatch) return null;

  const usesMatch =
    /(\d{1,3})\s*(?:uses?|entr(?:y|ies)|times?)\b/i.exec(rest) ?? /\bfor\s+(\d{1,3})\b/i.exec(rest);

  return {
    code: codeMatch[1],
    uses: usesMatch ? Number(usesMatch[1]) : null,
    expiresAt: expiry ? expiry.toISOString() : null,
    expiryText,
  };
}

/**
 * Whether two phone numbers are the same, ignoring spaces, dashes, brackets
 * and the country code: "063 712 7256", "0637127256", "+27637127256" and
 * "0027 63 712 7256" all match. Sender names (no digits) never match.
 */
export function isSameNumber(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  if (da.length < 7 || db.length < 7) return false;
  // Compare the last 9 digits: a South African number without its 0 or +27.
  const n = Math.min(9, da.length, db.length);
  return da.slice(-n) === db.slice(-n);
}

export type IncomingSms = { from: string; body: string; timestamp: number };

/**
 * The newest message from `estateNumber`, received at or after `sinceMs`,
 * that contains a code. Returns null if none.
 */
export function findCodeReply(
  messages: IncomingSms[],
  estateNumber: string,
  sinceMs: number
): (ParsedReply & { message: IncomingSms }) | null {
  const candidates = messages
    .filter((m) => m.timestamp >= sinceMs && isSameNumber(m.from, estateNumber))
    .sort((a, b) => b.timestamp - a.timestamp);
  for (const message of candidates) {
    const parsed = parseReply(message.body);
    if (parsed) return { ...parsed, message };
  }
  return null;
}
