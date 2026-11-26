// No text on a track is mirrored (src/three/textCheck.js): the Track and Field lane numbers painted as on
// a real track (Moses, 30 Oct 2026), readable from behind the start looking down the track, their tops
// towards the finish, lane 1 the leftmost as the marbles run; and every other mesh carrying text (scoreboards, timing boards, billboards, backglasses, cabinet
// art) reads the right way round from its front, or, seen from both sides, from the track.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { buildBillboards } from '../src/three/billboards';
import { themeFor } from '../src/three/themes';
import { buildLaneMarkings } from '../src/three/scenery/athletics';
import { mirroredText, textTriangles } from '../src/three/textCheck';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS, physicsTrack } = require('../../src/game/physicsTracks');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const ATHLETICS = PHYSICS_TRACKS.filter((t) => t.physics.kit?.athletics && !/^variety-/.test(t.slug)).map((t) => t.slug);

/** Where the track's viewers are, near a point: the nearest point of the track, 2 m over it; and the way the race runs there. */
function trackLooks(centerline) {
  const { samples } = centerline;
  const nearest = (p) => {
    let best = 0;
    let d = Infinity;
    for (let i = 0; i < samples.length; i += 1) {
      const e = (samples[i].pos.x - p.x) ** 2 + (samples[i].pos.z - p.z) ** 2 + (samples[i].pos.y - p.y) ** 2; // (in 3D: another stretch passing over or under is not this one)
      if (e < d) { d = e; best = i; }
    }
    return samples[best];
  };
  return {
    viewerAt: (p) => nearest(p).pos.clone().add(new Vector3(0, 2, 0)),
    forwardAt: (p) => { const t = nearest(p).tangent; return new Vector3(t.x, 0, t.z).normalize(); },
  };
}

describe('track text is never mirrored', () => {
  it('the ten Track and Field tracks are all checked', () => {
    expect(ATHLETICS.length).toBeGreaterThanOrEqual(10);
  });

  for (const slug of ATHLETICS) {
    it(`${slug}: the lane numbers read from behind the start, tops to the finish, lane 1 on the left`, () => {
      const track = physicsTrack(slug);
      const centerline = buildCenterline(track);
      const channel = channelOf(track, centerline);
      const { numbers } = buildLaneMarkings(centerline, channel, { kit: track.physics.kit });
      expect(numbers.userData.text).toEqual({ floor: true });
      expect(mirroredText(numbers, trackLooks(centerline))).toEqual([]);
      // Lane 1 (the picture's first eighth) the leftmost as the marbles run: left = up × forward.
      const s0 = centerline.samples[0];
      const forward = new Vector3(s0.tangent.x, 0, s0.tangent.z).normalize();
      const left = new Vector3(forward.z, 0, -forward.x);
      const tris = textTriangles(numbers);
      const lane = (k) => {
        const mine = tris.slice(k * 2, k * 2 + 2);
        return mine.reduce((v, t) => v.add(t.centre), new Vector3()).divideScalar(mine.length);
      };
      const across = (k) => lane(k).sub(s0.pos).dot(left);
      for (let k = 1; k < 8; k += 1) expect(across(k - 1) - across(k)).toBeGreaterThan(0); // (1, 2, … 8 from the left)
      // Tops towards the finish: the picture's up (v) runs down the track, so the numbers read the right way up from behind.
      const g = numbers.geometry;
      const P = g.getAttribute('position');
      const V = g.getAttribute('uv');
      for (let k = 0; k < 8; k += 1) {
        const i0 = k * 6; // (near left, near right, far right: v 0, 0, 1)
        const up = new Vector3().fromBufferAttribute(P, i0 + 2).sub(new Vector3().fromBufferAttribute(P, i0 + 1));
        expect(V.getY(i0 + 2) - V.getY(i0 + 1)).toBeGreaterThan(0);
        expect(up.dot(forward)).toBeGreaterThan(0);
      }
    });
  }

  // Every other mesh carrying text, on the tracks that have each kind: the stadiums' scoreboards,
  // a timing board, the pinball backglasses and arcade cabinets, and the billboards on every kit track.
  const SCENERY = [...ATHLETICS, 'are-run', 'multiball-manor', 'wizard-mode', 'joystick-spins', 'kill-screen'];
  for (const slug of SCENERY) {
    it(`${slug}: every text in its scenery reads the right way round`, () => {
      const track = physicsTrack(slug);
      const centerline = buildCenterline(track);
      const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite: false });
      const texts = [];
      scenery.traverse((o) => { if (o.isMesh && o.userData.text) texts.push(o); });
      expect(texts.length, 'some text is drawn').toBeGreaterThan(0);
      for (const m of texts) expect(mirroredText(m, trackLooks(centerline)), `${slug}: ${m.name}`).toEqual([]);
    }, 60_000);
  }

  it('the billboards on every kit track read the right way round', () => {
    for (const track of PHYSICS_TRACKS.filter((t) => t.physics.kit && !/^variety-/.test(t.slug))) {
      const centerline = buildCenterline(track);
      const channel = channelOf(track, centerline);
      const boards = buildBillboards(centerline, channel, track.physics.kit, {});
      if (!boards) continue;
      boards.group.traverse((o) => {
        if (o.isMesh && o.userData.text) expect(mirroredText(o, trackLooks(centerline)), `${track.slug}: ${o.name}`).toEqual([]);
      });
    }
  }, 120_000);
});
