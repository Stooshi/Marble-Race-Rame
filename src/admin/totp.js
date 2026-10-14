'use strict';

/**
 * The admin 2-step login: time-based one-time codes (RFC 6238, as Google
 * Authenticator, Microsoft Authenticator, 1Password… make them): 6 digits, a new
 * one every 30 seconds, from a secret shared once through a QR code.
 *
 * The secret is stored encrypted (AES-256-GCM) with a key from ADMIN_2FA_KEY, or
 * derived from JWT_SECRET when that isn't set.
 */
const crypto = require('crypto');
const config = require('../config');

const STEP_S = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(buf) {
  let bits = 0; let value = 0; let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
function unbase32(text) {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0; let value = 0; const out = [];
  for (const c of clean) {
    value = (value << 5) | ALPHABET.indexOf(c); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

const newSecret = () => base32(crypto.randomBytes(20));

/** The code for a time step. */
function codeAt(secret, step) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', unbase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** DIGITS).padStart(DIGITS, '0');
}

const stepNow = (ms = Date.now()) => Math.floor(ms / 1000 / STEP_S);

/**
 * Checks a code (the current step, or one either side for a slow clock). → the
 * step it matched, or null. A step already used (lastStep) never matches again.
 */
function verify(secret, code, { lastStep = null, now = Date.now() } = {}) {
  const c = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const at = stepNow(now);
  for (const s of [at - 1, at, at + 1]) {
    if (lastStep !== null && s <= lastStep) continue;
    const want = codeAt(secret, s);
    if (crypto.timingSafeEqual(Buffer.from(want), Buffer.from(c))) return s;
  }
  return null;
}

/** otpauth:// link for the QR code. */
const otpauthUrl = (secret, account, issuer = 'Marble Spins admin') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_S}`;

function key() {
  const raw = process.env.ADMIN_2FA_KEY || config.auth.jwtSecret;
  return crypto.createHash('sha256').update(`admin-2fa:${raw}`).digest();
}
function encrypt(secret) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(secret, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}
function decrypt(enc) {
  const [iv, tag, data] = enc.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}

module.exports = { newSecret, codeAt, verify, stepNow, otpauthUrl, encrypt, decrypt, base32, unbase32, STEP_S };
