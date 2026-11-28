import { useCallback, useEffect, useRef, useState } from 'react';
import { frameAtTime } from '../utils/splits';
import { COUNTDOWN_MS } from '../three/startCamera';

/**
 * Plays back a finished race from its full frame list with play/pause,
 * speed and scrubbing. Exposes the same `sample()` contract as useRaceStream.
 * tailMs: how long the replay runs on past the race's last frame (the marbles
 * stay put while the finish show plays out).
 */
export function useReplay(replay, { tailMs = 0 } = {}) {
  // With a starting gate the replay opens on the countdown (as long as a live
  // race's, so the starting camera has time for its move): time runs from minus
  // the countdown up to the race's end, and the race starts at 0 ("GO").
  const start = replay?.start ? -Math.max(COUNTDOWN_MS, replay.start.countdownMs ?? 0) : 0;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(start);
  const clock = useRef({ base: start, startedAt: 0 });
  const duration = (replay?.durationMs ?? 0) + (replay ? tailMs : 0);

  const now = useCallback(() => {
    if (!playing) return clock.current.base;
    return Math.min(duration, clock.current.base + (performance.now() - clock.current.startedAt) * speed);
  }, [playing, speed, duration]);

  const seek = useCallback((t) => {
    clock.current = { base: Math.max(start, Math.min(duration, t)), startedAt: performance.now() };
    setTime(clock.current.base);
  }, [duration, start]);

  const toggle = useCallback(() => {
    const t = now();
    clock.current = { base: t >= duration ? start : t, startedAt: performance.now() };
    setPlaying((p) => !p);
  }, [now, duration, start]);

  const changeSpeed = useCallback((s) => {
    clock.current = { base: now(), startedAt: performance.now() };
    setSpeed(s);
  }, [now]);

  // Drive the scrubber / standings at ~10 Hz while playing.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      const t = now();
      setTime(t);
      if (t >= duration) {
        clock.current = { base: duration, startedAt: performance.now() };
        setPlaying(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, [playing, now, duration]);

  // During the countdown the marbles wait at the gate (the first frame), but the frame carries the real time.
  const frameAt = useCallback((t) => {
    if (!replay) return null;
    const f = frameAtTime(replay.frames, replay.tickMs, t);
    return t < 0 && f ? { ...f, t } : f;
  }, [replay]);
  const sample = useCallback(() => frameAt(now()), [frameAt, now]);

  const frame = frameAt(time);

  // Splits up to the current time, from the official results.
  const splits = {};
  if (replay) {
    for (const r of replay.results) if (r.splitTimeMs <= time) splits[r.index] = r.splitTimeMs;
  }

  return { playing, speed, time, start, duration, frame, splits, sample, now, seek, toggle, setSpeed: changeSpeed };
}

