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

/**
 * The whole answer (null while asking): { enabled, pro, proTracks, minRanked, prices }. `pro`: Pro Leagues
 * and credits open to this player (the server's LEAGUES_PRO switch, never more open than LEAGUES).
 */
export function useLeaguesStatus() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (loading) return undefined;
    let stop = false;
    setStatus(null);
    leaguesStatus(user?.id).then((s) => { if (!stop) setStatus(s ?? { enabled: false }); });
    return () => { stop = true; };
  }, [user?.id, loading]);
  return status;
}

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
