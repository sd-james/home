// Run with `npm test`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findCodeReply, isSameNumber, parseExpiry, parseReply } from './codeReply';

const EXAMPLE = 'Les Maisons TAP code 61359 valid for 9 uses till 2026-10-04 23:59:59';

describe('parseReply', () => {
  it('reads the estate example', () => {
    const r = parseReply(EXAMPLE);
    assert.ok(r);
    assert.equal(r.code, '61359');
    assert.equal(r.uses, 9);
    assert.equal(r.expiryText, '2026-10-04 23:59:59');
    assert.equal(r.expiresAt, new Date(2026, 9, 4, 23, 59, 59).toISOString());
  });

  it('copes with case, extra spaces and line breaks', () => {
    const r = parseReply('les maisons  TAP CODE:\n 04821 valid for 1 use\nTILL 2026-1-5 7:05');
    assert.ok(r);
    assert.equal(r.code, '04821');
    assert.equal(r.uses, 1);
    assert.equal(r.expiresAt, new Date(2026, 0, 5, 7, 5, 0).toISOString());
  });

  it('accepts other wording for uses and expiry', () => {
    const r = parseReply('Your gate code is 778899 for 2 entries, expires 2026-12-31');
    assert.ok(r);
    assert.equal(r.code, '778899');
    assert.equal(r.uses, 2);
    // A date without a time lasts until the end of that day.
    assert.equal(r.expiresAt, new Date(2026, 11, 31, 23, 59, 59).toISOString());
  });

  it('finds a code without the word "code" and ignores the date digits', () => {
    const r = parseReply('Les Maisons TAP 5512 valid till 2026-10-04 23:59:59');
    assert.ok(r);
    assert.equal(r.code, '5512');
    assert.equal(r.uses, null);
  });

  it('keeps the code when the expiry is missing', () => {
    const r = parseReply('Les Maisons TAP code 61359 valid for 9 uses');
    assert.ok(r);
    assert.equal(r.code, '61359');
    assert.equal(r.expiresAt, null);
  });

  it('returns null when there is no code', () => {
    assert.equal(parseReply('Invalid request. Send TAP followed by a number.'), null);
    assert.equal(parseReply(''), null);
  });
});

describe('parseExpiry', () => {
  it('rejects text that is not a date', () => {
    assert.equal(parseExpiry('tomorrow'), null);
  });
});

describe('isSameNumber', () => {
  it('matches local, international and spaced forms', () => {
    for (const n of ['0637127256', '+27637127256', '063 712 7256', '0027 63 712 7256', '+27 (63) 712-7256']) {
      assert.ok(isSameNumber(n, '0637127256'), n);
    }
  });

  it('does not match other numbers or sender names', () => {
    assert.ok(!isSameNumber('0637127257', '0637127256'));
    assert.ok(!isSameNumber('LesMaisons', '0637127256'));
    assert.ok(!isSameNumber('12345', '0637127256'));
  });
});

describe('findCodeReply', () => {
  const sent = Date.parse('2026-10-04T10:00:00Z');

  it('picks the newest code reply from the estate after the request', () => {
    const r = findCodeReply(
      [
        { from: '+27637127256', body: 'Les Maisons TAP code 11111 valid for 1 uses till 2026-10-03 23:59:59', timestamp: sent - 3_600_000 },
        { from: '+27831234567', body: 'code 99999', timestamp: sent + 1000 },
        { from: '+27637127256', body: 'Please wait', timestamp: sent + 2000 },
        { from: '+27637127256', body: EXAMPLE, timestamp: sent + 5000 },
      ],
      '0637127256',
      sent
    );
    assert.ok(r);
    assert.equal(r.code, '61359');
  });

  it('returns null when only old or unrelated messages exist', () => {
    const r = findCodeReply(
      [
        { from: '0637127256', body: EXAMPLE, timestamp: sent - 1 },
        { from: '0831234567', body: EXAMPLE, timestamp: sent + 1 },
      ],
      '0637127256',
      sent
    );
    assert.equal(r, null);
  });
});
