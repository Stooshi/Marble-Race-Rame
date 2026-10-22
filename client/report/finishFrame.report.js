// The finish camera's picture on phones and computers (scripts/finish-frame-check.js, and the track report):
// the game's own follow camera driven through the end of real races, as a viewer sees it (following the
// marbles coming home, and following the winner), on a 390×844 and a 430×932 phone and a 1280×720 computer.
// For each: how much of the picture anything high over the finish covers, whether every finished marble
// is clearly in the picture (above the results, below the banner, nothing in front of it), and how big
// the nearest marble is drawn (none right in front of the lens). See clearCheck.js finishFrame. Looks only.
import fs from 'node:fs';
import { it } from 'vitest';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { themeFor } from '../src/three/themes';
import { buildStructures } from '../src/three/structures';
import { buildBillboards } from '../src/three/billboards';
import { layoutMarbles } from '../src/three/marbles';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { finishFrame, nameOf, pieceFinder } from '../src/three/scenery/clearCheck';

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

export const FINISH_SCREENS = [
  { screen: 'phone 390×844', width: 390, height: 844, lite: true },
  { screen: 'phone 430×932', width: 430, height: 932, lite: true },
  { screen: 'computer 1280×720', width: 1280, height: 720, lite: false },
];
const STEP_MS = 50;
const LOOK_EVERY_MS = 250; // the marbles' check, four times a second
const SETTLED_MS = 3000;   // a finished marble counts as parked this long after it crossed
const HIDDEN_EVERY_MS = 1000; // the finished marbles' sight lines, once a second
const NEAR_M = 90;         // metres round the finish that count

it.skipIf(!process.env.REPORT_FINISH)('finish camera: the picture on phones and computers', () => {
  const list = JSON.parse(fs.readFileSync(process.env.REPORT_FINISH, 'utf8'));
  const out = {};
  for (const item of list) {
    const track = JSON.parse(fs.readFileSync(item.track, 'utf8'));
    const races = JSON.parse(fs.readFileSync(item.races, 'utf8'));
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    if (!channel?.runout) { out[track.slug] = null; continue; }
    const results = [];
    for (const lite of [true, false]) {
      const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite });
      const structures = buildStructures(centerline, channel, track.physics.kit, { lite });
      const boards = buildBillboards(centerline, channel, track.physics.kit, { lite });
      // The finish's own pieces (the arch and banner, the catch area), as TrackScene builds them.
      const builder = Object.assign(Object.create(TrackScene.prototype), { centerline, channel });
      const arch = builder.buildFinishArch(track);
      const meshes = [];
      for (const g of [scenery, structures?.group, boards?.group, arch].filter(Boolean)) {
        g.updateMatrixWorld(true);
        g.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent && !/^tunnel/.test(nameOf(o))) meshes.push(o); });
      }
      // (Only what stands near the finish can be in the finish camera's way: the rest is left out, for speed.)
      const end = centerline.samples[centerline.samples.length - 1];
      const zone = new Box3().setFromCenterAndSize(end.pos.clone().addScaledVector(new Vector3(end.tangent.x, 0, end.tangent.z).normalize(), channel.runout.length / 2), new Vector3(1, 0, 1).multiplyScalar(2 * NEAR_M).setY(2 * NEAR_M));
      const near = meshes.filter((m) => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); return zone.intersectsBox(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); });
      const pieceAt = pieceFinder(scenery);
      for (const s of FINISH_SCREENS.filter((x) => x.lite === lite)) {
        for (const [r, race] of races.entries()) {
          const done = race.results.map((x) => x.finishTimeMs).filter(Number.isFinite);
          const winnerMs = Math.min(...done);
          const lastMs = Math.max(...done);
          const winner = race.results.find((x) => x.finishTimeMs === winnerMs).index;
          for (const follow of ['arriving', winner]) {
            const camera = new PerspectiveCamera(50, s.width / s.height, 0.5, 6000);
            const scene = Object.assign(Object.create(TrackScene.prototype), { centerline, channel, track, scenery, camera, cameraMode: 'follow' });
            scene.main = { camera, cam: new Vector3(), target: new Vector3(), ready: false, leader: null, leaderT: undefined };
            const marbles = [];
            scene.glow = { set() {} };
            scene.marbles = { positionOf: (k) => marbles[k] };
            scene.setCelebration({ index: winner, ms: winnerMs });
            const crossed = new Map();
            const run = { race: r + 1, screen: s.screen, follow: follow === 'arriving' ? 'the marbles coming home' : 'the winner', worst: { cover: null, lens: null }, hidden: [], looks: 0 };
            for (let t = Math.max(0, winnerMs - 6000); t <= lastMs + 2500; t += STEP_MS) {
              const f = frameAtTime(race.frames, race.tickMs, t);
              layoutMarbles(centerline, f, track.lane_count, null, { channel, out: marbles, crossedAt: crossed });
              const index = scene.followedIndex(f, follow, scene.main);
              scene.celebrate(f, index);
              scene.main.atFinish = true;
              scene.main.holdFinish = follow === 'arriving' && f.p.some((p) => p >= 1);
              scene.updateFollowCamera(marbles[index], f.p[index] ?? 0, STEP_MS / 1000, scene.main);
              if (t < winnerMs || (t - winnerMs) % LOOK_EVERY_MS !== 0) continue;
              const finished = race.results.filter((x) => Number.isFinite(x.finishTimeMs) && t - x.finishTimeMs >= SETTLED_MS).map((x) => x.index);
              // The cover at a few moments (the camera settles on the finish shot): just after the win, as the winner's moment ends, at the end.
              const coverNow = [winnerMs + 1500, winnerMs + 4500, lastMs + 2000].some((m) => Math.abs(t - m) < LOOK_EVERY_MS / 2);
              const home = f.p.map((p, k) => (p >= 1 ? k : -1)).filter((k) => k >= 0);
              const res = finishFrame(centerline, channel, camera, near, { marbles, home, parked: finished, finished: (t - winnerMs) % HIDDEN_EVERY_MS === 0 ? finished : [], cut: scene.finishCutOn ? scene.finishCut : null, grid: coverNow ? 24 : 0, pieceAt });
              run.looks += 1;
              if (coverNow && (!run.worst.cover || res.cover > run.worst.cover.cover)) run.worst.cover = { t, cover: res.cover, by: res.coverBy };
              if (res.lens && (!run.worst.lens || res.lens.over > run.worst.lens.over)) run.worst.lens = { t, ...res.lens };
              for (const h of res.hidden) if (!run.hidden.some((x) => x.index === h.index && x.why === h.why)) run.hidden.push({ t, ...h });
            }
            results.push(run);
          }
        }
      }
    }
    out[track.slug] = results;
  }
  fs.writeFileSync(process.env.REPORT_OUT, JSON.stringify(out, null, 1));
});
