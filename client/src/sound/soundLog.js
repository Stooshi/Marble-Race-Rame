/**
 * The sound's log (Moses, 18 Nov 2026: Android build 6 played no sound in solo races, and a store build's console
 * never reaches logcat). Every "[sound]" line goes to the console as before and is kept here too, the last
 * KEEP lines with the seconds since the page opened, so the app's readiness report can carry them
 * (raceReadiness.js → the CRM's Race readiness).
 */
const KEEP = 40;
const lines = [];
const t0 = Date.now();
const text = (a) => a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })())).join(' ');

export function soundLog(...a) {
  try { console.info('[sound]', ...a); } catch { /* (no console) */ }
  lines.push(`${((Date.now() - t0) / 1000).toFixed(1)} ${text(a)}`.slice(0, 200));
  if (lines.length > KEEP) lines.shift();
}
/** The last `n` lines, oldest first. */
export const recentSoundLog = (n = KEEP) => lines.slice(-n);
