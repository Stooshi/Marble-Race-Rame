'use strict';

/**
 * Checks a server address before anything is switched to it (api.marblespins.com, or a new host):
 * the name resolves, the certificate is valid for it, and the game server answers there exactly as
 * at the address in use now: the same code, the website's and the apps' calls allowed (CORS), the
 * live connection (socket.io), and the three payment notification addresses reachable (each refuses
 * an empty, unsigned call the way it should: reachable, nothing done). Reads only; changes nothing.
 *
 *   node scripts/check-api-address.js [https://api.marblespins.com] [--against https://…up.railway.app]
 *
 * Exits 1 when a check fails.
 */
const dns = require('node:dns').promises;
const tls = require('node:tls');
const path = require('node:path');

const addresses = require(path.join(__dirname, '..', 'client', 'app-api.json'));
const args = process.argv.slice(2);
const against = (args.includes('--against') ? args[args.indexOf('--against') + 1] : addresses.fallback).replace(/\/+$/, '');
const target = (args.find((a) => /^https?:\/\//.test(a) && a !== against) ?? addresses.planned).replace(/\/+$/, '');
const local = target.startsWith('http://'); // (a local server, for trying the check: no name or certificate to check)
const host = new URL(target).hostname;
const TIMEOUT = 15000;

const results = [];
const check = async (what, fn) => {
  try {
    const detail = await fn();
    results.push({ what, pass: true, detail });
  } catch (err) {
    results.push({ what, pass: false, detail: err.message });
  }
};
const call = (url, options = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT), ...options });
const expect = (cond, message) => { if (!cond) throw new Error(message); };

async function main() {
  console.log(`Checking ${target} (against ${against})\n`);
  if (!local) await check('The name resolves', async () => {
    const cname = await dns.resolveCname(host).catch(() => []);
    const { address } = await dns.lookup(host);
    return cname.length ? `CNAME ${cname.join(', ')} → ${address}` : address;
  });
  if (!local) await check('A valid certificate for the name', () => new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: TIMEOUT }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!socket.authorized) return reject(new Error(`not trusted: ${socket.authorizationError}`));
      const days = Math.round((new Date(cert.valid_to) - Date.now()) / 86400000);
      return resolve(`${cert.subject?.CN ?? '?'}, by ${cert.issuer?.O ?? cert.issuer?.CN ?? '?'}, ${days} days left`);
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('timed out')); });
  }));
  let here = null;
  await check('GET /health: the server and its database answer', async () => {
    const res = await call(`${target}/health`);
    here = await res.json();
    expect(res.ok && here.status === 'ok' && here.db === 'ok', `${res.status} ${JSON.stringify(here)}`);
    return `code ${here.version?.codeFingerprint}`;
  });
  await check(`The same server as ${against} (same code)`, async () => {
    const there = await (await call(`${against}/health`)).json();
    expect(here && there.version?.codeFingerprint === here.version?.codeFingerprint, `${here?.version?.codeFingerprint} here, ${there.version?.codeFingerprint} there`);
    return 'same code fingerprint';
  });
  await check('GET /api/tracks: the track list', async () => {
    const res = await call(`${target}/api/tracks`);
    expect(res.ok, `${res.status}`);
    const body = await res.json();
    const n = Array.isArray(body) ? body.length : (body.tracks ?? []).length;
    return `${n} tracks`;
  });
  for (const origin of ['https://marblespins.com', 'https://www.marblespins.com', 'capacitor://localhost', 'https://localhost']) {
    await check(`CORS: calls from ${origin} allowed`, async () => {
      const res = await call(`${target}/api/tracks`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } });
      const allowed = res.headers.get('access-control-allow-origin');
      expect(allowed === origin || allowed === '*', `allow-origin: ${allowed}`);
      return allowed;
    });
  }
  await check('The live connection (socket.io) opens', async () => {
    const res = await call(`${target}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://marblespins.com' } });
    const text = await res.text();
    expect(res.ok && text.startsWith('0{'), `${res.status} ${text.slice(0, 80)}`);
    return 'handshake ok';
  });
  await check('Stripe webhook reachable (an unsigned call is refused, 400)', async () => {
    const res = await call(`${target}/api/payments/stripe/webhook`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    expect(res.status === 400, res.status === 503 ? '503: Stripe is not set up on this server (STRIPE_WEBHOOK_SECRET)' : `${res.status}`);
    return '400';
  });
  await check('Google Play notifications reachable (no token: refused, 403)', async () => {
    const res = await call(`${target}/api/payments/google/rtdn`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    expect(res.status === 403, `${res.status}`);
    return '403';
  });
  await check('App Store notifications reachable (nothing signed: refused, 400)', async () => {
    const res = await call(`${target}/api/payments/apple/notifications`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    expect(res.status === 400, `${res.status}`);
    return '400';
  });

  for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'}  ${r.what}${r.detail ? ` (${r.detail})` : ''}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(failed ? `\n${failed} of ${results.length} checks failed: don't switch yet.` : `\nAll ${results.length} checks pass: ${target} is ready.`);
  if (failed) process.exitCode = 1;
}

main();
