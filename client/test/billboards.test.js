// Billboards beside kit tracks: standard panels in themed frames, two draw calls for
// all of them, our own promotions until the server's images load, never blank.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { layoutMarbles } from '../src/three/marbles';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildBillboards, boardPose, FRAMES, PANEL, PROMOTIONS } from '../src/three/billboards';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
const { FRAMES: KIT_FRAMES } = require('../../src/trackKit/parts');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');
const { houseField } = require('../../scripts/race-fingerprints');

// A 2D canvas that records what is painted where.
const painted = [];
const ctx = new Proxy({}, {
  get: (_, key) => {
    if (key === 'drawImage') return (img, x, y, w, h) => painted.push({ src: img.src, x, y, w, h });
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set: () => true,
});
globalThis.document ??= { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) };

// Images that load (or fail) when told to.
const images = [];
globalThis.Image = class {
  constructor() { images.push(this); }
  set src(v) { this._src = v; }
  get src() { return this._src; }
};

const track = PHYSICS_TRACKS.find((t) => t.slug === 'kit-proving-ground');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);

describe('billboards', () => {
  it('every frame the kit allows can be drawn, and there is a promotion for every slot', () => {
    expect(Object.keys(FRAMES).sort()).toEqual([...KIT_FRAMES].sort());
    expect(PROMOTIONS.length).toBeGreaterThanOrEqual(6);
    expect(PANEL.width / PANEL.height).toBe(2);
  });

  it('Kit Proving Ground\'s boards: one frames mesh and one panels mesh, a 6 m x 3 m panel each', () => {
    const built = buildBillboards(centerline, channel, track.physics.kit);
    expect(built.slots).toEqual(track.physics.kit.billboards.map((b) => b.slot));
    expect(built.group.children.map((c) => c.name)).toEqual(['billboard frames', 'billboard panels']);
    const pos = built.group.getObjectByName('billboard panels').geometry.getAttribute('position');
    expect(pos.count).toBe(6 * built.slots.length);
    for (let k = 0; k < built.slots.length; k += 1) {
      const a = new Vector3().fromBufferAttribute(pos, k * 6);
      const b = new Vector3().fromBufferAttribute(pos, k * 6 + 1);
      const c = new Vector3().fromBufferAttribute(pos, k * 6 + 2);
      expect(a.distanceTo(b)).toBeCloseTo(PANEL.width, 3);
      expect(b.distanceTo(c)).toBeCloseTo(PANEL.height, 3);
    }
  });

  it('each board stands outside the channel, on its own side, facing back up the track toward the camera', () => {
    for (const b of track.physics.kit.billboards) {
      const { foot, facing } = boardPose(centerline, channel, b);
      const s = centerline.samples[Math.round(b.at * centerline.segments)];
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      const away = new Vector3(foot.x - s.pos.x, 0, foot.z - s.pos.z);
      expect(away.length()).toBeGreaterThan(channel.radius * Math.sin(channel.maxAngle) + 2); // clear of the rim
      expect(Math.sign(away.dot(side))).toBe(b.side);
      expect(facing.dot(new Vector3(s.tangent.x, 0, s.tangent.z).normalize())).toBeLessThan(-0.8);
      // Nearest edge of the panel still beside the channel, not over it.
      expect(away.length() - (PANEL.width / 2) * Math.sin(0.42)).toBeGreaterThan(channel.radius * Math.sin(channel.maxAngle) + 0.45);
    }
  });

  it('the server\'s images go on their slots when they load; others keep the promotion', () => {
    const built = buildBillboards(centerline, channel, track.physics.kit);
    painted.length = 0;
    images.length = 0;
    built.setImages([
      { slot: 2, image_url: 'https://store.example/winter.png' },
      { slot: 4, image_url: 'http://insecure.example/x.png' }, // never anything but https
      { slot: 9, image_url: 'https://store.example/nowhere.png' }, // no such slot
    ]);
    expect(images.map((i) => i.src)).toEqual(['https://store.example/winter.png']);
    expect(images[0].crossOrigin).toBe('anonymous');
    images[0].onload();
    expect(painted).toEqual([{ src: 'https://store.example/winter.png', x: 1024, y: 0, w: 1024, h: 512 }]); // slot 2: second cell
    // A newer set of images wins over one still loading.
    built.setImages([{ slot: 1, image_url: 'https://store.example/a.png' }]);
    built.setImages([{ slot: 1, image_url: 'https://store.example/b.png' }]);
    images.at(-2).onload();
    expect(painted.at(-1).src).toBe('https://store.example/winter.png');
    images.at(-1).onload();
    expect(painted.at(-1).src).toBe('https://store.example/b.png');
  });

  it('tracks without billboards get none', () => {
    for (const t of PHYSICS_TRACKS.filter((x) => !x.physics.kit)) {
      const c = buildCenterline(t);
      expect(buildBillboards(c, channelOf(t, c), t.physics.kit)).toBeNull();
    }
  });

  it('the follow camera is never blocked by a billboard, through whole races, on phone and computer screens', { timeout: 120_000 }, () => {
    const built = buildBillboards(centerline, channel, track.physics.kit);
    built.group.updateMatrixWorld(true);
    const meshes = built.group.children;
    const ray = new Raycaster();
    for (const [seed, aspect] of [[7, 1.8], [11, 0.6]]) {
      const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
      const scene = Object.create(TrackScene.prototype);
      const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
      Object.assign(scene, { centerline, channel, track, scenery: null, camera });
      scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
      const out = [];
      for (let t = 0; t < sim.durationMs; t += 50) {
        const f = frameAtTime(sim.frames, sim.tickMs, t);
        const i = scene.followedIndex(f, 'leader', scene.main);
        layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false });
        scene.updateFollowCamera(out[i], f.p[i], 0.05, scene.main);
        const cam = scene.main.cam;
        ray.set(cam, out[i].clone().sub(cam).normalize());
        ray.far = cam.distanceTo(out[i]) - 0.6;
        expect(ray.intersectObjects(meshes, false).map((h) => h.object.name), `t ${t} ms`).toEqual([]);
      }
    }
  });
});
