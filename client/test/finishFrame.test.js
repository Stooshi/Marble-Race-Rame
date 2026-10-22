// The finish camera's picture (Moses, 22 Oct 2026: on an iPhone, Ha Long Bay Spins' station roof filled the
// top half of the finish picture, the parked marbles were squeezed into a strip behind it and a finished
// marble sat right in front of the lens). The shot is framed for the screen, a coaster station's canopy is
// cut away from it, and the push-in on the winner keeps its distance. The whole-race check on every track
// is scripts/finish-frame-check.js (client/report/finishFrame.report.js); these are its quick parts.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { themeFor } from '../src/three/themes';
import { MARBLE_RADIUS, PEN_DROP } from '../src/three/marbles';
import { FINISH_SHOT, finishCutaway, finishPush, finishShotPose, TrackScene } from '../src/three/TrackScene';
import { stationRoof } from '../src/three/scenery/coaster';
import { FRAME, finishFrame, nameOf } from '../src/three/scenery/clearCheck';

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');

const SCREENS = [['phone 390×844', 390 / 844], ['phone 430×932', 430 / 932], ['computer 1280×720', 1280 / 720]];
const track = physicsTrack('ha-long-bay-spins');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const end = centerline.samples[centerline.segments];
const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
const side = new Vector3(end.side.x, 0, end.side.z).normalize();
const pen = channel.runout;
const floorAt = (d, across = 0) => end.pos.clone().addScaledVector(forward, d).addScaledVector(side, across).setY(end.pos.y - Math.max(0, d) * PEN_DROP + MARBLE_RADIUS);
const cameraFor = (pose, aspect) => {
  const camera = new PerspectiveCamera(50, aspect, 0.5, 6000);
  camera.position.copy(pose.camera);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld(true);
  return camera;
};
const onScreen = (camera, p) => {
  const v = p.clone().project(camera);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, front: v.z < 1 };
};

describe('the finish shot, framed for the screen', () => {
  for (const [screen, aspect] of SCREENS) {
    it(`${screen}: the parked marbles across the whole catch area sit clearly above the results and below the banner`, () => {
      const camera = cameraFor(finishShotPose(centerline, channel, aspect), aspect);
      const box = aspect < 1 ? FRAME.box.tall : FRAME.box.wide;
      for (const d of [pen.length - 5, pen.length - FINISH_SHOT.gather, pen.length - 1]) {
        for (const across of [-pen.halfWidth + MARBLE_RADIUS, 0, pen.halfWidth - MARBLE_RADIUS]) {
          const s = onScreen(camera, floorAt(d, across));
          expect(s.front).toBe(true);
          expect(s.x).toBeGreaterThan(0.03);
          expect(s.x).toBeLessThan(0.97);
          expect(s.y).toBeGreaterThan(FRAME.top);
          expect(s.y).toBeLessThan(1 - box);
        }
      }
    });

    it(`${screen}: no finished marble in the catch area is drawn right in front of the lens`, () => {
      const camera = cameraFor(finishShotPose(centerline, channel, aspect), aspect);
      const tan = Math.tan((camera.fov * Math.PI) / 360);
      for (let d = 0; d <= pen.length; d += 1) {
        for (const across of [-pen.halfWidth, 0, pen.halfWidth]) {
          const p = floorAt(d, across);
          const s = onScreen(camera, p);
          if (!s.front || s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1) continue;
          expect((2 * MARBLE_RADIUS) / (camera.position.distanceTo(p) * 2 * tan)).toBeLessThan(FRAME.lens.rolling);
        }
      }
    });
  }

  it('comes closer on a tall phone, so the marbles are drawn bigger there', () => {
    const wide = finishShotPose(centerline, channel, 16 / 9);
    const tall = finishShotPose(centerline, channel, 390 / 844);
    const gather = floorAt(pen.length - FINISH_SHOT.gather);
    expect(tall.camera.distanceTo(gather)).toBeLessThan(wide.camera.distanceTo(gather) - 8);
  });

  it('pushes in on the winner across the ground at its own height, never nearer than 32 m (a tall phone stays put)', () => {
    const winner = floorAt(pen.length - 1);
    for (const [, aspect] of SCREENS) {
      const shot = finishShotPose(centerline, channel, aspect);
      const before = shot.camera.clone();
      const across = (c) => Math.hypot(c.x - winner.x, c.z - winner.z);
      finishPush(shot, winner, 0.45);
      expect(shot.camera.y).toBeCloseTo(before.y, 6);
      expect(across(shot.camera)).toBeGreaterThan(Math.min(31.9, across(before) - 1e-6));
      expect(across(shot.camera)).toBeLessThanOrEqual(across(before) + 1e-6);
    }
  });
});

describe("a coaster station's canopy, cut away from the finish shot", () => {
  const lite = true;
  const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite });
  const roof = stationRoof(scenery.userData.station);
  const cut = finishCutaway(roof);
  const builder = Object.assign(Object.create(TrackScene.prototype), { centerline, channel });
  const meshes = [];
  for (const g of [scenery, builder.buildFinishArch(track)]) {
    g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent && !/^tunnel/.test(nameOf(o))) meshes.push(o); });
  }
  // (Only what stands within 90 m of the finish, for speed, as the whole-race check does.)
  const near = meshes.filter((m) => {
    m.geometry.computeBoundingSphere();
    const c = m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld);
    return c.distanceTo(end.pos) < 90 + m.geometry.boundingSphere.radius;
  });

  it('cuts the canopy, never the platforms, the track or the marbles under it', () => {
    expect(cut.contains(roof.centre.clone().setY((roof.bottom + roof.top) / 2))).toBe(true);
    expect(cut.contains(floorAt(10))).toBe(false);
    expect(cut.contains(roof.centre.clone().setY(roof.bottom - 2))).toBe(false);
    // The clipping planes: off, nothing is cut (the bottom plane raised out of reach); on, the canopy's box.
    cut.set(false);
    expect(cut.planes[0].constant).toBeGreaterThan(1e6);
    cut.set(true);
    expect(cut.planes[0].distanceToPoint(roof.centre.clone().setY(roof.top))).toBeLessThan(0);
    expect(cut.planes[0].distanceToPoint(floorAt(10))).toBeGreaterThan(0);
  });

  it('the old shot (under the canopy) failed on a phone; the new one passes on both phones and a computer', () => {
    // As it was before 22 Oct: 21 m before the line on a tall phone, held under the canopy.
    const back = 21;
    const old = { camera: end.pos.clone().addScaledVector(forward, -back), target: end.pos.clone().addScaledVector(forward, pen.length * 0.75) };
    old.camera.y = Math.min(end.pos.y + 8.5, roof.bottom - 1.5);
    old.target.y = end.pos.y - pen.length * 0.75 * PEN_DROP;
    const parked = [];
    for (let k = 0; k < 15; k += 1) parked.push(floorAt(pen.length - 1.2 - Math.floor(k / 5) * 1.15, (k % 5 - 2) * 1.2));
    const finished = parked.map((_, k) => k);
    const before = finishFrame(centerline, channel, cameraFor(old, 390 / 844), near, { marbles: parked, finished, grid: 20 });
    expect(before.cover).toBeGreaterThan(FRAME.cover);
    for (const [, aspect] of SCREENS) {
      const now = finishFrame(centerline, channel, cameraFor(finishShotPose(centerline, channel, aspect), aspect), near, { marbles: parked, finished, cut, grid: 20 });
      expect(now.cover).toBeLessThanOrEqual(FRAME.cover);
      expect(now.hidden).toEqual([]);
    }
  }, 120_000);
});
