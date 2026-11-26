import { nameLooks } from '../shared/marbles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { detectCrossings, lerpFrame } from '../utils/splits';

/**
 * Subscribes to a race over Socket.io and exposes everything the live race
 * screen needs: the stream header (meta), current standings, halfway split
 * times, recent events and the final results.
 *
 * Frames arrive 10-20x per second. `sample()` returns a smoothly interpolated
 * frame for the renderer: playback runs on a steady clock a little behind the
 * newest frame (a short buffer), blending between frames by their race time,
 * so frames arriving in bursts (a busy phone, a patchy network) never make the
 * marbles leap forward.
 */
const STREAMED_KEEP = 1300; // frames kept for takeStreamed() if nobody reads them (about 65 s: a solo start show held up to SOLO_MAX_HOLD_MS)
export const BUFFER_MS = 400; // how far behind the newest frame playback runs: rides out a late frame or two (a patchy phone network) without the marbles stopping
const KEEP = 40; // frames kept for blending (more while the view is held back, see below)
/**
 * Holding the view back (Moses, 22 Oct 2026: on phones the 3D view was ready only after the countdown,
 * so players never saw the start). When the view gets ready late, playback runs `lag` ms behind the
 * live race: the countdown and the gates opening are shown from the start. From 1.5 s after the GO as
 * shown, it catches up, playing CATCH_UP faster than real time until it is live again.
 * Looks only: the race itself runs on the server as always.
 */
export const CATCH_UP = 0.35; // lag shed per second (the race plays at 1.35× while catching up)
export const MAX_HOLD_MS = 12000; // never held back further than this
// A solo race's start show (`stay`) may be held back further: nobody else watches it live, and a slow phone
// (Moses's Galaxy A12, 11 Nov 2026) can be ready 20 s or more after the countdown began; capped at 12 s, the
// countdown and its beeps ran under the flyover and the race was already rolling when the flight ended.
export const SOLO_MAX_HOLD_MS = 60000;
export const holdCap = (stay) => (stay ? SOLO_MAX_HOLD_MS : MAX_HOLD_MS);
/** The hold `{ base, decayFrom }` at performance time `now`: base ms, shed at CATCH_UP from decayFrom on. */
export const holdLag = (h, now) => Math.max(0, h.base - Math.max(0, now - h.decayFrom) * CATCH_UP);
/**
 * How often the page's own state follows the stream (the standings, the clock, the speed): the 3D view
 * draws from sample() every frame regardless. 20 times a second, every frame redrew the race page's whole
 * layout, too much for a slow phone (Moses's Galaxy A12, 11 Nov 2026: taps took seconds): phones 4 a
 * second, computers 10 (the clock's tenths).
 */
export function uiFrameMs() {
  try {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    return coarse && Math.min(window.screen.width, window.screen.height) <= 900 ? 250 : 100;
  } catch {
    return 100;
  }
}

/** Passes on at most one frame per `ms` (the newest), and the last one always (a trailing call). */
export function throttleFrames(set, ms, { now = () => performance.now(), later = setTimeout, cancel = clearTimeout } = {}) {
  let lastAt = -Infinity;
  let timer = null;
  let pending = null;
  const flush = () => { timer = null; lastAt = now(); set(pending); };
  return {
    push(f) {
      pending = f;
      if (now() - lastAt >= ms) { if (timer) { cancel(timer); timer = null; } flush(); return; }
      if (!timer) timer = later(flush, ms - (now() - lastAt));
    },
    reset(f = null) { if (timer) cancel(timer); timer = null; pending = f; lastAt = -Infinity; set(f); },
  };
}

export function useRaceStream(raceId, { onLobbyUpdate } = {}) {
  const { socket } = useAuth();
  const [status, setStatus] = useState('connecting');
  const [meta, setMeta] = useState(null);
  const [startsAt, setStartsAt] = useState(null);
  const [frame, setFrameNow] = useState(null);
  const frameUi = useRef(null);
  if (!frameUi.current) frameUi.current = throttleFrames(setFrameNow, uiFrameMs());
  const setFrame = useCallback((f) => (f === null ? frameUi.current.reset(null) : frameUi.current.push(f)), []);
  const [splits, setSplits] = useState({});
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState(null);
  const [finishes, setFinishes] = useState({}); // entry index → official finish time (ms), as marbles cross
  const [next, setNext] = useState(null); // the rematch, once someone sets it up: { nextRaceId, scheduledAt }
  const [error, setError] = useState(null);

  const frames = useRef({ prev: null, curr: null, at: 0 });
  const streamed = useRef([]);
  // Recent frames, oldest first, and the steady playback clock: race time = now + offset.
  const buffer = useRef({ list: [], offset: null, shown: -Infinity });
  // The hold: { base, decayFrom } (base ms behind, shed from performance time decayFrom on).
  const hold = useRef({ base: 0, decayFrom: Infinity, decided: false });
  const splitsRef = useRef({});
  const metaRef = useRef(null);
  metaRef.current = meta;
  const lobbyCb = useRef(onLobbyUpdate);
  lobbyCb.current = onLobbyUpdate;

  const mergeFinishes = useCallback((pairs) => {
    setFinishes((had) => (pairs.every(([i, ms]) => had[i] === ms) ? had : { ...had, ...Object.fromEntries(pairs) }));
  }, []);
  /** Official results (rows with entry_id) as finish times by entry index. */
  const takeResults = useCallback((rows) => {
    const index = Object.fromEntries((metaRef.current?.entries ?? []).map((e) => [e.entryId, e.index]));
    const pairs = (rows ?? []).filter((r) => index[r.entry_id] !== undefined && r.finish_time_ms).map((r) => [index[r.entry_id], r.finish_time_ms]);
    if (pairs.length) mergeFinishes(pairs);
  }, [mergeFinishes]);

  const ingest = useCallback((f) => {
    const { curr } = frames.current;
    if (curr && f.t <= curr.t) return;
    // Every frame as it came, for whoever reads them all (the obstacle bump): React may draw two
    // frames that arrive close together as one, and a frame's events come only once (1 Nov 2026).
    streamed.current.push(f);
    if (streamed.current.length > STREAMED_KEEP) streamed.current.splice(0, streamed.current.length - STREAMED_KEEP);
    const crossed = detectCrossings(curr, f, splitsRef.current);
    if (Object.keys(crossed).length) {
      splitsRef.current = { ...splitsRef.current, ...crossed };
      setSplits(splitsRef.current);
    }
    const now = performance.now();
    frames.current = { prev: curr, curr: f, at: now };
    const b = buffer.current;
    b.list.push(f);
    // (Enough frames to play from while held back: the last few seconds plus the hold; until the view
    // has decided its hold, everything it might need.)
    const keepMs = (hold.current.decided ? hold.current.base : SOLO_MAX_HOLD_MS) + 3000; // (undecided: the longest hold there may be)
    while (b.list.length > KEEP && b.list[1].t < f.t - keepMs) b.list.shift();
    // Ease the clock towards what this frame says (never jumping), so network
    // jitter is smoothed out; a big gap (a reconnect, a sleeping tab) resets it.
    const off = f.t - now;
    if (b.offset === null || Math.abs(off - b.offset) > 1500) b.offset = off;
    else b.offset += (off - b.offset) * 0.08;
    setFrame(f);
    if (f.finishes?.length) mergeFinishes(f.finishes.map((x) => [x.i, x.ms]));
    if (f.events?.length) setEvents((list) => [...f.events.slice().reverse(), ...list].slice(0, 12));
  }, []);

  useEffect(() => {
    if (!raceId) return undefined;
    frames.current = { prev: null, curr: null, at: 0 };
    buffer.current = { list: [], offset: null, shown: -Infinity };
    streamed.current = [];
    hold.current = { base: 0, decayFrom: Infinity, decided: false };
    splitsRef.current = {};
    setSplits({});
    setEvents([]);
    setResults(null);
    setFinishes({});
    setNext(null);
    setFrame(null);

    const isThis = (p) => p?.raceId === raceId;
    const handlers = {
      'race:updated': (p) => isThis(p) && lobbyCb.current?.(p),
      'race:countdown': (p) => {
        if (!isThis(p)) return;
        setMeta(nameLooks(p.meta));
        setStartsAt(Date.now() + p.countdownMs);
        setStatus('countdown');
      },
      'race:start': (p) => {
        if (!isThis(p)) return;
        setMeta(nameLooks(p));
        setStatus('running');
      },
      'race:frame': (p) => {
        if (!isThis(p)) return;
        setStatus((s) => (s === 'finished' ? s : 'running'));
        ingest(p);
      },
      'race:finished': (p) => {
        if (!isThis(p)) return;
        setResults(p.results);
        takeResults(p.results);
        setStatus('finished');
      },
      'race:cancelled': (p) => isThis(p) && setStatus('cancelled'),
      'race:next': (p) => isThis(p) && setNext({ nextRaceId: p.nextRaceId, scheduledAt: p.scheduledAt }),
    };

    const watch = () => {
      socket.emit('race:watch', { raceId }, (ack) => {
        if (!ack?.ok) {
          setError(ack?.error || 'Could not watch race');
          return;
        }
        setStatus(ack.status);
        if (ack.meta) setMeta(nameLooks(ack.meta));
        if (ack.status === 'countdown' && ack.meta) setStartsAt(new Date(ack.meta.startsAt).getTime());
        if (ack.status === 'running' && ack.p) {
          // Joined mid-race: the current frame, with whatever the engine sends (heights, speeds, catch area…).
          const f = {};
          for (const k of ['t', 'p', 'l', 'h', 'v', 'b', 'a', 's']) if (ack[k] !== undefined) f[k] = ack[k];
          ingest(f);
          if (ack.finishes?.length) mergeFinishes(ack.finishes.map((x) => [x.i, x.ms]));
        }
        if (ack.status === 'finished') {
          setResults(ack.results);
          takeResults(ack.results);
        }
      });
    };

    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
    socket.on('connect', watch); // re-subscribe after reconnects
    if (socket.connected) watch();

    return () => {
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
      socket.off('connect', watch);
      socket.emit('race:unwatch', { raceId });
    };
  }, [raceId, socket, ingest, mergeFinishes, takeResults]);

  /** How far the view is held back now (ms; see MAX_HOLD_MS above). */
  const lagNow = useCallback((now = performance.now()) => holdLag(hold.current, now), []);
  /**
   * Hold the view `ms` behind the live race (the 3D view calls it once it is ready): `startsAt`, the
   * race's GO (wall clock ms). The catching up starts 1.5 s after the GO as shown.
   */
  const holdBack = useCallback((ms, startsAt, { stay = false } = {}) => {
    const base = Math.max(0, Math.min(holdCap(stay), ms || 0));
    const goShown = (startsAt ?? Date.now()) + base;
    // `stay` (a solo race's start show, Moses 26 Oct 2026): held back for good, never played faster to
    // catch up (no one else is watching it live). Called again, it replaces the hold (the flyover skipped).
    hold.current = { base, decayFrom: stay ? Infinity : performance.now() + (goShown + 1500 - Date.now()), decided: true };
  }, []);

  /** Interpolated frame for rendering at the current instant (see BUFFER_MS above). */
  const sample = useCallback(() => {
    const b = buffer.current;
    const list = b.list;
    if (!list.length) return null;
    const last = list[list.length - 1];
    const lag = lagNow();
    // Held back to before GO: the countdown is still being shown (the caller draws the gate).
    if (lag > 0 && b.offset !== null && performance.now() + b.offset - BUFFER_MS - lag < 0 && list[0].t <= 200) return null;
    if (list.length === 1 || b.offset === null) return last;
    // Playback time: steady, a little behind the newest frame, never going backwards.
    let t = performance.now() + b.offset - BUFFER_MS - lag;
    t = Math.min(last.t, Math.max(t, b.shown, list[0].t));
    b.shown = t;
    let i = list.length - 2;
    while (i > 0 && list[i].t > t) i -= 1;
    const a = list[i];
    const c = list[i + 1];
    const span = c.t - a.t || 1;
    return lerpFrame(a, c, Math.min(1, Math.max(0, (t - a.t) / span)));
  }, [lagNow]);

  /**
   * The race clock (ms) in step with sample(), carrying on at real speed after
   * the last frame (the finish celebrations run on after the stream ends); null
   * before the first frame.
   */
  const clock = useCallback(() => {
    const b = buffer.current;
    if (!b.list.length) return null;
    if (b.offset === null) return b.list[b.list.length - 1].t;
    return Math.max(b.shown, performance.now() + b.offset - BUFFER_MS - lagNow());
  }, [lagNow]);

  /** The frames streamed since the last call, each once, in order (none lost when React draws two as one). */
  const takeStreamed = useCallback(() => { const list = streamed.current; streamed.current = []; return list; }, []);
  return { status, meta, startsAt, frame, splits, events, results, finishes, next, error, sample, clock, holdBack, lagNow, takeStreamed };
}
