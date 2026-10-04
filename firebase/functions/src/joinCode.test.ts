import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateJoinCode, normalizeJoinCode } from './joinCode.js';

test('generated codes look like ABC-DEF and normalize to themselves', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateJoinCode();
    assert.match(code, /^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    assert.equal(normalizeJoinCode(code), code);
  }
});

test('typed codes are forgiving about case, spaces and dashes', () => {
  assert.equal(normalizeJoinCode('k7m 4qx'), 'K7M-4QX');
  assert.equal(normalizeJoinCode(' K7M4QX '), 'K7M-4QX');
});

test('wrong length or confusable characters are rejected', () => {
  assert.equal(normalizeJoinCode('K7M-4Q'), null);
  assert.equal(normalizeJoinCode('O0I-1LS'), null);
});
