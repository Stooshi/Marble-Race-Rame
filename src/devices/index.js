'use strict';

/**
 * Each player's device and browser (Moses, 20 Nov 2026), for support and for finding bugs that hit certain devices.
 *
 * Worked out when a player starts playing or logs in (POST /api/auth/guest, /register, /claim, /login, and
 * GET /api/auth/me, which the website and the apps call when they open) from what the browser says about itself,
 * and kept as coarse fields only:
 *   device   phone | tablet | computer
 *   os       name and major version (Android 14, iOS 18, iPadOS 18, Windows 11, macOS 15, Linux, ChromeOS)
 *   browser  name and major version (Chrome 131, Safari 18, Firefox 133, Samsung Internet 27, TikTok, WebView 131 …)
 *   client   web | android-app | ios-app (the app's own address: capacitor://localhost or https://localhost)
 * Never the user-agent string itself, no cookie, nothing that tells one device from another of the same kind.
 *
 * Two optional hints from the website and the apps (header X-Client-Device, `osv=<major>;touch=1`): the operating
 * system's major version where the browser no longer puts it in its user agent (Chrome's frozen "Android 10" and
 * "Windows NT 10.0" for Windows 11; navigator.userAgentData), and whether a "Macintosh" has a touch screen (an iPad
 * asking for the desktop site). Both are coarse; nothing else of it is read.
 *
 * Kept per player: the last HISTORY combinations, each with when it was first and last seen (table user_devices);
 * the latest is the player's device now. Deleted with the account (src/account) and with a guest after 90 days.
 */

const HISTORY = 5;
const TOUCH_EVERY_MINUTES = 10; // (a combination already seen this recently isn't written again)

const BOT = /bot\b|crawler|spider|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|facebookexternalhit|slurp|python-requests|curl\/|wget|node-fetch|undici|axios/i;
const APP_ORIGINS = { 'capacitor://localhost': 'ios-app', 'https://localhost': 'android-app', 'http://localhost': 'android-app' };

/** In-app browsers first (they wrap Chrome or Safari and say so), then the browsers themselves. [name, pattern, version pattern?] */
const BROWSERS = [
  ['TikTok', /musical_ly|tiktok|bytedancewebview|trill_/i],
  ['Instagram', /Instagram/i, /Instagram (\d+)/],
  ['Facebook', /\bFBAN\b|\bFBAV\b|FB_IAB|FBIOS/i, /FBAV\/(\d+)/],
  ['Snapchat', /Snapchat/i, /Snapchat\/(\d+)/],
  ['Messenger', /Messenger/i],
  ['Samsung Internet', /SamsungBrowser/, /SamsungBrowser\/(\d+)/],
  ['Edge', /EdgA?\/|EdgiOS\/|Edg\//, /Edg(?:A|iOS)?\/(\d+)/],
  ['Opera', /OPR\/|OPiOS\//, /(?:OPR|OPiOS)\/(\d+)/],
  ['Firefox', /Firefox\/|FxiOS\//, /(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /CriOS\/|Chrome\//, /(?:CriOS|Chrome)\/(\d+)/],
  ['Safari', /Safari\/.*|Version\//, /Version\/(\d+)/],
];

const int = (v) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) && n > 0 && n < 1000 ? n : 0; };

/** The optional hint header: { osv, touch }. */
function hintsOf(value) {
  const out = { osv: 0, touch: false };
  for (const part of String(value ?? '').slice(0, 60).split(';')) {
    const [k, v] = part.split('=').map((s) => s.trim());
    if (k === 'osv') out.osv = int(v);
    if (k === 'touch') out.touch = v === '1';
  }
  return out;
}

/**
 * The coarse fields from a user agent, the request's Origin and the hint header.
 * → { device, os, osVersion, browser, browserVersion, client }, or null for a bot or no user agent.
 * (osVersion / browserVersion 0: not known.)
 */
function parse(userAgent, { origin = '', hint = '' } = {}) {
  const ua = String(userAgent ?? '').slice(0, 1000);
  if (!ua || BOT.test(ua)) return null;
  const h = hintsOf(hint);
  const client = APP_ORIGINS[String(origin ?? '').toLowerCase()] ?? 'web';

  // The operating system.
  let os = 'Other'; let osVersion = 0; let device = 'computer';
  const iosVer = ua.match(/(?:iPhone|CPU) OS (\d+)[_.]/);
  const safariVer = int(ua.match(/Version\/(\d+)/)?.[1]);
  const mac = /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
  if (/iPad/.test(ua) || (mac && (h.touch || client === 'ios-app'))) {
    os = 'iPadOS'; device = 'tablet';
    osVersion = int(iosVer?.[1]);
    if (mac || safariVer >= 26) osVersion = safariVer >= 13 ? safariVer : osVersion; // (desktop-mode iPad: Safari's version is the system's)
  } else if (/iPhone|iPod/.test(ua)) {
    os = 'iOS'; device = 'phone';
    osVersion = int(iosVer?.[1]);
    if (safariVer >= 26) osVersion = safariVer; // (iOS 26's Safari keeps saying "OS 18_6"; its Version is the system's)
  } else if (/Android/.test(ua)) {
    os = 'Android';
    device = /Mobile/.test(ua) ? 'phone' : 'tablet';
    osVersion = int(ua.match(/Android (\d+)/)?.[1]);
    if (/Android 10; K\)/.test(ua)) osVersion = h.osv || 0; // (Chrome's reduced user agent: always "Android 10; K")
  } else if (/Windows NT/.test(ua)) {
    os = 'Windows';
    const nt = ua.match(/Windows NT (\d+)\.(\d+)/);
    if (nt && nt[1] === '10') osVersion = h.osv ? (h.osv >= 13 ? 11 : 10) : 0; // (10.0 is both 10 and 11; the hint tells them apart)
    else if (nt) osVersion = { '6.3': 8, '6.2': 8, '6.1': 7 }[`${nt[1]}.${nt[2]}`] ?? 0;
  } else if (/CrOS/.test(ua)) {
    os = 'ChromeOS';
  } else if (mac) {
    os = 'macOS';
    osVersion = h.osv >= 11 ? h.osv : 0; // (every browser says 10_15_7 now)
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // The browser (in the apps: the system's web view).
  let browser = 'Other'; let browserVersion = 0;
  if (client !== 'web') {
    browser = 'WebView';
    browserVersion = int(ua.match(/Chrome\/(\d+)/)?.[1]); // (Android's WebView is Chrome's; the iPhone's has no number of its own)
  } else if (/; wv\)/.test(ua) && !BROWSERS.slice(0, 5).some(([, re]) => re.test(ua))) {
    browser = 'WebView';
    browserVersion = int(ua.match(/Chrome\/(\d+)/)?.[1]);
  } else {
    for (const [name, re, verRe] of BROWSERS) {
      if (!re.test(ua)) continue;
      if (name === 'Safari' && !/Safari\//.test(ua)) continue;
      browser = name;
      browserVersion = verRe ? int(ua.match(verRe)?.[1]) : 0;
      break;
    }
  }
  return { device, os, osVersion, browser, browserVersion, client };
}

/** The request's fields (null for a bot). */
const fromRequest = (req) => parse(req.get('user-agent'), { origin: req.get('origin'), hint: req.get('x-client-device') });

/** "Android 14", "Chrome 131", "Windows" (no version known). */
const label = (name, version) => (version ? `${name} ${version}` : name);
const CLIENTS = { web: 'Website', 'android-app': 'Android app', 'ios-app': 'iPhone app' };

/**
 * Records the request's device for the player: a new combination is added (and only the last HISTORY kept), a known
 * one gets its last-seen time. Never throws: a failure here never stops a login.
 */
async function seen(db, userId, req) {
  try {
    const d = fromRequest(req);
    if (!d || !userId) return null;
    const { rows: [r] } = await db.query(
      `INSERT INTO user_devices (user_id, device_type, os_name, os_version, browser_name, browser_version, client)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, device_type, os_name, os_version, browser_name, browser_version, client)
       DO UPDATE SET last_seen_at = now()
         WHERE user_devices.last_seen_at < now() - make_interval(mins => ${TOUCH_EVERY_MINUTES})
       RETURNING (xmax = 0) AS added`,
      [userId, d.device, d.os, d.osVersion, d.browser, d.browserVersion, d.client],
    );
    if (r?.added) {
      await db.query(
        `DELETE FROM user_devices WHERE user_id = $1 AND (device_type, os_name, os_version, browser_name, browser_version, client) NOT IN (
           SELECT device_type, os_name, os_version, browser_name, browser_version, client FROM user_devices
            WHERE user_id = $1 ORDER BY last_seen_at DESC LIMIT ${HISTORY})`,
        [userId],
      );
    }
    return d;
  } catch (err) {
    console.error('[devices]', err.message);
    return null;
  }
}

/** A stored row as the back office shows it. */
function shown(r) {
  if (!r) return null;
  return {
    device: r.device_type, os: label(r.os_name, r.os_version), browser: label(r.browser_name, r.browser_version),
    client: r.client, clientLabel: CLIENTS[r.client] ?? r.client, firstSeenAt: r.first_seen_at, lastSeenAt: r.last_seen_at,
  };
}

/** The player's devices, latest first (at most HISTORY). */
async function ofPlayer(db, userId) {
  const { rows } = await db.query('SELECT * FROM user_devices WHERE user_id = $1 ORDER BY last_seen_at DESC', [userId]);
  return rows.map(shown);
}

/** SQL for a player's latest device row (a LATERAL subquery on users `u`). */
const LATEST = `LEFT JOIN LATERAL (SELECT * FROM user_devices d WHERE d.user_id = u.id ORDER BY d.last_seen_at DESC LIMIT 1) dev ON true`;

/**
 * The Players report's device filter → [sql, params]: device (phone | tablet | computer), client (web | android-app
 * | ios-app), os and browser (names: 'Android', 'Chrome'). Unknown values are ignored.
 */
function filterSql(query = {}, startAt = 1) {
  const parts = []; const params = [];
  const add = (col, v) => { params.push(v); parts.push(`dev.${col} = $${startAt + params.length - 1}`); };
  if (['phone', 'tablet', 'computer'].includes(query.device)) add('device_type', query.device);
  if (CLIENTS[query.client]) add('client', query.client);
  if (typeof query.os === 'string' && /^[A-Za-z ]{2,20}$/.test(query.os)) add('os_name', query.os);
  if (typeof query.browser === 'string' && /^[A-Za-z ]{2,20}$/.test(query.browser)) add('browser_name', query.browser);
  return [parts.join(' AND '), params];
}

/**
 * The Dashboard's "Devices & browsers": the players seen in the last `days` days, each counted once by their latest
 * device there, by device type, app or website, system (with its major version) and browser (with its major
 * version). Staff left out, like every Dashboard number. → { days, players, device: [{ key, players }], … }
 */
async function breakdown(db, { days = 30, top = 10 } = {}) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (d.user_id) d.*
       FROM user_devices d JOIN users u ON u.id = d.user_id
      WHERE d.last_seen_at > now() - make_interval(days => $1) AND NOT (u.is_staff OR u.role = 'admin') AND u.deleted_at IS NULL
      ORDER BY d.user_id, d.last_seen_at DESC`,
    [days],
  );
  const count = (key) => {
    const m = new Map();
    for (const r of rows) { const k = key(r); m.set(k, (m.get(k) ?? 0) + 1); }
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, top).map(([k, n]) => ({ key: k, players: n }));
    const rest = sorted.slice(top).reduce((s, [, n]) => s + n, 0);
    return rest ? [...head, { key: 'Other', players: rest }] : head;
  };
  return {
    days,
    players: rows.length,
    device: count((r) => r.device_type),
    client: count((r) => CLIENTS[r.client] ?? r.client),
    os: count((r) => label(r.os_name, r.os_version)),
    browser: count((r) => label(r.browser_name, r.browser_version)),
  };
}

module.exports = { parse, fromRequest, seen, ofPlayer, shown, breakdown, filterSql, label, LATEST, CLIENTS, HISTORY };
