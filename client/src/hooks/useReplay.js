import { useCallback, useEffect, useRef, useState } from 'react';
import { frameAtTime } from '../utils/splits';

/**
 * Plays back a finished race from its full frame list with play/pause,
 * speed and scrubbing. Exposes the same `sample()` contract as useRaceStream.
 */
export function useReplay(replay) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const clock = useRef({ base: 0, startedAt: 0 });
  const duration = replay?.durationMs ?? 0;

  const now = useCallback(() => {
    if (!playing) return clock.current.base;
    return Math.min(duration, clock.current.base + (performance.now() - clock.current.startedAt) * speed);
  }, [playing, speed, duration]);

  const seek = useCallback((t) => {
    clock.current = { base: Math.max(0, Math.min(duration, t)), startedAt: performance.now() };
    setTime(clock.current.base);
  }, [duration]);

  const toggle = useCallback(() => {
    const t = now();
    clock.current = { base: t >= duration ? 0 : t, startedAt: performance.now() };
    setPlaying((p) => !p);
  }, [now, duration]);

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

  const sample = useCallback(() => (replay ? frameAtTime(replay.frames, replay.tickMs, now()) : null), [replay, now]);

  const frame = replay ? frameAtTime(replay.frames, replay.tickMs, time) : null;

  // Splits up to the current time, from the official results.
  const splits = {};
  if (replay) {
    for (const r of replay.results) if (r.splitTimeMs <= time) splits[r.index] = r.splitTimeMs;
  }

  return { playing, speed, time, duration, frame, splits, sample, seek, toggle, setSpeed: changeSpeed };
}

