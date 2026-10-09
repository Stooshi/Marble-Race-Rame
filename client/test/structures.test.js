// Tunnels, caves, the dragon, bridges and waterfalls (track kit structures):
// they build on phones and computers, and the follow camera is never blocked by
// any of them, checked frame by frame through a real race, as on Bobsleigh Run.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { layoutMarbles } from '../src/three/marbles';
import { buildStructures } from '../src/three/structures';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';

const require = createRequire(import.meta.url);
const { physicsTrack, PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');
const { houseField } = require('../../scripts/race-fingerprints');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const track = physicsTrack('kit-proving-ground');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const kitSections = track.physics.kit.sections;

/** The follow camera on its own (no renderer): what TrackScene does each frame. */
function followCamera(aspect) {
  const scene = Object.create(TrackScene.prototype);
  const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
  Object.assign(scene, { centerline, channel, track, scenery: null, camera });
  scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
  return scene;
}

/** What can hide a marble: solid, drawn faces (see-through water, spray and the ice cave's glassy walls can't). */
function solidMeshes(group) {
  const out = [];
  group.traverse((o) => { if (o.isMesh && !o.material.transparent) out.push(o); });
  return out;
}

describe('track structures', () => {
  it('only kit tracks have them: today\'s tracks build none', () => {
    for (const t of PHYSICS_TRACKS.filter((x) => !x.physics.kit)) {
      const c = buildCenterline(t);
      expect(buildStructures(c, channelOf(t, c), t.physics.kit)).toBeNull();
    }
  });

  for (const lite of [false, true]) {
    it(`Kit Proving Ground's tunnels, cave, dragon, bridge and waterfall build (${lite ? 'phone' : 'computer'})`, () => {
      const built = buildStructures(centerline, channel, track.physics.kit, { lite });
      const names = [];
      built.group.traverse((o) => names.push(o.name));
      for (const name of ['tunnel:mine', 'tunnel:ice-cave', 'tunnel:dragon', 'waterfall-water', 'waterfall-curtain', 'waterfall-spray', 'plank', 'tooth']) {
        expect(names, name).toContain(name);
      }
      expect(() => built.update(12_345)).not.toThrow();
    });
  }

  it('every face of a tunnel\'s arch faces inward, so from outside it is never drawn', () => {
    const built = buildStructures(centerline, channel, track.physics.kit);
    const arches = [];
    built.group.traverse((o) => { if (o.name.startsWith('tunnel:')) arches.push(o); });
    for (const mesh of arches) {
      const s = kitSections.find((x) => `tunnel:${x.tunnel}` === mesh.name);
      const pos = mesh.geometry.getAttribute('position');
      let outward = 0;
      const a = new Vector3();
      const b = new Vector3();
      const c = new Vector3();
      for (let k = 0; k < pos.count; k += 3) {
        a.fromBufferAttribute(pos, k);
        b.fromBufferAttribute(pos, k + 1);
        c.fromBufferAttribute(pos, k + 2);
        const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
        const mid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
        // The track's middle at this point, a little up: the inside.
        const p = s.from + (s.to - s.from) * 0.5;
        const f = Math.min(1, Math.max(0, p)) * centerline.segments;
        const near = centerline.samples.reduce((best, smp) => (smp.pos.distanceTo(mid) < best.pos.distanceTo(mid) ? smp : best), centerline.samples[Math.floor(f)]);
        const inside = near.pos.clone().add(new Vector3(0, 2.5, 0));
        if (n.dot(inside.sub(mid)) < 0) outward += 1;
      }
      expect(outward, `${mesh.name}: faces pointing outward`).toBe(0);
    }
  });

  it('the follow camera is never blocked by any of them, through a whole race, on phone and computer screens', () => {
    const built = buildStructures(centerline, channel, track.physics.kit);
    built.group.updateMatrixWorld(true);
    const solids = solidMeshes(built.group);
    const ray = new Raycaster();
    const spans = kitSections.filter((s) => s.tunnel || s.bridge || s.waterfall);
    const inSpan = (p) => spans.some((s) => p > s.from - 0.01 && p < s.to + 0.01);
    for (const [seed, aspect] of [[7, 1.8], [11, 0.6]]) {
      const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
      const scene = followCamera(aspect);
      const out = [];
      let checked = 0;
      for (let t = 0; t < sim.durationMs; t += 50) {
        const f = frameAtTime(sim.frames, sim.tickMs, t);
        const i = scene.followedIndex(f, 'leader', scene.main);
        layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false });
        scene.updateFollowCamera(out[i], f.p[i], 0.05, scene.main);
        if (!inSpan(f.p[i])) continue;
        const cam = scene.main.cam;
        ray.set(cam, out[i].clone().sub(cam).normalize());
        ray.far = cam.distanceTo(out[i]) - 0.6;
        const hits = ray.intersectObjects(solids, false);
        expect(hits.map((h) => h.object.name), `t ${t} ms, marble at ${f.p[i].toFixed(4)}`).toEqual([]);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(60);
    }
  });
});
