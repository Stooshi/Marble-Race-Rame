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
const BUFFER_MS = 150; // how far behind the newest frame playback runs (at least 1.5 frames)
const KEEP = 40; // frames kept for blending
export function useRaceStream(raceId, { onLobbyUpdate } = {}) {
  const { socket } = useAuth();
  const [status, setStatus] = useState('connecting');
  const [meta, setMeta] = useState(null);
  const [startsAt, setStartsAt] = useState(null);
  const [frame, setFrame] = useState(null);
  const [splits, setSplits] = useState({});
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState(null);
  const [finishes, setFinishes] = useState({}); // entry index → official finish time (ms), as marbles cross
  const [next, setNext] = useState(null); // the rematch, once someone sets it up: { nextRaceId, scheduledAt }
  const [error, setError] = useState(null);

  const frames = useRef({ prev: null, curr: null, at: 0 });
  // Recent frames, oldest first, and the steady playback clock: race time = now + offset.
  const buffer = useRef({ list: [], offset: null, shown: -Infinity });
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
    const crossed = detectCrossings(curr, f, splitsRef.current);
    if (Object.keys(crossed).length) {
      splitsRef.current = { ...splitsRef.current, ...crossed };
      setSplits(splitsRef.current);
    }
    const now = performance.now();
    frames.current = { prev: curr, curr: f, at: now };
    const b = buffer.current;
    b.list.push(f);
    if (b.list.length > KEEP) b.list.shift();
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
        setMeta(p.meta);
        setStartsAt(Date.now() + p.countdownMs);
        setStatus('countdown');
      },
      'race:start': (p) => {
        if (!isThis(p)) return;
        setMeta(p);
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
        if (ack.meta) setMeta(ack.meta);
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

  /** Interpolated frame for rendering at the current instant (see BUFFER_MS above). */
  const sample = useCallback(() => {
    const b = buffer.current;
    const list = b.list;
    if (!list.length) return null;
    const last = list[list.length - 1];
    if (list.length === 1 || b.offset === null) return last;
    // Playback time: steady, a little behind the newest frame, never going backwards.
    let t = performance.now() + b.offset - BUFFER_MS;
    t = Math.min(last.t, Math.max(t, b.shown, list[0].t));
    b.shown = t;
    let i = list.length - 2;
    while (i > 0 && list[i].t > t) i -= 1;
    const a = list[i];
    const c = list[i + 1];
    const span = c.t - a.t || 1;
    return lerpFrame(a, c, Math.min(1, Math.max(0, (t - a.t) / span)));
  }, []);

  /**
   * The race clock (ms) in step with sample(), carrying on at real speed after
   * the last frame (the finish celebrations run on after the stream ends); null
   * before the first frame.
   */
  const clock = useCallback(() => {
    const b = buffer.current;
    if (!b.list.length) return null;
    if (b.offset === null) return b.list[b.list.length - 1].t;
    return Math.max(b.shown, performance.now() + b.offset - BUFFER_MS);
  }, []);

  return { status, meta, startsAt, frame, splits, events, results, finishes, next, error, sample, clock };
}
