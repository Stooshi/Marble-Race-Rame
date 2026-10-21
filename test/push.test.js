'use strict';

// Push notifications (Moses, 21 Oct 2026; app plan step 5; src/push), against a real database:
//   - switched off: the apps don't ask (client/src/shared/push.json), the server only dry-runs until
//     PUSH_SENDING=on and the Firebase/Apple keys are set;
//   - season news (pass on sale, season start) is marketing: off until turned on, never for guests or
//     under-13s; friend room invites on; the daily goal reminder off;
//   - each message once per key; dead tokens are dropped; invites only to room friends;
//   - Firebase (HTTP v1, service-account JWT) and Apple (HTTP/2, ES256 token) requests are right.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

const push = require('../src/push');
const transports = require('../src/push/transports');
const settings = require('../client/src/shared/push.json');

test('off in the repository; the messages; who may get marketing', () => {
  assert.equal(settings.enabled, false);
  delete process.env.PUSH_SENDING;
  assert.equal(push.sendingOn(), false);
  const season = { key: 'holiday-2026', name: 'Holiday Season 2026', pass_name: 'Holiday Season Pass 2026', starts_at: '2026-11-30T23:00:00Z' };
  assert.deepEqual(push.MESSAGES['pass-sale']({ season }).url, '/pass?season=holiday-2026');
  assert.match(push.MESSAGES['pass-sale']({ season }).body, /1 December/);
  assert.equal(push.MESSAGES['room-invite']({ host: 'Nova', code: 'ABC234' }).url, '/r/ABC234');
  assert.match(push.MESSAGES['daily-goal']({ left: 1 }).body, /^1 more race today/);
  assert.deepEqual([...push.MARKETING].sort(), ['pass-sale', 'season-start']);
  assert.equal(push.marketingAllowed({ is_guest: true, age_group: '18+' }), false);
  assert.equal(push.marketingAllowed({ is_guest: false, age_group: 'under-13' }), false);
  assert.equal(push.marketingAllowed({ is_guest: false, age_group: '13-17' }), true);
});

test('Firebase: a signed service-account sign-in, then the HTTP v1 message; a dead token is "gone"', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.FCM_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'marble-spins', client_email: 'push@marble-spins.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  const calls = [];
  transports.setNetwork({ fetch: async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'at', expires_in: 3600 }) };
    if (JSON.parse(opts.body).message.token === 'dead') return { ok: false, status: 404, json: async () => ({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }) };
    return { ok: true, json: async () => ({ name: 'projects/x/messages/1' }) };
  } });
  const msg = { ...push.MESSAGES['room-invite']({ host: 'Nova', code: 'ABC234' }), kind: 'room-invite' };
  assert.deepEqual(await transports.send({ platform: 'android', token: 'tok-android' }, msg), { ok: true });
  const sent = calls.find((c) => c.url.includes('fcm.googleapis.com'));
  assert.equal(sent.url, 'https://fcm.googleapis.com/v1/projects/marble-spins/messages:send');
  assert.equal(sent.opts.headers.authorization, 'Bearer at');
  const m = JSON.parse(sent.opts.body).message;
  assert.equal(m.token, 'tok-android');
  assert.equal(m.data.url, '/r/ABC234');
  assert.equal(m.android.notification.channel_id, 'friends');
  const jwt = new URLSearchParams(calls[0].opts.body).get('assertion').split('.');
  assert.equal(JSON.parse(Buffer.from(jwt[1], 'base64url')).scope, 'https://www.googleapis.com/auth/firebase.messaging');
  assert.equal((await transports.send({ platform: 'android', token: 'dead' }, msg)).gone, true);
  delete process.env.FCM_SERVICE_ACCOUNT;
});

test('Apple: HTTP/2 to the right host with an ES256 token; the test app goes to the sandbox', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  process.env.APNS_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
  process.env.APNS_KEY_ID = 'KEY123';
  process.env.APNS_TEAM_ID = 'TEAM456';
  const seen = [];
  transports.setNetwork({ connect: (host) => {
    const client = new EventEmitter();
    client.close = () => {};
    client.request = (headers) => {
      const req = new EventEmitter();
      req.end = (body) => {
        seen.push({ host, headers, body: JSON.parse(body) });
        setImmediate(() => {
          const dead = headers[':path'].endsWith('/dead');
          req.emit('response', { ':status': dead ? 410 : 200 });
          if (dead) req.emit('data', JSON.stringify({ reason: 'Unregistered' }));
          req.emit('end');
        });
      };
      return req;
    };
    return client;
  } });
  const msg = { ...push.MESSAGES['daily-goal']({ left: 2 }), kind: 'daily-goal' };
  assert.deepEqual(await transports.send({ platform: 'ios', token: 'abc', app_id: 'com.marblespins.app' }, msg), { ok: true });
  assert.deepEqual(await transports.send({ platform: 'ios', token: 'abc', app_id: 'com.marblespins.app.dev' }, msg), { ok: true });
  assert.equal((await transports.send({ platform: 'ios', token: 'dead', app_id: 'com.marblespins.app' }, msg)).gone, true);
  assert.equal(seen[0].host, 'https://api.push.apple.com');
  assert.equal(seen[1].host, 'https://api.sandbox.push.apple.com');
  assert.equal(seen[0].headers['apns-topic'], 'com.marblespins.app');
  assert.equal(seen[0].headers['apns-push-type'], 'alert');
  assert.equal(seen[0].body.url, '/home');
  const [h, c, s] = seen[0].headers.authorization.replace('bearer ', '').split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'ES256', kid: 'KEY123' });
  assert.equal(JSON.parse(Buffer.from(c, 'base64url')).iss, 'TEAM456');
  assert.ok(crypto.verify('SHA256', Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
  for (const k of ['APNS_KEY', 'APNS_KEY_ID', 'APNS_TEAM_ID']) delete process.env[k];
});

test('push on a real database: switches, devices, dry run, once per key, dead tokens, season news audience, invites', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const seasons = require('../src/seasons');
  const account = require('../src/account');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const sent = [];
  transports.setTransport((device, msg) => { sent.push({ device, msg }); return device.token.startsWith('dead') ? { ok: false, gone: true, error: 'Unregistered' } : { ok: true }; });
  try {
    const reg = async (n, age = 1990) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', birth_year: age, birth_month: 5 } })).body;
    const name = `t_push_${run}`;
    const nova = await reg(`${name}a`);
    const teen = await reg(`${name}b`, new Date().getFullYear() - 15);
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;

    // Defaults: invites on, season news off, daily goal off; a guest can't turn season news on.
    let s = (await call('/push/settings', { token: nova.token })).body;
    assert.deepEqual({ ...s, devices: undefined }, { roomInvites: true, seasonNews: false, dailyGoal: false, seasonNewsAllowed: true, devices: undefined, sending: false });
    s = (await call('/push/settings', { method: 'PUT', token: guest.token, body: { seasonNews: true, dailyGoal: true } })).body;
    assert.equal(s.seasonNews, false);
    assert.equal(s.seasonNewsAllowed, false);
    assert.equal(s.dailyGoal, true);
    assert.equal((await call('/push/settings', { method: 'PUT', token: nova.token, body: { seasonNews: true } })).body.seasonNews, true);
    assert.equal((await call('/push/settings', { method: 'PUT', token: teen.token, body: { seasonNews: true } })).body.seasonNews, true);

    // Devices: a token belongs to whoever logged in on that phone last.
    const tok = (k) => `${k}-${run}-${'x'.repeat(30)}`;
    assert.equal((await call('/push/devices', { method: 'POST', token: nova.token, body: { token: tok('ios'), platform: 'ios', appId: 'com.marblespins.app', appVersion: '1.0.0' } })).status, 204);
    assert.equal((await call('/push/devices', { method: 'POST', token: nova.token, body: { token: tok('dead'), platform: 'android' } })).status, 204);
    assert.equal((await call('/push/devices', { method: 'POST', token: guest.token, body: { token: tok('guest'), platform: 'android' } })).status, 204);
    assert.equal((await call('/push/devices', { method: 'POST', token: teen.token, body: { token: tok('teen'), platform: 'android' } })).status, 204);
    assert.equal((await call('/push/devices', { method: 'POST', token: nova.token, body: { token: 'short', platform: 'android' } })).status, 400);

    // Off (no PUSH_SENDING): a dry run, nothing recorded, nothing sent.
    delete process.env.PUSH_SENDING;
    const dry = await push.sendTo(db, nova.user.id, 'daily-goal', { left: 2 }, `t:${run}`);
    assert.equal(dry.why, 'switched-off'); // (her daily goal switch is off)
    await call('/push/settings', { method: 'PUT', token: nova.token, body: { dailyGoal: true } });
    assert.equal((await push.sendTo(db, nova.user.id, 'daily-goal', { left: 2 }, `t:${run}`)).dryRun, true);
    assert.equal(sent.length, 0);

    // On: sent once per key; the dead token is switched off.
    process.env.PUSH_SENDING = 'on';
    const r1 = await push.sendTo(db, nova.user.id, 'daily-goal', { left: 2 }, `t:${run}`);
    assert.deepEqual({ sent: r1.sent, devices: r1.devices, delivered: r1.delivered }, { sent: true, devices: 2, delivered: 1 });
    assert.equal((await push.sendTo(db, nova.user.id, 'daily-goal', { left: 2 }, `t:${run}`)).why, 'already-sent');
    assert.ok((await db.query('SELECT disabled_at FROM push_devices WHERE token = $1', [tok('dead')])).rows[0].disabled_at);

    // Season news: to saved accounts that turned it on; never guests, never under-13 (even if stored on).
    await db.query(`UPDATE push_preferences SET season_news = true WHERE user_id = $1`, [guest.user.id]);
    assert.equal((await push.sendTo(db, guest.user.id, 'season-start', { season: { key: 'x', name: 'X' } }, `x:${run}`)).why, 'marketing-not-allowed');
    const key = `test-push-${run}`;
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Push Season', now() + interval '3 days', now() + interval '12 days', now() + interval '12 days', $2, 'Push Season Pass', 999, now() - interval '1 hour', now() + interval '12 days')`,
      [key, `ppass-${run}`],
    );
    seasons.forget();
    sent.length = 0;
    await push.seasonNews(db);
    const got = sent.filter((x) => x.msg.kind === 'pass-sale' && x.msg.url === `/pass?season=${key}`).map((x) => x.device.token);
    assert.ok(got.includes(tok('ios')));
    assert.ok(got.includes(tok('teen')));
    assert.ok(!got.includes(tok('guest')));
    await db.query(`UPDATE users SET age_group = 'under-13' WHERE id = $1`, [teen.user.id]);
    sent.length = 0;
    await push.seasonNews(db);
    assert.equal(sent.length, 0, 'once per key');
    assert.equal((await push.sendTo(db, teen.user.id, 'season-start', { season: { key, name: 'Push Season' } }, `season-start:${key}:again`)).why, 'marketing-not-allowed');

    // Room invites: only from a host to someone who raced in a friend room with them (route off while push is off).
    const room = (await call('/rooms', { method: 'POST', token: nova.token, body: {} })).body;
    const code = room.code ?? room.room?.code;
    assert.equal((await call(`/rooms/${code}/invite`, { method: 'POST', token: nova.token, body: { user_id: teen.user.id } })).status, 404);
    settings.enabled = true;
    try {
      assert.equal((await call(`/rooms/${code}/invite`, { method: 'POST', token: nova.token, body: { user_id: teen.user.id } })).status, 403);
      assert.equal((await call(`/rooms/${code}/invitable`, { token: teen.token })).status, 403); // (not the host)
      // They raced together in a room race.
      const { rows: [race] } = await db.query('SELECT current_race_id AS id FROM rooms WHERE code = $1', [code]);
      const { rows: [m] } = await db.query('SELECT id FROM marbles WHERE owner_id = $1 LIMIT 1', [teen.user.id]);
      await db.query('INSERT INTO race_entries (race_id, user_id, marble_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [race.id, teen.user.id, m.id]);
      const friends = (await call(`/rooms/${code}/invitable`, { token: nova.token })).body;
      assert.equal(friends.pushOn, true);
      assert.deepEqual(friends.friends.map((f) => f.userId), [teen.user.id]);
      sent.length = 0;
      assert.equal((await call(`/rooms/${code}/invite`, { method: 'POST', token: nova.token, body: { user_id: teen.user.id } })).status, 200);
      assert.equal(sent.length, 1);
      assert.equal(sent[0].msg.url, `/r/${code}`);
      assert.match(sent[0].msg.title, /invites you to race/);
      await call(`/rooms/${code}/invite`, { method: 'POST', token: nova.token, body: { user_id: teen.user.id } });
      assert.equal(sent.length, 1, 'once per 10 minutes');
    } finally {
      settings.enabled = false;
    }

    // The data download has the switches; deleting the account removes tokens and switches.
    const data = (await call('/users/me/export', { token: nova.token })).body;
    assert.equal(data.pushNotifications.switches.daily_goal, true);
    assert.equal(data.pushNotifications.devices.length, 2);
    assert.ok(!JSON.stringify(data).includes(tok('ios')));
    await db.withTransaction((client) => account.deleteAccount(client, nova.user.id, { by: 'player' }));
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM push_devices WHERE user_id = $1', [nova.user.id])).rows[0].n, 0);
    assert.equal((await call('/push/devices/forget', { method: 'POST', token: teen.token, body: { token: tok('teen') } })).status, 204);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM push_devices WHERE token = $1', [tok('teen')])).rows[0].n, 0);
  } finally {
    delete process.env.PUSH_SENDING;
    transports.setTransport(null);
    server.close();
    await db.pool?.end?.();
  }
});
