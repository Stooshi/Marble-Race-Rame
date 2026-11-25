import { useEffect, useState } from 'react';

const KEY = 'marble-race-fps';

/** Whether the frame-rate counter is on (remembered on this device), and a switch for it. */
export function useFrameMeter() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => setOn((was) => {
    try {
      localStorage.setItem(KEY, was ? '0' : '1');
    } catch {
      // (private browsing: on for this visit only)
    }
    return !was;
  });
  return { on, toggle };
}

/**
 * A small frame-rate counter over the 3D view, for reading out real numbers
 * from a phone: frames a second, the longest gap between two frames lately,
 * how many hold-ups (frames more than 0.1 s apart) this race, and what the
 * view is drawing (phone version or full, scenery off with ?scenery=0,
 * sharpness, triangles).
 */
export default function FrameMeter({ sceneRef }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const read = () => setStats(sceneRef.current?.frameStats?.() ?? null);
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, [sceneRef]);
  if (!stats) return null;
  const level = stats.fps >= 50 ? 'is-good' : stats.fps >= 30 ? 'is-ok' : 'is-bad';
  return (
    <div className="frame-meter" role="status" aria-label="Frame rate">
      <strong className={level}>{stats.fps} fps</strong>
      <span>slowest {stats.worstMs} ms</span>
      <span>hold-ups {stats.hitches}</span>
      <span>{stats.lite ? 'phone' : 'full'}{stats.scenery === false ? ' · no scenery' : ''} · {stats.pixelRatio}× · {Math.round(stats.triangles / 1000)}k</span>
    </div>
  );
}
