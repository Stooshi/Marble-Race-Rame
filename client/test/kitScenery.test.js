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
        expect(normal.length).toBeGreaterThan(200);
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
});
