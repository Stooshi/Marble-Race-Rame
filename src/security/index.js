'use strict';

/**
 * Security events: where the game keeps IP addresses (support messages keep the
 * sender's too, for spam checks, on the same terms), only for security and fraud
 * (one person farming coins with many accounts, payment fraud). Recorded when an account is made, saved or logs in, and when coins are
 * bought. The full address is kept for at most 90 days (IP_DAYS); after that
 * trimIps() blanks it and only the country stays.
 *
 * Recording never gets in the way: a failure is logged and the request goes on.
 */
const geoip = require('geoip-country');
const db = require('../db');

const IP_DAYS = 90;
const KINDS = ['guest', 'signup', 'claim', 'login', 'purchase', 'admin-login', 'reset-request', 'password-reset'];

/** The client's address (Express works it out behind the proxy: app 'trust proxy'). */
function clientIp(req) {
  const ip = req.ip || req.socket?.remoteAddress || null;
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/** Two-letter country of an address, or null (local and private addresses have none). */
function countryOf(ip) {
  if (!ip) return null;
  try {
    return geoip.lookup(ip)?.country ?? null;
  } catch {
    return null;
  }
}

/** Records one event for a user (kind: KINDS). Never throws. */
async function record(req, userId, kind, client = db) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown security event ${kind}`);
  try {
    const ip = clientIp(req);
    await client.query(
      'INSERT INTO security_events (user_id, kind, ip, country) VALUES ($1, $2, $3, $4)',
      [userId, kind, ip, countryOf(ip)],
    );
  } catch (err) {
    console.error(`[security] could not record ${kind}: ${err.message}`);
  }
}

/** Blanks the addresses older than IP_DAYS, keeping the country. Returns how many. */
async function trimIps(client = db) {
  const { rowCount } = await client.query(
    `UPDATE security_events SET ip = NULL WHERE ip IS NOT NULL AND created_at < now() - make_interval(days => $1)`,
    [IP_DAYS],
  );
  // Support messages keep the sender's address for spam checks, on the same terms.
  const { rowCount: support } = await client.query(
    `UPDATE support_messages SET ip = NULL WHERE ip IS NOT NULL AND created_at < now() - make_interval(days => $1)`,
    [IP_DAYS],
  );
  return rowCount + support;
}

/** Trims now and then once a day (the server's start calls this). */
function startTrimming() {
  const run = () => trimIps()
    .then((n) => { if (n) console.log(`[security] blanked ${n} IP addresses older than ${IP_DAYS} days (country kept)`); })
    .catch((err) => console.error('[security] trim failed', err.message));
  run();
  const timer = setInterval(run, 24 * 3600_000);
  timer.unref?.();
  return timer;
}

module.exports = { IP_DAYS, KINDS, clientIp, countryOf, record, trimIps, startTrimming };
