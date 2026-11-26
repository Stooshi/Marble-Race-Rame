import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

/**
 * Whether leagues are open to this player: the server's LEAGUES switch (off, admins, on), asked once
 * per signed-in player (GET /api/leagues/status). With the switch off nothing about leagues shows:
 * no LEAGUES button, no My leagues card, no "Or start a league" link, and the pages are the 404.
 * Switching needs no website build (the server answers), only a server restart with the new value.
 */
const cache = new Map(); // user id ('' signed out) → Promise<{ enabled, tracks, days, attempts }>

export function leaguesStatus(userId) {
  const key = userId ?? '';
  if (!cache.has(key)) {
    // (An older server without leagues answers 404: switched off.)
    cache.set(key, api.leaguesStatus().catch(() => ({ enabled: false })));
  }
  return cache.get(key);
}

/** For tests and after logging in or out. */
export function forgetLeaguesStatus() { cache.clear(); }

/** null while asking, then true or false. */
export function useLeaguesOn() {
  const { user, loading } = useAuth();
  const [on, setOn] = useState(null);
  useEffect(() => {
    if (loading) return undefined;
    let stop = false;
    setOn(null);
    leaguesStatus(user?.id).then((s) => { if (!stop) setOn(Boolean(s?.enabled)); });
    return () => { stop = true; };
  }, [user?.id, loading]);
  return on;
}

/**
 * What the server says of leagues for this player: `pro` (Pro Leagues open: only once part 2 is live)
 * and `tracks` (a League's tracks: 3 from 31 Oct 2026, 5 on a server not yet deployed with it), so the
 * create page always asks for what the server takes. { pro: null, tracks: null } while asking.
 */
export function useLeaguesInfo() {
  const { user, loading } = useAuth();
  const [info, setInfo] = useState({ pro: null, tracks: null });
  useEffect(() => {
    if (loading) return undefined;
    let stop = false;
    leaguesStatus(user?.id).then((s) => {
      if (!stop) setInfo({ pro: Boolean(s?.pro), tracks: Number.isInteger(s?.tracks) && s.tracks > 0 ? s.tracks : null });
    });
    return () => { stop = true; };
  }, [user?.id, loading]);
  return info;
}

/** "2 days 4 h left", "3 h 12 min left", "9 min left", "Ended". `skew`: the server's clock minus this device's. */
export function timeLeft(endsAt, now = Date.now(), skew = 0) {
  const ms = new Date(endsAt).getTime() - (now + skew);
  if (!(ms > 0)) return 'Ended';
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min left`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ''} left`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'}${h % 24 ? ` ${h % 24} h` : ''} left`;
}

/** "Unlimited tries" / "5 tries per track". */
export const triesText = (cap) => (cap ? `${cap} tries per track` : 'Unlimited tries');

/** A time in seconds as a league shows it: "52.31 s", "1:04.20". */
export function lapTime(ms) {
  if (ms === null || ms === undefined) return '—';
  const total = Number(ms) / 1000;
  const m = Math.floor(total / 60);
  const s = (total - m * 60).toFixed(2);
  return m ? `${m}:${s.padStart(5, '0')}` : `${s} s`;
}

/**
 * The "Go pro" line (Help answers draft 2, Moses 26 Oct 2026), while Pro Leagues are off. Never a
 * word on how often, when, or what is won in the Major League.
 */
export const GO_PRO = 'Pro Leagues are coming. Race your way to the Marble Spins Major League. Date to be announced.';

/**
 * The taster line (Moses, 31 Oct 2026): on the create page and when a free League ends. Its "Go Pro"
 * part shows only once Pro Leagues are switched on (`pro`); until then the first sentence alone.
 */
export const TASTER = 'Start with a free taster league: 3 races with friends.';
export const TASTER_PRO = 'Ready for more? Go Pro: 10 tracks and a league marble.';
export const tasterLine = (pro) => (pro ? `${TASTER} ${TASTER_PRO}` : TASTER);
