'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { VERSION, codeFingerprint } = require('../src/version');

test('/health version names the solid-marbles simulator and a code fingerprint', () => {
  assert.equal(VERSION.simulator, 'solid-marbles-1');
  assert.match(VERSION.codeFingerprint, /^[0-9a-f]{12}$/);
  assert.equal(codeFingerprint(), VERSION.codeFingerprint, 'stable for the same code');
});

test('the code fingerprint changes when the code changes, and ignores Windows line endings', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-'));
  fs.mkdirSync(path.join(dir, 'game'));
  fs.writeFileSync(path.join(dir, 'game', 'a.js'), 'one\ntwo\n');
  const first = codeFingerprint(dir);
  fs.writeFileSync(path.join(dir, 'game', 'a.js'), 'one\r\ntwo\r\n');
  assert.equal(codeFingerprint(dir), first);
  fs.writeFileSync(path.join(dir, 'game', 'a.js'), 'one\ntwo!\n');
  assert.notEqual(codeFingerprint(dir), first);
  fs.rmSync(dir, { recursive: true });
});
