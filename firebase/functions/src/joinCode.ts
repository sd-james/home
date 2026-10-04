import { randomInt } from 'node:crypto';

/** Letters and digits that can't be confused when read aloud or typed (no 0/O, 1/I/L, 5/S, 8/B). */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXYZ234679';

/** A household join code like "K7M-4QX". */
export function generateJoinCode(): string {
  const chars = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 3).join('')}-${chars.slice(3).join('')}`;
}

/** Turns what someone typed ("k7m 4qx", "K7M4QX") into the stored form, or null. */
export function normalizeJoinCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length !== 6 || [...raw].some((c) => !ALPHABET.includes(c))) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}
