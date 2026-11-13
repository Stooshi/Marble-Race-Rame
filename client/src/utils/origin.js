/**
 * Where this visitor came from (Moses, 13 Nov 2026; src/origins on the server), without cookies: read once when
 * the website starts, from the address they arrived on (utm_source, utm_medium, utm_campaign) or, if none, the
 * referring site's domain only (never its full address). Kept in memory only (no cookie, no local or session
 * storage), and sent when their guest account is made, or with a direct sign-up; the server keeps it the first
 * time only. A visitor who leaves and comes back later arrives without it, and that is fine.
 */
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'];
let origin = null;

/** Reads the arrival address and the referrer (call once, before the router changes the address). */
export function captureOrigin(loc = typeof window !== 'undefined' ? window.location : null, referrer = typeof document !== 'undefined' ? document.referrer : '') {
  if (origin || !loc) return origin;
  const q = new URLSearchParams(loc.search ?? '');
  const utm = Object.fromEntries(UTM.map((k) => [k, (q.get(k) ?? '').trim().slice(0, 64)]).filter(([, v]) => v));
  if (Object.keys(utm).length) { origin = utm; return origin; }
  try {
    const host = referrer ? new URL(referrer).hostname.toLowerCase() : '';
    if (host && host !== loc.hostname) origin = { referrer: host };
  } catch { /* (no referrer) */ }
  return origin;
}

/** What to send with the new account (null: nothing known). */
export const currentOrigin = () => origin;

/** For tests. */
export function resetOrigin() { origin = null; }
