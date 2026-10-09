// The track report's view checks, on the drawn track: buried in the ground
// (the ground check), and frame by frame through whole races the follow camera
// is never blocked, stays on its marble's level, never jumps, and the marble it
// follows is never drawn inside the ice. Run by scripts/track-report.js:
//   REPORT_TRACK=<track.json> REPORT_RACES=<races.json> REPORT_OUT=<out.json> npx vitest run --config report/vitest.config.js
import fs from 'node:fs';
import { it } from 'vitest';
import { PerspectiveCamera, Raycaster, Triangle, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { buildStructures } from '../src/three/structures';
import { buildBillboards } from '../src/three/billboards';
import { buildTrackFeatures } from '../src/three/trackFeatures';
import { themeFor } from '../src/three/themes';
import { layoutMarbles, MARBLE_RADIUS } from '../src/three/marbles';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { flaggedStretches, wallExposure } from '../src/three/scenery/groundCheck';

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const JUMP_M = 4;          // metres the camera may move in one frame (20 a second)
const LEVEL = [0, 20];     // metres the camera sits above the stretch of track it is over (its marble's, not another)
const LEVEL_FROM_MS = 5000;
const RAY_EVERY_MS = 250;  // the blocked check looks every quarter second
const SINK_M = 0.05;       // how far into the ice a drawn marble may dip

it('track report: view checks', () => {
  const track = JSON.parse(fs.readFileSync(process.env.REPORT_TRACK, 'utf8'));
  const races = JSON.parse(fs.readFileSync(process.env.REPORT_RACES, 'utf8'));
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);
  const out = { ground: {}, camera: [] };

  // The ground check, phone and computer.
  for (const lite of [false, true]) {
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
    const exposure = wallExposure(centerline, channel, track, ground, built);
    out.ground[lite ? 'phone' : 'computer'] = {
      flagged: flaggedStretches(exposure, channel.arc),
      normalMetres: Math.round((exposure.filter((e) => e.kind === 'normal').length / exposure.length) * channel.arc),
    };
  }

  // What could hide the followed marble: the ice, the land and banks, structures,
  // billboards and the obstacles (solid, drawn faces; not see-through water or trees).
  const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite: false });
  const structures = buildStructures(centerline, channel, track.physics.kit, {});
  const boards = buildBillboards(centerline, channel, track.physics.kit, {});
  const features = buildTrackFeatures(centerline, channel, track.physics.features, { compact: true });
  const geometry = buildIceChannelGeometry(centerline, channel);
  const solids = [];
  const obstacles = [];
  const named = (o) => o.name || o.parent?.name || 'track';
  for (const g of [scenery, structures?.group, boards?.group, features?.group].filter(Boolean)) {
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (!o.isMesh || o.material?.transparent || !o.visible) return;
      if (/^dressing|^figures|^lift|landmarks/.test(named(o))) return; // (trees, people, lifts: kept clear of the camera's path by placement)
      // The obstacles stand in the channel: a marble passing one is hidden behind it for a moment, as in
      // a real race. Counted on their own line, not as the camera being blocked.
      (g === features?.group ? obstacles : solids).push(o);
    });
  }
  // The stretch of track the camera is over: the nearest point of the track (on the plan) within
  // 120 m of its marble, so a stretch passing above or below never counts.
  const { samples, segments } = centerline;
  const trackBelow = (cam, p) => {
    const at = Math.round(p * segments);
    const reach = Math.round((120 / channel.arc) * segments);
    let best = null;
    let bestD = Infinity;
    for (let k = Math.max(0, at - reach); k <= Math.min(segments, at + reach); k += 1) {
      const d = Math.hypot(samples[k].pos.x - cam.x, samples[k].pos.z - cam.z);
      if (d < bestD) { bestD = d; best = samples[k].pos; }
    }
    return best;
  };
  // The ice, per segment for the sinking check.
  const pos = geometry.getAttribute('position');
  const starts = [...geometry.userData.segmentStarts, pos.count];
  const segTris = (s) => {
    const tris = [];
    for (let k = starts[s]; k < starts[s + 1]; k += 3) tris.push(new Triangle(new Vector3().fromBufferAttribute(pos, k), new Vector3().fromBufferAttribute(pos, k + 1), new Vector3().fromBufferAttribute(pos, k + 2)));
    return tris;
  };
  const segCache = new Map();
  const near = (p) => {
    const s = Math.round(p * centerline.segments);
    const tris = [];
    for (let k = Math.max(0, s - 2); k <= Math.min(centerline.segments - 1, s + 2); k += 1) {
      if (!segCache.has(k)) segCache.set(k, segTris(k));
      tris.push(...segCache.get(k));
    }
    return tris;
  };
  const q = new Vector3();
  const ray = new Raycaster();
  for (const [r, race] of races.entries()) {
    for (const [screen, aspect] of [['computer', 16 / 9], ['phone', 9 / 19.5]]) {
      const scene = Object.create(TrackScene.prototype);
      const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
      Object.assign(scene, { centerline, channel, track, scenery, camera }); // (the kit scenery: its viaducts count as the track above)
      scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
      const marbles = [];
      const result = { race: r + 1, screen, frames: 0, blocked: [], behindObstacle: 0, offLevel: [], jumps: [], sunk: [], worstJump: 0, worstSink: 0, highest: 0 };
      let last = null;
      for (let t = 0; t < race.durationMs; t += 50) {
        const f = frameAtTime(race.frames, race.tickMs, t);
        const i = scene.followedIndex(f, 'leader', scene.main);
        if (f.p[i] >= 1) break; // (the winner is home: the finish camera's turn)
        layoutMarbles(centerline, f, track.lane_count, null, { channel, out: marbles, separate: false });
        scene.updateFollowCamera(marbles[i], f.p[i], 0.05, scene.main);
        const cam = scene.main.cam;
        result.frames += 1;
        if (last && t > 1000) {
          const d = cam.distanceTo(last);
          result.worstJump = Math.max(result.worstJump, d);
          if (d > JUMP_M) result.jumps.push({ t, metres: +d.toFixed(1) });
        }
        last = cam.clone();
        const above = cam.y - trackBelow(cam, f.p[i]).y;
        if (t >= LEVEL_FROM_MS) result.highest = Math.max(result.highest, above);
        // (From 5 s: before that the starting camera hands over to this one, coming down from its high shot.)
        if (t >= LEVEL_FROM_MS && (above < LEVEL[0] || above > LEVEL[1])) result.offLevel.push({ t, metres: +above.toFixed(1) });
        if (t % RAY_EVERY_MS !== 0) continue;
        ray.set(cam, marbles[i].clone().sub(cam).normalize());
        ray.far = cam.distanceTo(marbles[i]) - 1;
        const hit = ray.intersectObjects(solids, false)[0];
        if (hit) result.blocked.push({ t, by: named(hit.object), at: +f.p[i].toFixed(4) });
        else if (ray.intersectObjects(obstacles, false).length) result.behindObstacle += 1;
        const gap = Math.min(...near(f.p[i]).map((tri) => tri.closestPointToPoint(marbles[i], q).distanceTo(marbles[i]))) - MARBLE_RADIUS;
        result.worstSink = Math.min(result.worstSink, gap);
        if (gap < -SINK_M) result.sunk.push({ t, metres: +gap.toFixed(2) });
      }
      out.camera.push(result);
    }
  }
  fs.writeFileSync(process.env.REPORT_OUT, JSON.stringify(out, null, 1));
});
