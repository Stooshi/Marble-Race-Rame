import { useEffect } from 'react';
import { api, API_URL, getStoredToken } from './client';

/**
 * A new player's first steps for the back office Dashboard's funnel (Moses, 2 Nov 2026): the server
 * keeps each once per player, the first time. "Tapped Play" is recorded when the guest is made;
 * joining and finishing come from the races. This sends "saw GO", at most once per page visit.
 *
 * Since 9 Nov 2026 (where do guests with 0 races stop?), before the first race reaches GO:
 * - firstStepError(what, err): the first call that failed ("quick:409:quick_starting");
 * - useLeftReport(where): when the page closes on the starting line, the quick-race wait, a room
 *   or a race still loading, where and how long after the tap. The server keeps each once, only
 *   for a guest within a day of the tap and before their first GO; nothing about the player.
 */
let sent = false;
let goSeen = false;
let errorSent = false;
let leftSent = false;
const TAP_KEY = 'ms-tap-at';

export function sawGo() {
  goSeen = true;
  if (sent) return;
  sent = true;
  api.firstStep('go').catch(() => {}); // (an older server has no such address: nothing lost but the step)
}

/** When the guest was made (AuthContext.playAsGuest), for the seconds in 'left'. */
export function noteTap(now = Date.now()) {
  try { sessionStorage.setItem(TAP_KEY, String(now)); } catch { /* (private mode: no seconds) */ }
}
function secondsSinceTap(now = Date.now()) {
  try {
    const at = Number(sessionStorage.getItem(TAP_KEY));
    return at > 0 ? Math.round((now - at) / 1000) : null;
  } catch {
    return null;
  }
}

/** "<what>:<status>[:<code>]": letters, digits, '-', '_' and ':' only (no messages, nothing typed). */
export function errorDetail(what, err) {
  const status = Number.isFinite(err?.status) ? err.status : 0;
  const code = err?.details?.code ? `:${err.details.code}` : '';
  return `${what}:${status}${code}`.replace(/[^A-Za-z0-9_:-]/g, '').slice(0, 64);
}

export function firstStepError(what, err, user) {
  if (errorSent || goSeen || !user?.is_guest) return;
  errorSent = true;
  api.firstStep('error', { detail: errorDetail(what, err) }).catch(() => {});
}

/** Sends 'left' as the page closes (pagehide), with the login, even while the page goes away. */
export function sendLeft(where, { fetchImpl = typeof fetch === 'function' ? fetch : null } = {}) {
  if (leftSent || goSeen || !fetchImpl) return false;
  const token = getStoredToken();
  if (!token) return false;
  leftSent = true;
  try {
    fetchImpl(`${API_URL}/api/users/me/first-step`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ step: 'left', detail: where, seconds: secondsSinceTap() }),
    }).catch(() => {});
  } catch { /* (nothing to do as the page closes) */ }
  return true;
}

/** While a guest is on this screen before their first race reaches GO, report 'left' if the page closes. */
export function useLeftReport(where, user, on = true) {
  const guest = Boolean(user?.is_guest);
  useEffect(() => {
    if (!on || !guest || typeof window === 'undefined') return undefined;
    const onHide = () => sendLeft(where);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [where, guest, on]);
}

/** (Tests.) */
export function resetFirstSteps() { sent = false; goSeen = false; errorSent = false; leftSent = false; }
