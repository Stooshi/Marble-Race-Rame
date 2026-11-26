'use strict';

/**
 * Where a new player came from (Moses, 13 Nov 2026), without cookies: the website reads utm_source,
 * utm_medium and utm_campaign from the address the visitor arrived on, or, if there are none, the referring
 * site's domain only (never the full address), keeps them in memory (no cookie, no local storage) and sends
 * them when the guest account is made (POST /api/auth/guest) or, for a direct sign-up, with it
 * (POST /api/auth/register). Kept once per account, the first time (first touch, never overwritten), in
 * player_origins; nothing else is stored. The back office Dashboard's "Where players come from" table counts
 * them (src/admin/dashboard.js).
 */
const db = require('../db');

const MAX = 64;
/** Our own sites never count as a referrer (moving between our pages, the payment return). */
const OWN = /(^|\.)(marblespins\.com|localhost|vercel\.app|stripe\.com)$/;

/** A UTM value cleaned: letters, digits, '.', '_', '-', '+' and spaces turned into '-', lower case, 64 at most. */
function cleanTag(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._+-]/g, '').slice(0, MAX);
  return s || null;
}

/** A referring site's domain only: a host name, lower case, without "www." and never our own sites. */
function cleanDomain(v) {
  if (typeof v !== 'string' || !v.trim()) return null;
  let host = v.trim().toLowerCase();
  try { if (/^[a-z][a-z0-9+.-]*:\/\//.test(host)) host = new URL(host).hostname; } catch { return null; }
  host = host.replace(/^www\./, '').replace(/\.$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || host.length > 253) return null;
  if (OWN.test(host)) return null;
  return host.slice(0, MAX);
}

/**
 * The origin to keep, from what the website sent: the three UTM values if any is there (the referrer then
 * dropped), else the referring domain; null if there is nothing.
 */
function clean(input) {
  if (!input || typeof input !== 'object') return null;
  const utm = { source: cleanTag(input.utm_source), medium: cleanTag(input.utm_medium), campaign: cleanTag(input.utm_campaign) };
  if (utm.source || utm.medium || utm.campaign) return { ...utm, referrer: null };
  const referrer = cleanDomain(input.referrer);
  return referrer ? { source: null, medium: null, campaign: null, referrer } : null;
}

/** Keeps a new account's origin the first time (first touch: an origin already kept is never overwritten). → kept or not. */
async function record(userId, input, client = db) {
  const o = clean(input);
  if (!o) return false;
  try {
    const { rowCount } = await client.query(
      `INSERT INTO player_origins (user_id, utm_source, utm_medium, utm_campaign, referrer_domain)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO NOTHING`,
      [userId, o.source, o.medium, o.campaign, o.referrer],
    );
    return rowCount === 1;
  } catch (err) {
    console.error(`[origins] could not record: ${err.message}`);
    return false;
  }
}

/** The Dashboard's name for a source: the utm_source, else the referring domain, else "Direct or unknown". */
const SOURCE_SQL = "COALESCE(o.utm_source, o.referrer_domain, '(direct or unknown)')";

module.exports = { clean, cleanTag, cleanDomain, record, SOURCE_SQL };
