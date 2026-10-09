// Kit view (development only, not part of the site): draws a track straight
// from its track file, with no server or database, so its costumes, scenery
// and billboards can be looked at and photographed.
//   node scripts/dump-kit-track.js <slug>        (writes client/dev/.tracks/<slug>.json)
//   npm run dev, then open /dev/kit-view.html?track=<slug>[&lite=1][&scenery=0]
// window.kitView.shot({ at, l, back, up, side }) puts the camera `back` metres
// up the track from a spot (`at`: share of the way down, `l`: share of the way
// up the wall), `up` metres above it, and draws one frame.
// With &race=<name> (client/dev/.tracks/<name>.json, written by the track report)
// it also plays that race through the game's own cameras: raceShot({ t, follow,
// camera }) draws the moment t ms after GO (negative: the countdown), and
// raceLoad({ every }) draws the follow camera every few seconds of the race and
// returns each frame's drawing load.
import { Frustum, Matrix4, Vector3 } from 'three';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { COUNTDOWN_MS } from '../src/three/startCamera';

const params = new URLSearchParams(window.location.search);
const slug = params.get('track') || 'kit-proving-ground';
const track = await (await fetch(`./.tracks/${slug}.json`)).json();
const canvas = document.getElementById('view');
const scene = new TrackScene(canvas, { interactive: false, lite: params.get('lite') === '1', scenery: params.get('scenery') !== '0' });
scene.billboardSource = async () => []; // (no server here: the built-in promotions)
scene.setSize(window.innerWidth, window.innerHeight);
scene.setTrack(track);

const at = (p) => {
  const { samples, segments } = scene.centerline;
  const f = Math.min(1, Math.max(0, p)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const a = samples[i];
  const b = samples[i + 1];
  return { pos: new Vector3().lerpVectors(a.pos, b.pos, f - i), side: new Vector3(a.side.x, 0, a.side.z).normalize() };
};

/** Draw calls by what they draw (the camera's view, roughly as the renderer culls): name path → count. */
function drawnBy() {
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(scene.camera.projectionMatrix, scene.camera.matrixWorldInverse));
  const by = {};
  scene.scene.traverseVisible((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
    if (o.frustumCulled && !frustum.intersectsObject(o)) return;
    const path = [];
    for (let x = o; x && x !== scene.scene; x = x.parent) path.unshift(x.name || x.type);
    const key = path.slice(0, Number(params.get('why')) > 1 ? Number(params.get('why')) : 3).join('/');
    const g = o.geometry;
    const tris = o.isMesh ? Math.round(((g.index ? g.index.count : g.getAttribute('position').count) / 3) * (o.count ?? 1) / 1000) : 0;
    const [n = 0, t = 0] = (by[key] ?? '0/0k').split(/[/k]/).map(Number);
    by[key] = `${n + (Array.isArray(o.material) ? o.material.length : 1)}/${t + tris}k`;
  });
  return by;
}

// ── A race through the game's own cameras (track report) ─────────────────
const race = params.get('race') ? await (await fetch(`./.tracks/${params.get('race')}.json`)).json() : null;
const countdown = race?.start ? Math.max(COUNTDOWN_MS, race.start.countdownMs ?? 0) : 0;
let clock = null;
let following = 'leader';
const raceFrame = (t) => {
  const f = frameAtTime(race.frames, race.tickMs, t);
  return t < 0 && f ? { ...f, t } : f; // (waiting at the gate during the countdown)
};
function beginRace() {
  scene.setRace(race.entries, [], race.results, race.start ? { ...race.start, countdownMs: countdown, frame: race.frames[0] } : null);
  scene.setCameraMode('follow');
  clock = -countdown;
}
/** Plays the race on to `to` ms, 20 frames a second, as a viewer would see it. */
function advance(to, follow = 'leader') {
  if (clock === null || to < clock || follow !== following) beginRace();
  following = follow;
  for (; clock <= to; clock += 50) scene.updateRace(raceFrame(clock), follow, 0.05);
}
function drawNow(t) {
  scene.effects?.update(t / 1000, scene.camera.position);
  scene.renderer.info.reset();
  scene.renderer.render(scene.scene, scene.camera);
  return { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles };
}

window.kitView = {
  race: race && { durationMs: race.durationMs, countdownMs: countdown, winnerMs: Math.min(...race.results.map((r) => r.finishTimeMs)) },
  /** The race at t ms (negative: the countdown) through the game's camera: 'follow' or 'overview'. */
  raceShot({ t, follow = 'leader', camera = 'follow' }) {
    advance(t, follow);
    if (camera === 'overview') {
      scene.setCameraMode('overview');
      const stats = drawNow(t);
      scene.setCameraMode('follow');
      return stats;
    }
    return drawNow(t);
  },
  /** The follow camera's drawing load every `every` ms through the whole race. */
  raceLoad({ every = 2000 } = {}) {
    const out = [];
    for (let t = 0; t <= race.durationMs; t += every) {
      advance(t);
      out.push({ t, ...drawNow(t) });
    }
    return out;
  },

  track,
  ready: new Promise((resolve) => setTimeout(resolve, 400)), // the scenery is built a moment after the track
  /** Moves the camera to look at a spot on the track and draws one frame, at race time `t` ms. */
  shot({ at: p, l = 0, back = 12, up = 5, side = 0, t = 0, rise = 0 }) {
    const arc = scene.channel?.arc ?? scene.centerline.length ?? 1000;
    const target = at(p);
    const from = at(p - back / arc);
    const across = (scene.channel ? scene.channel.radius * scene.channel.maxAngle : 4) * l;
    const look = target.pos.clone().addScaledVector(target.side, across).add(new Vector3(0, 1 + rise, 0));
    scene.camera.position.copy(from.pos).addScaledVector(from.side, across + side).add(new Vector3(0, up, 0));
    scene.camera.near = 0.3;
    scene.camera.far = scene.sky.scale.x * 1.2; // (the sky dome, and its stars and northern lights, in view)
    scene.camera.lookAt(look);
    scene.camera.updateProjectionMatrix();
    scene.features?.update(t);
    scene.structures?.update(t);
    scene.scenery?.userData?.update?.(t);
    scene.effects?.update(t / 1000, scene.camera.position);
    scene.renderer.info.reset();
    scene.renderer.render(scene.scene, scene.camera);
    return { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles, ...(params.get('why') && { by: drawnBy() }) };
  },
};
