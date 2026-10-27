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
import { TV, tvCameras, tvMoment, tvSpots } from '../src/three/tvMoments';

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
    const cams = tvCameras(centerline, channel, tvSpots(track.physics));
    expect(cams.length).toBeGreaterThan(0);
    const scenery = buildScenery(themeFor(track.slug, track), centerline, track, {});
    scenery.updateMatrixWorld(true);
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
