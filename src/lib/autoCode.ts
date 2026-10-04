/**
 * Automatic gate codes: send the request SMS directly, then wait for the
 * estate's reply using the live SMS listener plus an inbox check every few
 * seconds (in case the listener misses it, e.g. while the screen was off).
 */
import { addSmsListener, canSendSms, isSmsModuleAvailable, readInbox, sendSms } from '@modules/sms';

import { findCodeReply, type IncomingSms, type ParsedReply } from './codeReply';

export const REPLY_TIMEOUT_MS = 2 * 60 * 1000;
const INBOX_POLL_MS = 4000;
/** Messages slightly older than the request still count (clock differences). */
const CLOCK_SLACK_MS = 5000;

export function isAutoCodeAvailable(): boolean {
  return isSmsModuleAvailable && canSendSms();
}

/** Sends the request SMS. Returns the time to look for replies from. */
export async function sendCodeRequest(to: string, message: string): Promise<number> {
  const since = Date.now() - CLOCK_SLACK_MS;
  await sendSms(to, message);
  return since;
}

export type WaitResult = { kind: 'code'; reply: ParsedReply } | { kind: 'timeout' } | { kind: 'cancelled' };

/**
 * Waits for a code reply from `from` received after `since`, for up to
 * `timeoutMs`. Abort `signal` to stop waiting.
 */
export function waitForCodeReply({
  from,
  since,
  timeoutMs = REPLY_TIMEOUT_MS,
  signal,
}: {
  from: string;
  since: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<WaitResult> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: WaitResult) => {
      if (done) return;
      done = true;
      subscription.remove();
      clearInterval(poll);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const check = (messages: IncomingSms[]) => {
      const reply = findCodeReply(messages, from, since);
      if (reply) finish({ kind: 'code', reply });
    };
    const checkInbox = () =>
      readInbox(since).then(check, (e) => console.warn('Reading the SMS inbox failed', e));
    const onAbort = () => finish({ kind: 'cancelled' });

    const subscription = addSmsListener((message) => check([message]));
    const poll = setInterval(checkInbox, INBOX_POLL_MS);
    const timer = setTimeout(() => {
      // One last look before giving up.
      readInbox(since)
        .then(check, () => {})
        .finally(() => finish({ kind: 'timeout' }));
    }, timeoutMs);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort);
    void checkInbox();
  });
}
