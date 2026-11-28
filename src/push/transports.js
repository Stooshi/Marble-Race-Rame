'use strict';

/**
 * Sending one push to one phone, with no extra libraries:
 *   - Android: Firebase Cloud Messaging, HTTP v1 API, signed in as the Firebase project's service
 *     account (FCM_SERVICE_ACCOUNT: its JSON key, or that JSON in base64; a signed JWT exchanged for
 *     an access token, like src/payments/google.js);
 *   - iPhone: Apple Push Notification service over HTTP/2 with a token key (APNS_KEY: the .p8 key's
 *     text, or base64 of it; APNS_KEY_ID; APNS_TEAM_ID). The store app (com.marblespins.app) goes to
 *     api.push.apple.com, the test app (com.marblespins.app.dev) to the sandbox.
 * → { ok: true } | { ok: false, gone: true } (the token is dead: uninstalled, logged out) | { ok: false, error }.
 */
const crypto = require('crypto');
const http2 = require('http2');

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const readKey = (raw) => {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.includes('BEGIN') ? v.replace(/\\n/g, '\n') : Buffer.from(v, 'base64').toString('utf8');
};

// ── Firebase (Android) ────────────────────────────────────────────────────

let fetchImpl = (...args) => fetch(...args);
let fcmToken = null;

function fcmAccount() {
  const raw = (process.env.FCM_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    const acc = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    return acc.client_email && acc.private_key && acc.project_id ? acc : null;
  } catch {
    console.error('[push] FCM_SERVICE_ACCOUNT is not a Firebase service account JSON key');
    return null;
  }
}

async function fcmAccess(acc) {
  if (fcmToken && fcmToken.until > Date.now() + 60_000) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const aud = acc.token_uri || 'https://oauth2.googleapis.com/token';
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: acc.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud, iat: now, exp: now + 3600 }));
  const sig = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${head}.${claims}`), acc.private_key));
  const res = await fetchImpl(aud, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${sig}` }).toString() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Firebase sign-in failed (${res.status} ${body.error ?? ''})`);
  fcmToken = { value: body.access_token, until: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return fcmToken.value;
}

async function sendAndroid(device, msg) {
  const acc = fcmAccount();
  if (!acc) return { ok: false, error: 'not-configured' };
  const access = await fcmAccess(acc);
  const res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${access}` },
    body: JSON.stringify({
      message: {
        token: device.token,
        notification: { title: msg.title, body: msg.body },
        data: { url: msg.url || '/', kind: msg.kind },
        android: { priority: msg.urgent ? 'HIGH' : 'NORMAL', ttl: `${msg.ttlSeconds ?? 86400}s`, notification: { channel_id: msg.channel, icon: 'ic_stat_marble', color: '#FFD21F', tag: msg.collapse || undefined } },
      },
    }),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.details?.find?.((d) => d.errorCode)?.errorCode || body?.error?.status;
  if (res.status === 404 || code === 'UNREGISTERED') return { ok: false, gone: true, error: code || String(res.status) };
  return { ok: false, error: `${res.status} ${code ?? ''}`.trim() };
}

// ── Apple (iPhone) ────────────────────────────────────────────────────────

let apnsJwt = null;
let http2Connect = (url) => http2.connect(url);

const apnsConfigured = () => Boolean(readKey(process.env.APNS_KEY) && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);

function apnsToken() {
  // (Apple wants a new token at most every 20 minutes and at least every 60.)
  if (apnsJwt && apnsJwt.at > Date.now() - 40 * 60_000) return apnsJwt.value;
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: process.env.APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const sig = b64url(crypto.sign('SHA256', Buffer.from(`${head}.${claims}`), { key: readKey(process.env.APNS_KEY), dsaEncoding: 'ieee-p1363' }));
  apnsJwt = { value: `${head}.${claims}.${sig}`, at: Date.now() };
  return apnsJwt.value;
}

function sendIos(device, msg) {
  if (!apnsConfigured()) return Promise.resolve({ ok: false, error: 'not-configured' });
  const topic = device.app_id || process.env.APNS_BUNDLE_ID || 'com.marblespins.app';
  const host = /\.dev$/.test(topic) ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const payload = JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: 'default', 'thread-id': msg.channel }, url: msg.url || '/', kind: msg.kind });
  return new Promise((resolve) => {
    let client;
    try { client = http2Connect(host); } catch (e) { resolve({ ok: false, error: e.message }); return; }
    client.on('error', (e) => resolve({ ok: false, error: e.message }));
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${device.token}`,
      authorization: `bearer ${apnsToken()}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': msg.urgent ? '10' : '5',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + (msg.ttlSeconds ?? 86400)),
      ...(msg.collapse && { 'apns-collapse-id': msg.collapse }),
      'content-type': 'application/json',
    });
    let status = 0;
    let data = '';
    req.on('response', (h) => { status = h[':status']; });
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      client.close();
      if (status === 200) { resolve({ ok: true }); return; }
      let reason = '';
      try { reason = JSON.parse(data).reason || ''; } catch { /* (no body) */ }
      resolve(status === 410 || ['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'].includes(reason) ? { ok: false, gone: true, error: reason || '410' } : { ok: false, error: `${status} ${reason}`.trim() });
    });
    req.on('error', (e) => { client.close(); resolve({ ok: false, error: e.message }); });
    req.end(payload);
  });
}

/** Which stores can be sent to now. */
const configured = () => ({ android: Boolean(fcmAccount()), ios: apnsConfigured() });

let override = null;
/** Tests: replace the sending (fn(device, msg) → result), or null to restore. */
function setTransport(fn) { override = fn; }
/** Tests: fake fetch for Firebase and fake HTTP/2 for Apple. */
function setNetwork({ fetch: f, connect } = {}) { if (f) fetchImpl = f; if (connect) http2Connect = connect; fcmToken = null; apnsJwt = null; }

function send(device, msg) {
  if (override) return Promise.resolve(override(device, msg));
  return device.platform === 'ios' ? sendIos(device, msg) : sendAndroid(device, msg);
}

module.exports = { send, configured, setTransport, setNetwork, readKey };
