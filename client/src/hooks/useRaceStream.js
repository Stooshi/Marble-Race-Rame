import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { detectCrossings, lerpFrame } from '../utils/splits';

/**
 * Subscribes to a race over Socket.io and exposes everything the live race
 * screen needs: the stream header (meta), current standings, halfway split
 * times, recent events and the final results.
 *
 * Frames arrive ~10x per second. `sample()` returns a smoothly interpolated
 * frame for the renderer, one tick behind the newest frame, so animation stays
 * fluid regardless of network jitter.
 */
export function useRaceStream(raceId, { onLobbyUpdate } = {}) {
  const { socket } = useAuth();
  const [status, setStatus] = useState('connecting');
  const [meta, setMeta] = useState(null);
  const [startsAt, setStartsAt] = useState(null);
  const [frame, setFrame] = useState(null);
  const [splits, setSplits] = useState({});
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const frames = useRef({ prev: null, curr: null, at: 0 });
  const splitsRef = useRef({});
  const lobbyCb = useRef(onLobbyUpdate);
  lobbyCb.current = onLobbyUpdate;

  const ingest = useCallback((f) => {
    const { curr } = frames.current;
    if (curr && f.t <= curr.t) return;
    const crossed = detectCrossings(curr, f, splitsRef.current);
    if (Object.keys(crossed).length) {
      splitsRef.current = { ...splitsRef.current, ...crossed };
      setSplits(splitsRef.current);
    }
    frames.current = { prev: curr, curr: f, at: performance.now() };
    setFrame(f);
    if (f.events?.length) setEvents((list) => [...f.events.slice().reverse(), ...list].slice(0, 12));
  }, []);

  useEffect(() => {
    if (!raceId) return undefined;
    frames.current = { prev: null, curr: null, at: 0 };
    splitsRef.current = {};
    setSplits({});
    setEvents([]);
    setResults(null);
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
        setStatus('finished');
      },
      'race:cancelled': (p) => isThis(p) && setStatus('cancelled'),
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
        if (ack.status === 'running' && ack.p) ingest({ t: ack.t, p: ack.p, l: ack.l, s: ack.s });
        if (ack.status === 'finished') setResults(ack.results);
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
  }, [raceId, socket, ingest]);

  /** Interpolated frame for rendering at the current instant. */
  const sample = useCallback(() => {
    const { prev, curr, at } = frames.current;
    if (!curr) return null;
    if (!prev) return curr;
    const tick = curr.t - prev.t || 100;
    const f = Math.min(1, (performance.now() - at) / tick);
    return lerpFrame(prev, curr, f);
  }, []);

  return { status, meta, startsAt, frame, splits, events, results, error, sample };
}
