// TV moments (src/three/tvMoments.js): a track's trackside cameras stand clear of the track and of
// the scenery, and the cut follows only where the followed marble is (never the wall clock), so a
// replay shows the same moments: no cut in the first seconds or near the line, about 3–5 s each.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { themeFor } from '../src/three/themes';
import { TV, biggestBunch, packCams, packWeight, standingLabel, tvCameras, tvMoment, tvSpots, tvWeight } from '../src/three/tvMoments';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const track = physicsTrack('marble-stadium-sprint');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const cams = tvCameras(centerline, channel, track.physics.kit);

describe('TV moments', () => {
  it('a track\'s cameras stand outside the track, well apart, and only where the track file puts them', () => {
    expect(cams).toHaveLength(2);
    for (const c of cams) {
      // Nearest point of the track's middle line: further than the channel's half-width.
      let near = Infinity;
      for (const s of centerline.samples) near = Math.min(near, s.pos.distanceTo(c.pos));
      expect(near).toBeGreaterThan(channel.radius + 3);
    }
    expect(Math.abs(cams[0].s - cams[1].s)).toBeGreaterThanOrEqual(300);
    expect(tvCameras(centerline, channel, { ...track.physics.kit, tv: undefined })).toEqual([]);
  });

  // Every track with TV cameras: every track since 27 Oct 2026 (Moses: at least one backward-facing camera
  // on each; test/tvCameras.test.js checks none is missing), the hand-built three with physics.tv.
  const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
  const withCameras = PHYSICS_TRACKS.filter((t) => tvSpots(t.physics)).map((t) => t.slug);
  it.each(withCameras)('%s: no scenery stands where a TV camera does, nor between it and the track (the camera clear check)', (slug) => {
    const track = physicsTrack(slug);
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const scenery = buildScenery(themeFor(track.slug, track), centerline, track, {});
    scenery.updateMatrixWorld(true);
    // (Raised by TV.raise wherever that stays clear: as in the game, given the scenery.)
    const cams = tvCameras(centerline, channel, tvSpots(track.physics), { scenery });
    expect(cams.length).toBeGreaterThan(0);
    const solid = [];
    scenery.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent) solid.push(o); });
    const ray = new Raycaster();
    const dirs = [];
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) dirs.push(new Vector3(x, y, z).normalize());
    for (const c of cams) {
      // Nothing within 1.5 m of the lens (the camera inside a wall, a roof or a tree).
      for (const d of dirs) {
        ray.set(c.pos, d);
        ray.far = 1.5;
        expect(ray.intersectObjects(solid, false).map((h) => h.object.name), `camera at ${c.s.toFixed(0)} m`).toEqual([]);
      }
      // A clear view of the track at its spot.
      const spot = centerline.samples[Math.round(c.p * centerline.segments)].pos.clone().add(new Vector3(0, 0.5, 0));
      ray.set(c.pos, spot.clone().sub(c.pos).normalize());
      ray.far = c.pos.distanceTo(spot) - 2;
      // (The track's own rim may cut the bottom of the view; scenery may not.)
      const inView = ray.intersectObjects(solid, false).map((h) => h.object.name).filter((n) => n !== 'coaster track');
      expect(inView, `view from the camera at ${c.s.toFixed(0)} m`).toEqual([]);
    }
  });

  it('cuts by where the marble is: from 50 m before a camera, fully on to 12 m past, easing back over 30 m', () => {
    const [cam] = cams;
    const finishAt = channel.arc - 140;
    const t = 20000;
    expect(tvMoment(cams, cam.s - TV.before - 1, t, finishAt)).toBeNull();
    expect(tvMoment(cams, cam.s - TV.before + 1, t, finishAt)).toEqual({ cam, w: 1 });
    expect(tvMoment(cams, cam.s + TV.after, t, finishAt).w).toBe(1);
    const easing = tvMoment(cams, cam.s + TV.after + TV.blend / 2, t, finishAt).w;
    expect(easing).toBeGreaterThan(0.4);
    expect(easing).toBeLessThan(0.6);
    expect(tvMoment(cams, cam.s + TV.after + TV.blend + 1, t, finishAt)).toBeNull();
    // At racing speed (about 25 m/s) a moment lasts about 3–5 s.
    const seconds = (TV.before + TV.after + TV.blend) / 25;
    expect(seconds).toBeGreaterThanOrEqual(3);
    expect(seconds).toBeLessThanOrEqual(5);
    // The same place and time always give the same shot (replays show the same moments).
    expect(tvMoment(cams, cam.s, t, finishAt)).toEqual(tvMoment(cams, cam.s, t, finishAt));
  });

  it('never in the first seconds, near the line, or on a track without cameras', () => {
    const [cam] = cams;
    expect(tvMoment(cams, cam.s, TV.startGuard - 1, channel.arc - 140)).toBeNull();
    expect(tvMoment(cams, cam.s, 20000, cam.s - 1)).toBeNull();
    expect(tvMoment([], cam.s, 20000, channel.arc)).toBeNull();
  });
});

describe('where a track\'s TV cameras come from', () => {
  it('a kit track\'s kit.tv; the hand-built tracks\' physics.tv; none without either', () => {
    expect(tvSpots({ kit: { tv: [{ p: 0.5 }], mirrored: true } })).toEqual({ tv: [{ p: 0.5 }], mirrored: true });
    expect(tvSpots({ tv: [{ p: 0.4, side: -1, distance: 10, height: 5 }] })).toEqual({ tv: [{ p: 0.4, side: -1, distance: 10, height: 5 }] });
    expect(tvSpots({ kit: {} })).toBeNull();
    expect(tvSpots(null)).toBeNull();
    const bob = physicsTrack('bobsleigh-run');
    const cl = buildCenterline(bob);
    expect(tvCameras(cl, channelOf(bob, cl), tvSpots(bob.physics))).toHaveLength(2);
  });
});

// The pack shot (Moses, 30 Oct 2026): mid race, the biggest bunch; the player's place in a small label.
describe('TV pack shot', () => {
  it('finds the biggest bunch within TV.pack.bunch metres (only near a camera if asked)', () => {
    // arc 1000 m: a leader alone at 600, a bunch of four round 500, two at 420
    const frame = { p: [0.6, 0.5, 0.505, 0.493, 0.509, 0.42, 0.421, 1] };
    const b = biggestBunch(frame, 1000);
    expect(b.members.sort()).toEqual([1, 2, 3, 4]);
    expect(b.centre).toBeCloseTo(501.75, 1);
    expect(biggestBunch(frame, 1000, [410, 430]).members.sort()).toEqual([5, 6]);
  });
  it('keeps at most two mid-race cameras for it', () => {
    const cams = [0.2, 0.36, 0.5, 0.69, 0.8].map((p) => ({ p, s: p * 1000 }));
    expect(packCams(cams).map((c) => c.p)).toEqual([0.36, 0.5]);
    expect(packCams([{ p: 0.2 }, { p: 0.9 }])).toEqual([]);
    // (none between 35 and 70%: the one nearest the middle, if not too near the start or the end)
    expect(packCams([{ p: 0.31 }, { p: 0.72 }, { p: 0.9 }]).map((c) => c.p)).toEqual([0.31]);
  });
  it('every track with TV cameras has a camera for it', () => {
    const { PHYSICS_TRACKS: all } = require('../../src/game/physicsTracks');
    const without = all.filter((t) => tvSpots(t.physics)).filter((t) => !packCams(tvSpots(t.physics).tv).length).map((t) => t.slug);
    expect(without.length).toBeLessThanOrEqual(1); // (redwood-forest-run: cameras at 17% and 78% of the way)
  });
  it('eases the shot in and out by distance, as the other TV moments', () => {
    expect(tvWeight(-TV.before - 1)).toBeNull();
    expect(tvWeight(0)).toBe(1);
    expect(tvWeight(TV.after + TV.blend / 2)).toBeCloseTo(0.5, 5);
    expect(tvWeight(TV.after + TV.blend + 1)).toBeNull();
    // (the pack shot lets go before the bunch reaches the camera, so it never swings round as they pass)
    expect(packWeight(-TV.pack.before - 1)).toBeNull();
    expect(packWeight(-TV.pack.before)).toBe(1);
    expect(packWeight(-TV.pack.hold - 1)).toBe(1);
    expect(packWeight(-TV.pack.hold / 2)).toBeNull();
  });
  it('labels where the player stands', () => {
    expect(standingLabel({ place: 1, aheadMs: 1840 })).toBe('Leader +1.8 s');
    expect(standingLabel({ place: 7, inPack: true })).toBe('7th, in the pack');
    expect(standingLabel({ place: 12, inPack: false, behindMs: 3420 })).toBe('12th, 3.4 s behind');
    expect(standingLabel({ place: 2, inPack: true })).toBe('2nd, in the pack');
    expect(standingLabel({ place: 13, inPack: true })).toBe('13th, in the pack');
    expect(standingLabel({ place: 23, inPack: true })).toBe('23rd, in the pack');
  });
});
