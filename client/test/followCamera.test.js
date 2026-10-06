import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Triangle, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf } from '../src/three/iceChannel';
import { layoutMarbles, MARBLE_RADIUS } from '../src/three/marbles';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');

const track = physicsTrack('bobsleigh-run');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const geometry = buildIceChannelGeometry(centerline, channel);
const entries = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, lane: i, topSpeed: 20 + i * 4, acceleration: 50 }));
const sim = simulatePhysicsRace({ seed: 3, track, entries, level: 3 });
const section = (name) => track.sections.find((s) => s.name === name);

/** The follow camera on its own (no renderer): what TrackScene does each frame. */
function followCamera(aspect) {
  const scene = Object.create(TrackScene.prototype);
  const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
  Object.assign(scene, { centerline, channel, track, scenery: null, camera });
  scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
  return scene;
}

describe('follow camera on Bobsleigh Run', () => {
  it('stays with its marble through the corkscrew: on its own level, never blocked by the level above, no jumps', () => {
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    mesh.updateMatrixWorld();
    const ray = new Raycaster();
    const { from, to } = section('Corkscrew');
    for (const aspect of [1.8, 0.6]) {
      const scene = followCamera(aspect);
      const out = [];
      let last = null;
      let frames = 0;
      for (let t = 0; t < sim.durationMs; t += 50) {
        const f = frameAtTime(sim.frames, sim.tickMs, t);
        const i = scene.followedIndex(f, 'leader', scene.main);
        if (f.p[i] < from - 0.03) continue; // start following just before it
        if (f.p[i] > to) break;
        layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false });
        scene.updateFollowCamera(out[i], f.p[i], 0.05, scene.main);
        const cam = scene.main.cam;
        if (last) expect(cam.distanceTo(last)).toBeLessThan(4); // 20 frames a second: smooth, no jumps
        last = cam.clone();
        if (f.p[i] < from) continue;
        frames += 1;
        // On the marble's own level: the levels are 30 m apart.
        expect(cam.y - out[i].y).toBeLessThan(20);
        expect(cam.y - out[i].y).toBeGreaterThan(0);
        // Nothing of the track between the camera and its marble.
        ray.set(cam, out[i].clone().sub(cam).normalize());
        ray.far = cam.distanceTo(out[i]) - 1;
        expect(ray.intersectObject(mesh)).toHaveLength(0);
      }
      expect(frames).toBeGreaterThan(50);
    }
  });
});

describe('marbles on the ice', () => {
  it('sit on the ice of the steep starting ramp and funnel, round and whole, never sunk into it', () => {
    // Every triangle of the drawn ice near the start.
    const pos = geometry.getAttribute('position');
    const tris = [];
    for (let k = 0; k < pos.count; k += 3) {
      const t = new Triangle(new Vector3().fromBufferAttribute(pos, k), new Vector3().fromBufferAttribute(pos, k + 1), new Vector3().fromBufferAttribute(pos, k + 2));
      if (t.a.distanceTo(centerline.samples[0].pos) < 120) tris.push(t);
    }
    const q = new Vector3();
    const gapToIce = (p) => Math.min(...tris.map((t) => t.closestPointToPoint(p, q).distanceTo(p))) - MARBLE_RADIUS;
    const out = [];
    for (const t of [0, 1000, 2500]) {
      const f = frameAtTime(sim.frames, sim.tickMs, t);
      layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false });
      for (let i = 0; i < 20; i += 1) {
        if (f.h[i] > 0.05) continue; // in the air
        const gap = gapToIce(out[i]);
        expect(gap).toBeGreaterThan(-0.005); // not in the ice (it was 0.22 m in, on the 52° ramp)…
        expect(gap).toBeLessThan(0.05); // …but on it
      }
    }
  });
});
