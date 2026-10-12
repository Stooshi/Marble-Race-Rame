// The kit scenery: every kit track is buried in the ground (track recipe), its
// people, landmarks and lifts build, and lifts stay high above the track.
import { createRequire } from 'node:module';
import { Color, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf, lookAt, WATER_COLORS, STONE_COLORS, SNOW_COLORS } from '../src/three/iceChannel';
import { COSTUMES } from '../src/three/costumes';
import { buildTrackFeatures } from '../src/three/trackFeatures';
import { PEOPLE } from '../src/three/scenery/kitProps';
import { buildScenery } from '../src/three/scenery';
import { buildStructures } from '../src/three/structures';
import { themeFor } from '../src/three/themes';
import { flaggedStretches, wallExposure } from '../src/three/scenery/groundCheck';
import { buildCoaster, coasterFlight, liftHillCut, liftHillOf, liftHillRaise } from '../src/three/scenery/coaster';
import { buildPinball } from '../src/three/scenery/pinball';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const kitTracks = PHYSICS_TRACKS.filter((t) => t.physics.kit);

/** The kit scenery and structures for a track, and what the ground check counts as ground and as built. */
function world(track, lite) {
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);
  const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite });
  const structures = buildStructures(centerline, channel, track.physics.kit, { lite });
  const ground = [];
  const built = [];
  for (const g of [scenery, structures?.group].filter(Boolean)) {
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.ground) ground.push(o);
      if (o.userData.built) built.push(o);
    });
  }
  return { centerline, channel, scenery, ground, built };
}

describe('kit scenery', () => {
  for (const track of kitTracks) {
    for (const lite of [false, true]) {
      it(`${track.slug} is buried in the ground, never a halfpipe on it (${lite ? 'phone' : 'computer'})`, { timeout: 120_000 }, () => {
        const { centerline, channel, ground, built } = world(track, lite);
        const exposure = wallExposure(centerline, channel, track, ground, built);
        const flagged = flaggedStretches(exposure, channel.arc);
        expect(flagged.map((f) => `${f.metres} m at ${(f.from * 100).toFixed(0)}%: ${f.why} (worst ${f.worst.toFixed(1)} m) [${f.sections.join(', ')}]`)).toEqual([]);
        // On normal terrain the ground meets the rim (nothing of the outer wall shows).
        const normal = exposure.filter((e) => e.kind === 'normal');
        // (A coaster flies on supports and is on the land only where it touches down.)
        expect(normal.length).toBeGreaterThan(track.physics.kit.coaster ? 20 : 200);
      });
    }
  }

  it('Kit Proving Ground\'s people, landmarks and lifts are there, and the lift cabins stay high above the track', () => {
    const track = kitTracks.find((t) => t.slug === 'kit-proving-ground');
    const { scenery, centerline } = world(track, false);
    const names = [];
    scenery.traverse((o) => names.push(o.name));
    for (const name of ['banks', 'viaduct', 'scenery: still', 'figures', 'figures:still', 'figures:moving', 'lift:gondola', 'cables']) expect(names, name).toContain(name);
    const lift = scenery.getObjectByName('lift:gondola');
    // Cabins: any cabin within 12 m of the track on the ground plan is at least 12 m above it.
    const mtx = new Matrix4();
    const p = new Vector3();
    for (const t of [0, 7_000, 23_500, 51_000]) {
      scenery.userData.update(t);
      for (let n = 0; n < lift.count; n += 1) {
        lift.getMatrixAt(n, mtx);
        p.setFromMatrixPosition(mtx);
        for (const s of centerline.samples) {
          if (Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < 12) expect(p.y - 3.2 - s.pos.y).toBeGreaterThan(12);
        }
      }
    }
  });

  it('every kit track\'s figures are people, animals or block costumes the view can draw', () => {
    for (const track of kitTracks) {
      for (const sec of track.physics.kit.sections) {
        for (const name of sec.figures ?? []) expect(PEOPLE[name] || COSTUMES[name]?.places === 'block', `${track.slug} ${sec.name}: ${name}`).toBeTruthy();
      }
    }
  });

  it('a section\'s own surface dresses its stretch of channel (the rest wears the track\'s)', () => {
    const track = kitTracks.find((t) => t.slug === 'kit-proving-ground');
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    expect(channel.look).toBe('snow');
    const geometry = buildIceChannelGeometry(centerline, channel);
    const colours = geometry.getAttribute('color');
    const starts = geometry.userData.segmentStarts;
    const floorColour = (p) => {
      const i = Math.round(p * centerline.segments);
      const v = starts[i] + 6 * 7; // a floor strip near the middle of the segment
      return `#${new Color(colours.getX(v), colours.getY(v), colours.getZ(v)).getHexString()}`;
    };
    const kit = track.physics.kit.sections;
    const mid = (name) => { const x = kit.find((k) => k.name === name); return (x.from + x.to) / 2; };
    expect(lookAt(channel, mid('Pool') * channel.arc)).toBe('water');
    expect([WATER_COLORS.iceA, WATER_COLORS.iceB]).toContain(floorColour(mid('Pool')));
    expect([STONE_COLORS.iceA, STONE_COLORS.iceB]).toContain(floorColour(mid('Steps')));
    expect([SNOW_COLORS.iceA, SNOW_COLORS.iceB]).toContain(floorColour(mid('Mogul field')));
  });

  it('on kit tracks the costumes are drawn in a few shared meshes, and their idle movements still move', () => {
    const track = kitTracks.find((t) => t.slug === 'kit-proving-ground');
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const built = buildTrackFeatures(centerline, channel, track.physics.features, { compact: true });
    const names = built.group.children.map((c) => c.name);
    expect(names).toContain('costumes');
    const moving = built.group.getObjectByName('costumes:moving');
    expect(moving).toBeTruthy();
    const corners = (t) => { built.update(t, { positions: [], ps: [] }); return Array.from(moving.geometry.getAttribute('position').array); };
    const a = corners(0);
    const b = corners(1_300);
    expect(a.some((v, k) => Math.abs(v - b[k]) > 0.01)).toBe(true);
    // Far fewer meshes than one per colour.
    const plain = buildTrackFeatures(centerline, channel, track.physics.features, {});
    expect(built.group.children.length).toBeLessThan(plain.group.children.length - 10);
  });

  it('a coaster\'s start type: what stands behind the gate (lift hill, curving lift, lift tower, elevator, cliff, rooftop, launch platform)', () => {
    const track = PHYSICS_TRACKS.find((t) => t.slug === 'sognefjord');
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const flight = coasterFlight(centerline, channel, track.physics.kit);
    const at = (lift, p) => ({ back: p.clone().sub(lift.top).dot(lift.back), side: p.clone().sub(lift.top).dot(lift.side), down: lift.top.y - p.y });
    const of = (type) => liftHillOf(centerline, flight, type);
    const straight = of('straight-lift');
    expect(straight.path).toHaveLength(2);
    expect(at(straight, straight.foot).down).toBeCloseTo(flight[0] + 14);
    const curving = of('curving-lift');
    expect(Math.abs(at(curving, curving.foot).side)).toBeGreaterThan(15); // round to one side
    const spiral = of('spiral-tower');
    expect(spiral.length).toBeGreaterThan(80); // wound round its tower
    expect(at(spiral, spiral.foot).down).toBeCloseTo(flight[0] + 14);
    for (const type of ['elevator', 'cliff', 'rooftop', 'station-launch']) expect(at(of(type), of(type).path[1]).down, type).toBe(0); // level behind the gate
    // The land: carved down along a chain lift, raised to a cliff top behind a cliff start.
    const p = straight.top.clone().addScaledVector(straight.back, 30);
    expect(liftHillCut(straight, p.x, p.z)).toBeLessThan(straight.top.y);
    const cliff = of('cliff');
    const q = cliff.top.clone().addScaledVector(cliff.back, 30);
    expect(liftHillCut(cliff, q.x, q.z)).toBe(Infinity);
    expect(liftHillRaise(cliff, q.x, q.z, cliff.top.y - 50)).toBeCloseTo(cliff.top.y - 2.4);
    const ahead = cliff.top.clone().addScaledVector(cliff.back, -5);
    expect(liftHillRaise(cliff, ahead.x, ahead.z, 7)).toBe(7); // (nothing in front of the gate)
    // Every type builds, on computers and phones.
    for (const type of ['straight-lift', 'curving-lift', 'spiral-tower', 'elevator', 'cliff', 'rooftop', 'station-launch']) {
      for (const lite of [false, true]) {
        const kit = { ...track.physics.kit, start: { ...track.physics.kit.start, type } };
        const built = buildCoaster(centerline, channel, kit, { lite, groundAt: () => cliff.top.y - 40, flight });
        expect(built.liftHill.type).toBe(type);
        expect(built.group.children.length).toBeGreaterThan(0);
      }
    }
  });

  it('a pinball table: backglass and display (one picture) behind the gate, flippers on a fixed rhythm outside the catch area', () => {
    const track = PHYSICS_TRACKS.find((t) => t.slug === 'multiball-manor');
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    for (const lite of [false, true]) {
      const built = buildPinball(centerline, channel, track.physics.kit, { lite, groundAt: () => 0, bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500, floorY: -66 }, pen: track.physics.runout });
      const names = built.group.children.map((c) => c.name);
      for (const n of ['pinball: backglass', 'pinball: cabinet', 'pinball: flippers', 'pinball: inserts']) expect(names).toContain(n);
      expect(built.group.children.length).toBe(4); // (four draws in all)
      // The backglass stands behind the gate, facing down the table.
      const s0 = centerline.samples[0];
      expect(built.backglass.foot.clone().sub(s0.pos).setY(0).dot(new Vector3(s0.tangent.x, 0, s0.tangent.z).normalize())).toBeLessThan(-30);
      // The flippers: beyond the catch area's walls, moving on the race clock and the same in every replay.
      const flippers = built.group.children.find((c) => c.name === 'pinball: flippers');
      const end = centerline.samples[centerline.segments];
      const side = new Vector3(end.side.x, 0, end.side.z).normalize();
      const pos = flippers.geometry.getAttribute('position');
      const at = () => Array.from(pos.array);
      built.update(0);
      const a = at();
      for (let k = 0; k < pos.count; k += 1) expect(Math.abs(new Vector3().fromBufferAttribute(pos, k).sub(end.pos).dot(side))).toBeGreaterThan(track.physics.runout.halfWidth + 1);
      built.update(200);
      expect(at().some((x, k) => Math.abs(x - a[k]) > 0.2)).toBe(true);
      built.update(0);
      expect(at().every((x, k) => Math.abs(x - a[k]) < 1e-4)).toBe(true);
      built.dispose();
    }
  });
});
