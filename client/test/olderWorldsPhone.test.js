// The three older hand-built worlds on phones (Moses, 27 Oct 2026: Bobsleigh Run, San Francisco and Table
// Mountain Run within 35 draw calls in the race and the flyover): the same picture in fewer pieces. The
// ground in a few pieces, every kind of copy (trees, bushes, rocks, houses, the city) in one draw call, the
// buildings in one, and every marble's boost streak and booster flame in one instanced call each.
// Computers keep their pieces (they can cull finer). Looks only: the race never sees any of it.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { InstancedMesh, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { buildAlpine } from '../src/three/scenery/alpine';
import { buildCapeTown } from '../src/three/scenery/capeTown';
import { buildSanFrancisco } from '../src/three/scenery/sanFrancisco';
import { themeFor } from '../src/three/themes';
import { buildTrackFeatures } from '../src/three/trackFeatures';
import { channelOf, channelPieceSize } from '../src/three/iceChannel';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');
const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const WORLDS = [['bobsleigh-run', buildAlpine], ['san-francisco', buildSanFrancisco], ['table-mountain-run', buildCapeTown]];
const meshesOf = (g, name) => {
  const out = [];
  g.getObjectByName(name)?.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
};

describe('the older worlds on phones: fewer pieces, the same picture', () => {
  for (const [slug, build] of WORLDS) {
    const track = physicsTrack(slug);
    const centerline = buildCenterline(track);
    const phone = build(centerline, track, themeFor(slug, track), { lite: true });
    const computer = build(centerline, track, themeFor(slug, track), {});
    it(`${slug}: the ground in at most 9 pieces, each kind of copy in one draw call, the buildings in one`, () => {
      expect(meshesOf(phone, 'terrain').length).toBeLessThanOrEqual(9);
      expect(meshesOf(computer, 'terrain').length).toBe(36); // (computers unchanged)
      const kinds = phone.children.filter((g) => g.children.some((o) => o instanceof InstancedMesh));
      expect(kinds.length).toBeGreaterThan(0);
      for (const g of kinds) expect(g.children.length, g.name).toBe(1);
      const buildings = phone.getObjectByName('buildings');
      if (buildings) expect(buildings.children.length).toBeLessThanOrEqual(2);
      // Every copy still there: as many trees, houses and buildings as on the computer's lite count.
      const copies = (g) => kinds.filter((k) => k.name === g).reduce((n, k) => n + k.children[0].count, 0);
      for (const k of kinds) expect(copies(k.name)).toBeGreaterThan(0);
    });
  }

  it('the track itself in bigger pieces on phones (60 m, was 40 m); computers and kit tracks unchanged', () => {
    const sf = physicsTrack('san-francisco');
    expect(channelPieceSize(sf, true)).toBe(60);
    expect(channelPieceSize(sf, false)).toBe(40);
    expect(channelPieceSize({ physics: { kit: {} } }, true)).toBe(200);
    expect(channelPieceSize({ physics: { kit: {} } }, false)).toBe(150);
  });

  it('a boost pad with the whole field on it: the streaks and flames in three instanced calls on a phone', () => {
    const track = physicsTrack('san-francisco');
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const phone = buildTrackFeatures(centerline, channel, track.physics.features, { lite: true, compact: true, area: 1000 });
    const pad = channel && track.physics.features.find((f) => f.type === 'boost');
    expect(pad).toBeTruthy();
    // Ten marbles just past the pad, then a draw: every effect is in the three pools, none a mesh of its own.
    const n = 10;
    const before = { p: Array(n).fill(pad.at - 0.002), l: Array(n).fill(pad.l ?? 0) };
    const after = { p: Array(n).fill(pad.at + 0.002), l: Array(n).fill(pad.l ?? 0) };
    const positions = Array.from({ length: n }, (_, i) => new Vector3(i, 0, 0));
    phone.update(1000, { frame: before, positions, contacts: [] });
    phone.update(1100, { frame: after, positions: positions.map((p) => p.clone().add(new Vector3(0, 0, 1))), contacts: [] });
    const pools = phone.group.children.filter((o) => o instanceof InstancedMesh && o.visible);
    expect(pools.length).toBe(3);
    for (const pool of pools) expect(pool.count).toBe(n);
    const loose = phone.group.children.filter((o) => o.isMesh && !(o instanceof InstancedMesh) && o.visible && /booster|ffd21f/.test(o.name + (o.material?.color?.getHexString?.() ?? '')));
    expect(loose).toEqual([]);
  });
});
