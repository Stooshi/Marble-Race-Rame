import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Triangle, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf, placeOnChannel } from '../src/three/iceChannel';
import { layoutMarbles, MARBLE_RADIUS, PEN_DROP } from '../src/three/marbles';
import { buildSanFrancisco } from '../src/three/scenery/sanFrancisco';
import { themeFor } from '../src/three/themes';
import { buildTrackFeatures, seaLionFlop } from '../src/three/trackFeatures';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');
const server = require('../../src/game/trackFeatures');

const track = physicsTrack('san-francisco');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const geometry = buildIceChannelGeometry(centerline, channel);
const entries = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, lane: i, topSpeed: 20 + i * 4, acceleration: 50 }));
const sim = simulatePhysicsRace({ seed: 3, track, entries, level: 3 });

// The 3D view draws onto canvases; tests run without a browser.
// (A 2D context that accepts anything: gradients, fills.)
const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= {
  createElement: () => ({ getContext: () => anything, width: 0, height: 0 }),
};

describe('San Francisco (3D)', () => {
  it('is a racing channel dressed as a street', () => {
    expect(channel.look).toBe('street');
    expect(channelOf(physicsTrack('bobsleigh-run'), buildCenterline(physicsTrack('bobsleigh-run'))).look).toBe('ice');
  });

  it('keeps the follow camera with the leader the whole race: above it, never blocked by the street, no jumps (desktop and phone)', { timeout: 120_000 }, () => {
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    mesh.updateMatrixWorld();
    const ray = new Raycaster();
    for (const aspect of [1.8, 0.6]) {
      const scene = Object.create(TrackScene.prototype);
      const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
      Object.assign(scene, { centerline, channel, track, scenery: null, camera });
      scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
      const out = [];
      let last = null;
      let lastAt = null;
      let checked = 0;
      for (let t = 0; t < sim.durationMs; t += 50) {
        const f = frameAtTime(sim.frames, sim.tickMs, t);
        const i = scene.followedIndex(f, 'leader', scene.main);
        if (f.p[i] >= 1) break;
        layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false });
        scene.updateFollowCamera(out[i], f.p[i], 0.05, scene.main);
        const cam = scene.main.cam;
        // 20 frames a second: smooth, no jumps. At up to 180 km/h the marble itself covers 2.5 m a frame,
        // so the camera may move a little more than that while it eases along behind (never a leap).
        if (last) expect(cam.distanceTo(last)).toBeLessThan(Math.max(4, 1.8 * out[i].distanceTo(lastAt)));
        last = cam.clone();
        lastAt = out[i].clone();
        if (t % 250 !== 0) continue;
        checked += 1;
        expect(cam.y - out[i].y).toBeGreaterThan(0);
        ray.set(cam, out[i].clone().sub(cam).normalize());
        ray.far = cam.distanceTo(out[i]) - 1;
        expect(ray.intersectObject(mesh)).toHaveLength(0);
      }
      expect(checked).toBeGreaterThan(100);
    }
  });

  it('films the finish from behind the line: the line, the catch area and the Golden Gate beyond, all in view (desktop and phone)', () => {
    const scenery = buildSanFrancisco(centerline, track, themeFor('san-francisco'));
    const end = centerline.samples[centerline.segments];
    const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
    // The ground dips under the catch area past the line (it never buries it), and the bay opens beyond it.
    const pen = track.physics.runout;
    for (let d = 0; d <= pen.length; d += 2) {
      const at = end.pos.clone().addScaledVector(forward, d);
      expect(scenery.userData.groundAt(at.x, at.z)).toBeLessThan(at.y - d * PEN_DROP - 0.3);
    }
    const bay = end.pos.clone().addScaledVector(forward, pen.length + 40);
    expect(scenery.userData.groundAt(bay.x, bay.z)).toBeLessThan(-1.2);
    // The bridge straight ahead across the bay.
    const bridge = scenery.children.find((c) => c.name === 'golden gate');
    const ahead = bridge.position.clone().sub(end.pos).setY(0);
    expect(ahead.dot(forward)).toBeGreaterThan(400);
    expect(Math.abs(ahead.clone().cross(forward).y)).toBeLessThan(10);
    for (const aspect of [1.8, 0.56]) {
      const scene = Object.create(TrackScene.prototype);
      const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
      Object.assign(scene, { centerline, channel, track, camera });
      const shot = scene.finishShot();
      camera.position.copy(shot.camera);
      camera.lookAt(shot.target);
      camera.updateMatrixWorld();
      const seen = (p) => {
        const v = p.clone().project(camera);
        return Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1;
      };
      // The middle of the line, the cushion at the end of the catch area, and the top of the bridge's towers.
      expect(seen(end.pos)).toBe(true);
      expect(seen(end.pos.clone().addScaledVector(forward, pen.length).setY(end.pos.y - pen.length * PEN_DROP))).toBe(true);
      expect(seen(bridge.position.clone().setY(60))).toBe(true);
      // Well under the finish banner (14 m up), so it stays out of the picture.
      expect(shot.camera.y - end.pos.y).toBeLessThan(10);
      expect(seen(end.pos.clone().setY(end.pos.y + 13.3))).toBe(false);
    }
  });

  it('sits the waiting and starting marbles on the street of the steep ramp, never sunk into it', () => {
    const pos = geometry.getAttribute('position');
    const tris = [];
    for (let k = 0; k < pos.count; k += 3) {
      const t = new Triangle(new Vector3().fromBufferAttribute(pos, k), new Vector3().fromBufferAttribute(pos, k + 1), new Vector3().fromBufferAttribute(pos, k + 2));
      if (t.a.distanceTo(centerline.samples[0].pos) < 120) tris.push(t);
    }
    const q = new Vector3();
    const out = [];
    for (const t of [0, 1000, 2500]) {
      const f = frameAtTime(sim.frames, sim.tickMs, t);
      layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false });
      for (let i = 0; i < 20; i += 1) {
        if (f.h[i] > 0.05) continue;
        const gap = Math.min(...tris.map((tr) => tr.closestPointToPoint(out[i], q).distanceTo(out[i]))) - MARBLE_RADIUS;
        expect(gap).toBeGreaterThan(-0.005);
        expect(gap).toBeLessThan(0.05);
      }
    }
  });

  it('draws the cable car exactly where the physics has it while it crosses, and only outside the street otherwise', () => {
    const built = buildTrackFeatures(centerline, channel, track.physics.features);
    const car = built.group.children.find((c) => c.name === 'cable_car');
    const feature = track.physics.features.find((f) => f.type === 'cable_car');
    const across = channel.radius * channel.maxAngle;
    for (let t = 0; t < 30000; t += 333) {
      built.update(t);
      const c = server.cableCar(t / 1000 + feature.phase);
      const solid = built.solidsAt(t).find((o) => o.type === 'cable_car');
      if (!c) {
        // Driving in or out along its rails: drawn only beyond the channel, where it cannot touch a marble.
        if (car.visible) {
          car.geometry.computeBoundingBox();
          const centre = car.geometry.boundingBox.getCenter(new Vector3());
          const middle = centerline.samples[Math.round(feature.at * centerline.segments)].pos;
          expect(Math.hypot(centre.x - middle.x, centre.z - middle.z)).toBeGreaterThan(channel.radius + feature.length / 2);
        }
        expect(solid.xa).toBeGreaterThan(1000);
        continue;
      }
      expect(car.visible).toBe(true);
      // The same footprint as the physics: centre travelling from beyond one rim to beyond the other.
      const travel = across + feature.length / 2 + 1;
      const centre = c.dir * (-travel + 2 * travel * c.k);
      expect((solid.xa + solid.xb) / 2).toBeCloseTo(centre, 6);
      expect(solid.xb - solid.xa).toBeCloseTo(feature.length, 6);
    }
    // San Francisco's furniture and the sea lion colony are drawn; its flower beds and docks are scenery the physics never sees.
    const names = built.group.children.map((c) => c.name);
    for (const part of ['newsBox', 'hydrant', 'seaLion', 'dock', 'rail', 'street', 'leaf', 'trashCan', 'busWhite']) expect(names).toContain(part);
    expect(server.normaliseFeatures(track.physics.features, 1000).some((f) => f.type === 'flowers' || f.type === 'sea_lion_colony')).toBe(false);
  });

  it('draws the flopping sea lions exactly where the physics has them: on their perches, or lying in the street', () => {
    expect(seaLionFlop).toBeDefined();
    for (let t = -2; t < 30; t += 0.041) expect(seaLionFlop(t)).toBeCloseTo(server.seaLionFlop(t), 12);
    const built = buildTrackFeatures(centerline, channel, track.physics.features);
    const bodies = built.group.children.filter((c) => c.name === 'flopping sea lion');
    const seals = track.physics.features.filter((f) => f.type === 'sea_lion');
    expect(bodies).toHaveLength(seals.length);
    const across = channel.radius * channel.maxAngle;
    let lying = 0;
    for (let t = 0; t < 20000; t += 250) {
      built.update(t);
      const solids = built.solidsAt(t).filter((o) => o.type === 'sea_lion');
      seals.forEach((f, n) => {
        const k = server.seaLionFlop(t / 1000 + f.flop);
        if (k <= 0) {
          expect(solids[n].xa).toBeGreaterThan(1000); // on its perch: nothing in the street
          return;
        }
        // Its footprint where the physics has it…
        const x = (f.l + (f.reach - f.l) * k) * across;
        expect(solids[n].xa).toBeCloseTo(x, 6);
        if (k < 1) return;
        // …and lying right there on the street (its body over that spot).
        lying += 1;
        const spot = placeOnChannel(centerline, channel, f.at, f.reach, 0, 0, 0);
        expect(bodies[n].position.distanceTo(spot)).toBeLessThan(0.05);
      });
    }
    expect(lying).toBeGreaterThan(20);
  });
});
