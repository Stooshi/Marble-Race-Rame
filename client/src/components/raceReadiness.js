/**
 * The readiness report (Moses, 28 Oct 2026): once per race, whether this screen had everything loaded
 * by GO (the track with its scenery, the marbles, the sound), and if not what was missing and how
 * long after GO it caught up. Sent to POST /api/races/:id/readiness (src/readiness on the server);
 * nothing waits for it. A screen opened after GO (watching mid-race) sends nothing.
 */
import { nativePlatform } from '../app/native';

const EVERY_MS = 250;
const GIVE_UP_MS = 60_000;

/**
 * Watches one race. `goWall()`: GO as shown on this screen (wall ms, or null while unknown);
 * `pieces()`: { track, marbles } loaded; `sound()`: engine soundReport(); `send(body)`.
 * → stop().
 */
export function watchReadiness({ kind, goWall, pieces, sound, send, platform = nativePlatform(), now = () => Date.now(), every = EVERY_MS }) {
  const openedAt = now();
  let atGo = null; // { missing, at }
  let done = false;
  const missingNow = () => {
    const p = pieces();
    const s = sound();
    return { missing: [...(p.track ? [] : ['track']), ...(p.marbles ? [] : ['marbles']), ...s.missing], s };
  };
  const finish = (lateMs) => {
    done = true;
    clearInterval(timer);
    const { s } = missingNow();
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    send({
      platform,
      kind,
      missing: atGo.missing,
      lateMs,
      details: {
        backend: s.backend,
        started: s.started,
        running: s.running,
        connection: nav.connection?.effectiveType,
        memoryGb: nav.deviceMemory,
        sound: atGo.missing.filter((m) => m !== 'track' && m !== 'marbles'),
      },
    });
  };
  const check = () => {
    if (done) return;
    const go = goWall();
    if (go == null) return;
    const t = now();
    if (!atGo) {
      if (t < go) return;
      if (openedAt > go - 200) { done = true; clearInterval(timer); return; } // (opened mid-race)
      atGo = { ...missingNow(), at: t, go };
      if (!atGo.missing.length) { finish(0); return; }
    }
    // (Late from GO as it was when this screen missed it: a hold decided later moves this screen's GO.)
    const late = Math.max(0, t - atGo.go);
    const left = missingNow().missing;
    if (!left.length || late > GIVE_UP_MS) finish(late);
  };
  const timer = setInterval(check, every);
  return () => { done = true; clearInterval(timer); };
}
