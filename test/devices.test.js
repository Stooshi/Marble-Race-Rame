'use strict';

// Players' devices and browsers (Moses, 20 Nov 2026; src/devices): coarse fields from the user agent, never the
// string itself; the last 5 per player; the Players report's filter and the Dashboard's breakdown. The parser
// always; the flow against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const devices = require('../src/devices');

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphone26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  androidApp: 'Mozilla/5.0 (Linux; Android 14; SM-A125F Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  tiktok: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 trill_370104 BytedanceWebview/d8a21c6',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  chromebook: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  bot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};
const p = (ua, o) => devices.parse(UA[ua], o);
const brief = (d) => d && `${d.device} | ${devices.label(d.os, d.osVersion)} | ${devices.label(d.browser, d.browserVersion)} | ${d.client}`;

test('the user agent gives coarse fields only', () => {
  assert.equal(brief(p('iphone')), 'phone | iOS 18 | Safari 18 | web');
  assert.equal(brief(p('iphone26')), 'phone | iOS 26 | Safari 26 | web'); // (iOS 26 still says "OS 18_6")
  assert.equal(brief(p('iphoneApp', { origin: 'capacitor://localhost' })), 'phone | iOS 18 | WebView | ios-app');
  assert.equal(brief(p('ipadDesktop', { hint: 'touch=1' })), 'tablet | iPadOS 18 | Safari 18 | web');
  assert.equal(brief(p('macSafari')), 'computer | macOS | Safari 18 | web');
  assert.equal(brief(p('macSafari', { hint: 'osv=15' })), 'computer | macOS 15 | Safari 18 | web');
  assert.equal(brief(p('androidChrome')), 'phone | Android | Chrome 131 | web'); // (Chrome's frozen "Android 10; K")
  assert.equal(brief(p('androidChrome', { hint: 'osv=14' })), 'phone | Android 14 | Chrome 131 | web');
  assert.equal(brief(p('androidApp', { origin: 'https://localhost' })), 'phone | Android 14 | WebView 131 | android-app');
  assert.equal(brief(p('androidTablet')), 'tablet | Android 13 | Chrome 130 | web');
  assert.equal(brief(p('samsung')), 'phone | Android 14 | Samsung Internet 27 | web');
  assert.equal(brief(p('tiktok')), 'phone | Android 14 | TikTok | web');
  assert.equal(brief(p('windowsChrome')), 'computer | Windows | Chrome 131 | web'); // (10 or 11: only the hint tells)
  assert.equal(brief(p('windowsChrome', { hint: 'osv=15' })), 'computer | Windows 11 | Chrome 131 | web');
  assert.equal(brief(p('windowsEdge', { hint: 'osv=10' })), 'computer | Windows 10 | Edge 131 | web');
  assert.equal(brief(p('windowsFirefox')), 'computer | Windows | Firefox 133 | web');
  assert.equal(brief(p('chromebook')), 'computer | ChromeOS | Chrome 131 | web');
  assert.equal(p('bot'), null);
  assert.equal(devices.parse(''), null);
  // Only the coarse fields come back: nothing of the string itself (the phone's model, the build).
  assert.deepEqual(Object.keys(p('androidApp')).sort(), ['browser', 'browserVersion', 'client', 'device', 'os', 'osVersion']);
  assert.doesNotMatch(JSON.stringify(p('androidApp')), /SM-A125F|UP1A/);
  // A hint is read for its two values only.
  assert.equal(brief(p('androidChrome', { hint: 'osv=99999;touch=maybe;model=SM-A125F' })), 'phone | Android | Chrome 131 | web');
});

test('the Players report filter takes known values only', () => {
  assert.deepEqual(devices.filterSql({ device: 'phone', client: 'android-app', os: 'Android', browser: 'Chrome' }, 3),
    ['dev.device_type = $3 AND dev.client = $4 AND dev.os_name = $5 AND dev.browser_name = $6', ['phone', 'android-app', 'Android', 'Chrome']]);
  assert.deepEqual(devices.filterSql({ device: 'fridge', client: 'x', os: "'; DROP", browser: '' }), ['', []]);
});

test('on a real database: recorded at login, last 5 kept, the filter and the breakdown', { skip: !DB }, async () => {
  const db = require('../src/db');
  const req = (ua, origin = '', hint = '') => ({ get: (h) => ({ 'user-agent': UA[ua], origin, 'x-client-device': hint })[h.toLowerCase()] });
  const name = `t_dev_${Date.now() % 1e6}`;
  const { rows: [u] } = await db.query(`INSERT INTO users (username, email, password_hash, is_guest) VALUES ($1, $2, 'x', false) RETURNING id`, [name, `${name}@test.invalid`]);
  try {
    await devices.seen(db, u.id, req('androidApp', 'https://localhost'));
    await devices.seen(db, u.id, req('androidApp', 'https://localhost')); // (the same again: one row)
    assert.equal((await devices.ofPlayer(db, u.id)).length, 1);
    for (const ua of ['iphone', 'windowsChrome', 'macSafari', 'samsung', 'chromebook']) {
      await db.query(`UPDATE user_devices SET last_seen_at = last_seen_at - interval '1 hour' WHERE user_id = $1`, [u.id]);
      await devices.seen(db, u.id, req(ua));
    }
    const list = await devices.ofPlayer(db, u.id);
    assert.equal(list.length, devices.HISTORY); // (6 seen, the oldest dropped)
    assert.equal(list[0].os, 'ChromeOS');
    assert.ok(!list.some((d) => d.clientLabel === 'Android app'));
    assert.equal(await devices.seen(db, u.id, req('bot')), null);
    const { rows: [n] } = await db.query('SELECT count(*)::int AS n FROM user_devices WHERE user_id = $1', [u.id]);
    assert.equal(n.n, devices.HISTORY);
    // The latest device filters the list.
    const [where, params] = devices.filterSql({ os: 'ChromeOS' }, 2);
    const { rows: hits } = await db.query(`SELECT u.id FROM users u ${devices.LATEST} WHERE u.id = $1 AND ${where}`, [u.id, ...params]);
    assert.equal(hits.length, 1);
    const b = await devices.breakdown(db, { days: 30 });
    assert.ok(b.players >= 1);
    assert.ok(b.os.some((r) => r.key === 'ChromeOS'));
    // Deleting the account deletes its devices.
    await db.withTransaction((c) => require('../src/account').deleteAccount(c, u.id, { by: 'player' }));
    assert.equal((await devices.ofPlayer(db, u.id)).length, 0);
  } finally {
    await db.query('DELETE FROM users WHERE id = $1', [u.id]).catch(() => {});
    await db.pool?.end?.();
  }
});
