/**
 * One 3D scene built ahead of time (Moses, 26 Oct 2026: in Quick race and rooms the 3D scene loads
 * during the waiting time, so after the timer the start show is just the flyover, the gate and the
 * countdown). The room page builds its race's track here while the players wait (`preloadScene`); the
 * race page takes it over when it opens (`takeScene`, through useTrackScene's `adoptFor`) instead of
 * building its own. At most one scene is kept, for one race, and only for a few minutes.
 */
import { graphicsReport } from './diagnostics';

const KEEP_MS = 5 * 60_000;
let pooled = null; // { raceId, slug, canvas, scene, ready: Promise, timer }

function drop() {
  if (!pooled) return;
  clearTimeout(pooled.timer);
  try { pooled.scene?.dispose(); } catch { /* (gone) */ }
  pooled = null;
}

/**
 * Builds `track` (a race page's preload object: id, slug, name, length_m, lane_count, waypoints,
 * obstacles, physics) for race `raceId`, unless it is already being built. Quietly does nothing
 * without WebGL 2 or on any failure: the race page then builds its own, as before.
 */
export async function preloadScene({ raceId, track }) {
  if (typeof document === 'undefined' || !raceId || !track?.physics) return null;
  raceId = String(raceId);
  if (pooled?.raceId === raceId && pooled.slug === track.slug) return pooled.ready;
  drop();
  try {
    if (!graphicsReport().webgl2.ok) return null;
    const entry = { raceId, slug: track.slug, canvas: document.createElement('canvas'), scene: null, ready: null, timer: null };
    pooled = entry;
    entry.ready = (async () => {
      const { TrackScene } = await import('./TrackScene');
      if (pooled !== entry) return null;
      entry.canvas.className = 'preview3d__canvas';
      entry.canvas.setAttribute('aria-label', 'Live race in 3D');
      const scene = new TrackScene(entry.canvas);
      entry.scene = scene;
      scene.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
      scene.setTrack(track);
      await scene.whenReady();
      scene.flyoverFor(); // (the flight worked out now too)
      return scene;
    })().catch(() => { if (pooled === entry) drop(); return null; });
    entry.timer = setTimeout(() => { if (pooled === entry) drop(); }, KEEP_MS);
    return entry.ready;
  } catch {
    drop();
    return null;
  }
}

/** The scene built for race `raceId`, handed over (the pool forgets it), or null. */
export function takeScene(raceId) {
  raceId = String(raceId);
  if (!pooled || pooled.raceId !== raceId || !pooled.scene) return null;
  const entry = pooled;
  clearTimeout(entry.timer);
  pooled = null;
  return entry;
}

/** For tests: what the pool holds. */
export const pooledRace = () => pooled?.raceId ?? null;
