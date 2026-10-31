// The track report's view checks, on the drawn track: buried in the ground
// (the ground check), and frame by frame through whole races the follow camera
// is never blocked, stays on its marble's level, never jumps, and the marble it
// follows is never drawn inside the ice. Run by scripts/track-report.js:
//   REPORT_TRACK=<track.json> REPORT_RACES=<races.json> REPORT_OUT=<out.json> npx vitest run --config report/vitest.config.js
import fs from 'node:fs';
import { it } from 'vitest';
import { PerspectiveCamera, Raycaster, Triangle, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelDetail, channelOf } from '../src/three/iceChannel';
import { railGaps, railGapStretches } from '../src/three/edgeCheck';
import { buildScenery } from '../src/three/scenery';
import { buildStructures } from '../src/three/structures';
import { buildBillboards } from '../src/three/billboards';
import { buildTrackFeatures } from '../src/three/trackFeatures';
import { themeFor } from '../src/three/themes';
import { layoutMarbles, MARBLE_RADIUS } from '../src/three/marbles';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { flaggedStretches, wallExposure } from '../src/three/scenery/groundCheck';
import { cameraClearance, corridorIntrusions, finishShotView, markStructures, nameOf, pieceFinder, stretchesOf, tunnelAllowance } from '../src/three/scenery/clearCheck';
import { finishCutaway, finishShotPose } from '../src/three/TrackScene';
import { coasterRails, stationRoof } from '../src/three/scenery/coaster';
import { FLYOVER_MS, flyoverHighlight, flyoverPath, flyoverTop } from '../src/three/flyover';
import { TRACK_STYLE } from '../src/three/trackModel';

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const JUMP_M = 4;          // metres the camera may move in one frame (20 a second)
const LEVEL = [0, 20];     // metres the camera sits above the stretch of track it is over (its marble's, not another)
const LEVEL_FROM_MS = 5000;
const RAY_EVERY_MS = 250;  // the blocked check looks every quarter second
const SINK_M = 0.05;       // how far into the ice a drawn marble may dip
const CLEAR_EVERY_MS = 100; // the camera clearance check looks ten times a second

it.skipIf(!process.env.REPORT_TRACK)('track report: view checks', () => {
  const track = JSON.parse(fs.readFileSync(process.env.REPORT_TRACK, 'utf8'));
  const races = JSON.parse(fs.readFileSync(process.env.REPORT_RACES, 'utf8'));
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);
  const out = { ground: {}, camera: [], clear: { camera: [] } };

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
    const flyOnly = Boolean(process.env.REPORT_FLY_ONLY); // (only the flyover: checking every track at once)
    const exposure = flyOnly ? [] : wallExposure(centerline, channel, track, ground, built);
    // The clear-track check, inside the track: everything drawn round it (land, banks, dressing,
    // landmarks, structures, billboards; not the obstacles, which stand in the channel on purpose,
    // nor see-through water and spray). Tunnels and caves close over the track on purpose.
    const boardsHere = buildBillboards(centerline, channel, track.physics.kit, { lite });
    const drawnHere = [];
    for (const g of [scenery, structures?.group, boardsHere?.group].filter(Boolean)) {
      g.updateMatrixWorld(true);
      g.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent && !/^tunnel/.test(nameOf(o))) drawnHere.push(o); });
    }
    markStructures(structures?.group);
    const intrusions = flyOnly ? [] : corridorIntrusions(centerline, channel, drawnHere, { pieceAt: pieceFinder(scenery), allowed: tunnelAllowance(track.physics.kit) });
    out.clear[lite ? 'phone' : 'computer'] = { stretches: stretchesOf(intrusions, channel.arc), samples: intrusions.length };
    // The finish shot (where the big view settles once anyone is home), on a wide and a tall screen: nothing
    // between it and the line or the catch area, nothing close round it, never inside the land.
    if (channel.runout && !flyOnly) {
      const land = drawnHere.filter((o) => o.userData.ground || /^terrain|^banks/.test(nameOf(o)));
      const cut = finishCutaway(scenery.userData?.station ? stationRoof(scenery.userData.station) : null);
      const shots = [['wide', 16 / 9], ['tall', 9 / 19.5]].map(([screen, aspect]) => ({ screen, ...finishShotView(centerline, channel, finishShotPose(centerline, channel, aspect), drawnHere, land, { pieceAt: pieceFinder(scenery), cut }) }));
      out.clear.finish ??= {};
      out.clear.finish[lite ? 'phone' : 'computer'] = shots.map((x) => ({ screen: x.screen, looks: x.looks, blocked: x.blocked, near: x.near, inside: x.inside }));
    }
    // The flyover before a race (Moses, 26 Oct 2026): the flight this drawing makes (its own scenery, as
    // TrackScene.flyoverFor works it out), checked every 50 ms: nothing within CAMERA_CLEAR of the camera,
    // never inside the land.
    {
      const flyScene = Object.assign(Object.create(TrackScene.prototype), { centerline, track });
      const topAt = flyoverTop({ groups: [scenery, structures?.group, boardsHere?.group], trackBelow: (x, z) => flyScene.trackBelow(x, z), groundY: TRACK_STYLE.groundY });
      // (Without the field at the gate the flight ends on its highlight; the countdown's camera is checked on its own.)
      const path = flyoverPath(centerline, topAt, { highlight: flyoverHighlight(track), aspect: lite ? 9 / 19.5 : 16 / 9 });
      const land = drawnHere.filter((o) => o.userData.ground || /^terrain|^banks/.test(nameOf(o)));
      const fly = { looks: 0, near: [], inside: [], height: Math.round(path.height), side: path.side, highlight: path.highlight };
      for (let ms = 0; ms <= FLYOVER_MS; ms += 50) {
        const { camera } = path.poseAt(ms);
        const c = cameraClearance(camera, drawnHere, land, { pieceAt: pieceFinder(scenery) });
        fly.looks += 1;
        if (c.near) fly.near.push({ ms, ...c.near, at: camera.toArray().map((x) => +x.toFixed(1)) });
        if (c.inside) fly.inside.push({ ms, by: c.inside, at: camera.toArray().map((x) => +x.toFixed(1)) });
      }
      out.clear.flyover ??= {};
      out.clear.flyover[lite ? 'phone' : 'computer'] = fly;
    }
    // The rails on the rims (a coaster: the kit's tracks): each sits on the rim drawn under it, all
    // along, on splitters and where the slope changes too (railGaps; Moses, 31 Oct 2026).
    if (track.physics.kit?.coaster) {
      const geometry = buildIceChannelGeometry(centerline, channel, channelDetail(track, channel, lite));
      (out.rails ??= {})[lite ? 'phone' : 'computer'] = railGapStretches(railGaps(centerline, channel, coasterRails(centerline, channel, { lite }), geometry))
        .map((r) => ({ from: +(r.from / channel.arc).toFixed(4), to: +(r.to / channel.arc).toFixed(4), metres: Math.max(1, Math.round(r.to - r.from)), worst: r.worst === Infinity ? null : +r.worst.toFixed(2) }));
    }
    out.ground[lite ? 'phone' : 'computer'] = {
      flagged: flaggedStretches(exposure, channel.arc),
      normalMetres: exposure.length ? Math.round((exposure.filter((e) => e.kind === 'normal').length / exposure.length) * channel.arc) : 0,
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
  // The clear-track check round the follow camera: everything drawn (tunnels and caves too).
  const drawn = [];
  for (const g of [scenery, structures?.group, boards?.group].filter(Boolean)) {
    g.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent) drawn.push(o); });
  }
  const findPiece = pieceFinder(scenery);
  const landMeshes = drawn.filter((o) => o.userData.ground || /^terrain|^banks/.test(nameOf(o)));

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
  // (REPORT_CLEAR_ONLY: only the clear-track checks above, for checking many tracks at once.)
  for (const [r, race] of (process.env.REPORT_CLEAR_ONLY || process.env.REPORT_FLY_ONLY ? [] : races).entries()) {
    for (const [screen, aspect] of [['computer', 16 / 9], ['phone', 9 / 19.5]]) {
      const scene = Object.create(TrackScene.prototype);
      const camera = new PerspectiveCamera(50, aspect, 0.3, 3000);
      Object.assign(scene, { centerline, channel, track, scenery, camera }); // (the kit scenery: its viaducts count as the track above)
      scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
      const roofCut = scene.roofless() ? scene.cutaway() : null;
      const marbles = [];
      const result = { race: r + 1, screen, frames: 0, blocked: [], behindObstacle: 0, offLevel: [], jumps: [], sunk: [], worstJump: 0, worstSink: 0, highest: 0 };
      const clear = { race: r + 1, screen, looks: 0, near: [], inside: [] };
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
        if (t >= 1000 && t % CLEAR_EVERY_MS === 0) {
          // (From 1 s: before that the starting shot's own camera path, checked by its screenshots.)
          const c = cameraClearance(cam, drawn, landMeshes, { pieceAt: findPiece });
          clear.looks += 1;
          if (c.near) clear.near.push({ t, at: +f.p[i].toFixed(4), ...c.near, from: cam.toArray().map((v) => +v.toFixed(1)), to: marbles[i].toArray().map((v) => +v.toFixed(1)) });
          if (c.inside) clear.inside.push({ t, at: +f.p[i].toFixed(4), by: c.inside, from: cam.toArray().map((v) => +v.toFixed(1)), to: marbles[i].toArray().map((v) => +v.toFixed(1)) });
        }
        if (t % RAY_EVERY_MS !== 0) continue;
        ray.set(cam, marbles[i].clone().sub(cam).normalize());
        ray.far = cam.distanceTo(marbles[i]) - 1;
        // (What the game cuts away is not drawn: a coaster station's canopy and its front beam, cut for the
        // whole race while the scene is roofless (TrackScene.roofless), so a hit inside the cut hides nothing.)
        const hit = ray.intersectObjects(solids, false).find((h) => !(roofCut && h.point && roofCut.contains(h.point)));
        if (hit) result.blocked.push({ t, by: named(hit.object), at: +f.p[i].toFixed(4), point: hit.point.toArray().map((v) => +v.toFixed(1)), from: cam.toArray().map((v) => +v.toFixed(1)) });
        else if (ray.intersectObjects(obstacles, false).length) result.behindObstacle += 1;
        const gap = Math.min(...near(f.p[i]).map((tri) => tri.closestPointToPoint(marbles[i], q).distanceTo(marbles[i]))) - MARBLE_RADIUS;
        result.worstSink = Math.min(result.worstSink, gap);
        if (gap < -SINK_M) result.sunk.push({ t, metres: +gap.toFixed(2) });
      }
      out.camera.push(result);
      out.clear.camera.push(clear);
    }
  }
  fs.writeFileSync(process.env.REPORT_OUT, JSON.stringify(out, null, 1));
});
