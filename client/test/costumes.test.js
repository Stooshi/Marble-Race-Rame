// The costume library: every costume builds, every costume a kit track uses
// exists and dresses the right kind of obstacle, and what a marble could roll
// into stays inside the obstacle's footprint, so marbles hit what they see.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Box3, Group, MeshLambertMaterial, Quaternion, Vector3 } from 'three';
import { COSTUMES, COSTUME_COLORS, PLACES_ON } from '../src/three/costumes';
import { FEATURE_COLORS } from '../src/three/trackFeatures';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');

const MARBLE_TOP = 1.1; // a marble rolling on the floor reaches this high (0.55 m radius)

/** Builds a costume at the origin, facing +z, and returns every vertex it made (world space) with its colour keys. */
function build(costume, size) {
  const points = [];
  const keys = new Set();
  const add = (key, geometry, matrix) => {
    keys.add(key);
    geometry.applyMatrix4(matrix);
    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) points.push(new Vector3().fromBufferAttribute(pos, i));
  };
  const group = new Group();
  const mat = (key) => { keys.add(key); return new MeshLambertMaterial(); };
  const moving = costume.build(add, mat, group, new Vector3(0, 0, 0), new Quaternion(), size);
  group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(group);
  return { points, keys, moving, box };
}

const kinds = (places) => Object.entries(COSTUMES).filter(([, c]) => c.places === places);

describe('the costume library', () => {
  it('has a colour for every colour key a costume uses', () => {
    for (const [name, c] of Object.entries(COSTUMES)) {
      if (!c.build) continue;
      const size = c.places === 'parked' ? { len: 10, width: 2.6, height: 3, drop: 1 } : { radius: 0.75, height: 1.2, l: 0.3, at: 0.5 };
      for (const key of build(c, size).keys) expect(COSTUME_COLORS[key] ?? FEATURE_COLORS[key], `${name}: colour ${key}`).toBeTruthy();
    }
  });

  it('every costume a kit track wears exists and dresses the kind of obstacle it stands on', () => {
    for (const track of PHYSICS_TRACKS.filter((t) => t.physics.kit)) {
      for (const f of track.physics.features.filter((x) => x.look && x.type !== 'cobbles')) { // (a braking surface's look is a surface, not a costume)
        const costume = COSTUMES[f.look];
        expect(costume, `${track.slug}: costume "${f.look}" is in the library`).toBeTruthy();
        expect(PLACES_ON[costume.places], `${track.slug}: "${f.look}" dresses a ${costume.places}`).toContain(f.type);
      }
    }
  });

  // Table Mountain Run's baboon is drawn as it was approved, its tail reaching out behind it (1.12 m).
  const KNOWN = { baboon: 1.15 };
  for (const [name, c] of kinds('block')) {
    it(`${name}: everything a rolling marble could touch is inside the block's footprint`, () => {
      const radius = 0.75;
      const { points, moving } = build(c, { radius, height: 1.2 });
      expect(points.length).toBeGreaterThan(20);
      const low = points.filter((p) => p.y < MARBLE_TOP);
      const reach = Math.max(...low.map((p) => Math.hypot(p.x, p.z)));
      expect(reach, `${name} reaches ${reach.toFixed(2)} m out at marble height`).toBeLessThanOrEqual(KNOWN[name] ?? radius + 0.25);
      expect(Array.isArray(moving)).toBe(true);
    });
  }

  for (const [name, c] of kinds('slalom')) {
    it(`${name}: a pole or piece no wider than its footprint`, () => {
      const radius = name === 'go-stone' ? 0.4 : 0.15;
      const { points } = build(c, { radius, height: name === 'go-stone' ? 0.6 : 1.6, l: 0.3, at: 0.5 });
      const low = points.filter((p) => p.y < MARBLE_TOP);
      expect(Math.max(...low.map((p) => Math.hypot(p.x, p.z)))).toBeLessThanOrEqual(radius + 0.05);
    });
  }

  for (const [name, c] of kinds('parked')) {
    it(`${name}: fills the parked footprint, its inner side where marbles hit it`, () => {
      const len = 10;
      const width = 2.6;
      const drop = 1;
      const { points } = build(c, { len, width, height: 3, drop });
      const xs = points.map((p) => p.x);
      const zs = points.map((p) => p.z);
      expect(Math.min(...xs), `${name}'s inner side`).toBeLessThanOrEqual(-width / 2 + 0.35);
      expect(Math.max(...zs) - Math.min(...zs), `${name}'s length`).toBeGreaterThanOrEqual(len * 0.85);
      expect(Math.min(...points.map((p) => p.y)), `${name} reaches down to the footprint`).toBeLessThanOrEqual(-drop + 0.1);
    });
  }

  it('Table Mountain Run\'s animals are library costumes, on the obstacles they dressed before', () => {
    expect(COSTUMES.baboon.places).toBe('block');
    expect(COSTUMES.giraffe.places).toBe('block');
    expect(COSTUMES.zebras.places).toBe('curtain');
    expect(COSTUMES.elephant.places).toBe('swipe');
  });
});
