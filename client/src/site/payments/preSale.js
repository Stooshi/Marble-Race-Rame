import { useEffect, useState } from 'react';

/**
 * The season pass's pre-sale (on sale before its season starts): "Activates 1 December" and the
 * countdown to it, on the pass page and in the player's account. The server says whether the pass
 * is in its pre-sale (season.pass.preSale) and when it activates (season.pass.activatesAt).
 */

/** "1 December": the day a pass activates, in Swedish time (the season's own zone). */
export function activatesDay(iso, timeZone = 'Europe/Stockholm') {
  return new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'long' }).format(new Date(iso));
}

/** "2 days 4 h 05 min", "4 h 05 min 09 s", "09 s" to go; null once it's there. */
export function countdownText(ms) {
  if (!(ms > 0)) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d} ${d === 1 ? 'day' : 'days'} ${h} h ${two(m)} min`;
  if (h > 0) return `${h} h ${two(m)} min ${two(sec)} s`;
  if (m > 0) return `${m} min ${two(sec)} s`;
  return `${two(sec)} s`;
}

/** The milliseconds left until `iso`, ticking every second (null without a date). */
export function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return iso ? new Date(iso).getTime() - now : null;
}
