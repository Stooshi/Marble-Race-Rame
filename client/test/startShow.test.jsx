// The start show (Moses, 26 Oct 2026): the track card while everything loads, a flyover of about three
// seconds (tap to skip), the camera at the gate with "Your gate", a big 3-2-1 with its beeps, then GO.
// Looks only: the race is untouched (the view is held back, never played faster to catch up).
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FLYOVER_CLEAR_M, FLYOVER_MS, flyoverPath, flyoverTop } from '../src/three/flyover';
import { FlyoverTitle, GateMoment, TrackCard } from '../src/components/StartShow';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// A winding track 1.2 km long, falling 120 m, with a tall landmark beside its middle.
function testTrack() {
  const samples = [];
  const n = 240;
  for (let i = 0; i <= n; i += 1) {
    const p = i / n;
    const pos = new Vector3(Math.sin(p * 9) * 80, 120 - p * 120, p * 1150);
    const ahead = new Vector3(Math.sin((p + 1 / n) * 9) * 80, 120 - (p + 1 / n) * 120, (p + 1 / n) * 1150);
    const tangent = ahead.clone().sub(pos).normalize();
    samples.push({ pos, tangent, side: new Vector3(tangent.z, 0, -tangent.x).normalize() });
  }
  return { samples, segments: n };
}

describe('the flyover', () => {
  const centerline = testTrack();
  const tower = { min: new Vector3(40, 0, 560), max: new Vector3(120, 230, 640) };
  const topAt = (x, z) => {
    let top = 120 - (z / 1150) * 120 + 22; // (the land under the track, with its trees)
    if (x >= tower.min.x && x <= tower.max.x && z >= tower.min.z && z <= tower.max.z) top = Math.max(top, tower.max.y);
    return top;
  };
  const path = flyoverPath(centerline, topAt);
  const poses = [];
  for (let ms = 0; ms <= FLYOVER_MS; ms += 20) poses.push({ ms, camera: path.poseAt(ms).camera.clone(), target: path.poseAt(ms).target.clone() });

  it('starts behind and above the start, ends above the finish looking at it', () => {
    const first = poses[0];
    const last = poses[poses.length - 1];
    expect(first.camera.z).toBeLessThan(centerline.samples[0].pos.z);
    expect(first.camera.y).toBeGreaterThan(centerline.samples[0].pos.y + 25);
    expect(last.target.distanceTo(centerline.samples[centerline.segments].pos)).toBeLessThan(60);
  });
  it(`never lower than ${FLYOVER_CLEAR_M} m over anything below it (the tall landmark too)`, () => {
    for (const { ms, camera } of poses) expect(camera.y - topAt(camera.x, camera.z), `${ms} ms`).toBeGreaterThan(FLYOVER_CLEAR_M - 2);
  });
  it('smooth: starts and ends at rest, no jumps between frames', () => {
    const steps = poses.slice(1).map((p, i) => p.camera.distanceTo(poses[i].camera));
    expect(steps[0]).toBeLessThan(1);
    expect(steps[steps.length - 1]).toBeLessThan(1);
    const biggest = Math.max(...steps);
    const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
    expect(biggest).toBeLessThan(mean * 2.2);
  });
  it('the height over the drawn scenery: the highest vertex near the spot, anything drawn (a tower too)', async () => {
    const { BoxGeometry, Group, Mesh } = await import('three');
    const g = new Group();
    const tower = new Mesh(new BoxGeometry(20, 160, 20));
    tower.position.set(100, 80, 100);
    g.add(tower);
    const top = flyoverTop({ groups: [g], trackBelow: () => 15 });
    expect(top(100, 100)).toBeCloseTo(160);
    expect(top(400, 400)).toBe(15);
  });
});

describe('the show on screen', () => {
  it('the track card: picture, name and series while loading', () => {
    const html = renderToString(<TrackCard track={{ slug: 'danube-night-run', name: 'Danube Night Run', difficulty: 'hard' }} />);
    expect(html).toContain('Danube Night Run');
    expect(html).toContain('Rivers');
    expect(html).toContain('Loading the track');
  });
  it('the flyover: the name, the series and "Tap to skip" (the whole picture skips)', () => {
    const html = renderToString(<FlyoverTitle track={{ slug: 'danube-night-run', name: 'Danube Night Run' }} onSkip={() => {}} />);
    expect(html).toContain('aria-label="Skip the flyover"');
    expect(html).toContain('Tap to skip');
  });
  it('at the gate: "Your gate" big (nothing for a viewer without a marble)', () => {
    expect(renderToString(<GateMoment gate={7} />)).toContain('7');
    expect(renderToString(<GateMoment gate={null} />)).toBe('');
  });
  it('the timing: flyover 3.5 s, then the 5 s countdown: "Your gate" for 2 s, a big 3-2-1, GO for 1 s; never caught up', () => {
    const viewer = src('src/components/LiveRaceViewer3D.jsx');
    expect(viewer).toContain('const FLYOVER_SHOW_MS = 3500;');
    expect(viewer).toContain('const COUNT_FROM_MS = 3000;');
    expect(viewer).toContain('const GO_SHOWN_MS = 1000;');
    expect(viewer).toContain('holdBack?.(lag, go, { stay: true });');
    // (Standings only from GO; the camera buttons and the corner view only once the race is on.)
    expect(viewer).toContain("hidden={phase !== 'race'}");
    expect(viewer).toContain("visible={inset !== null && phase === 'race'}");
    expect(src('src/hooks/useRaceStream.js')).toContain('decayFrom: stay ? Infinity');
  });
  it('rooms and Quick race: the flyover over the extra countdown, by the race clock (in sync), no hold, a local skip', () => {
    const viewer = src('src/components/LiveRaceViewer3D.jsx');
    expect(viewer).toContain('const roomShow = !intro && countdownMs > COUNTDOWN_MS;');
    expect(viewer).toContain('const ms = f.t + countdownMs;');
    expect(viewer).toContain('const lag = flying ? 0 : holdFor(go, COUNTDOWN_MS);');
    expect(viewer).toContain("if (fly.room) { setPhase('race'); return; }");
    expect(src('src/pages/Race.jsx')).toContain('countdownMs={meta?.countdownMs ?? race?.countdown_ms ?? 5000}');
  });
  it('the room page builds the scene during the wait; the race page takes it over; Start now alone in Quick race', () => {
    const room = src('src/site/pages/RoomPage.jsx');
    expect(room).toContain('preloadScene({');
    expect(room).toContain("quick && open && waiting && me?.inRace && view.players.length === 1");
    expect(room).toContain('api.roomStartNow(code)');
    expect(src('src/hooks/useTrackScene.js')).toContain('takeScene(adoptFor)');
  });
});

describe('the scene pool', () => {
  it('hands over only the scene built for that race, once', async () => {
    const { takeScene, pooledRace } = await import('../src/three/scenePool');
    expect(pooledRace()).toBe(null);
    expect(takeScene('r1')).toBe(null);
  });
});
