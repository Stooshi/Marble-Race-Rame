// The video recorder's page (development only, never part of the website: client/video/README.md).
// Draws a track and a race through the game's own drawing (TrackScene) and cameras, frame by frame,
// with nothing on screen but the picture and the video's own texts. record.mjs drives it from a
// headless browser and turns the frames into an MP4.
//   /video/recorder.html?track=<slug>&race=<name>   (client/dev/.tracks/<slug>.json and <name>.json:
//   node scripts/video-race.js writes both)
// window.rec:
//   flyover(ms)                 the calm helicopter flyover (FLY_MS long, ?fly=<ms>), the field at the gate
//   race(t, { speed })          the race at t ms after GO (negative: the countdown) through the game's
//                               cameras (follow, TV moments, the finish shot, the winner's push-in);
//                               frames must come in order (jumping back starts the race again)
//   look(t, { from, to, fov })  the race at t from a fixed camera ([x, y, z] each)
//   finishSide(t, opts)         the race at t from beside the finish line (the slow-motion replay)
//   text({ top, opacity })      the video's one line of text (template.json's style and place; null: none)
//   podium(k, rows)             the podium card (k: 0 hidden … 1 shown)
// The look (colours, font, the text's size and place, the mark's corner) comes from template.json.
import { Vector3 } from 'three';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { COUNTDOWN_MS } from '../src/three/startCamera';
import { flyoverHighlight, flyoverPath } from '../src/three/flyover';
import { HOUSE_LOOKS, dressEntries, lookName } from '../src/shared/marbles';
import { GLOSS, badgeOf } from '../src/shared/marbles/badge';
import { pictureBackground } from '../src/site/marbles/picture';

const params = new URLSearchParams(window.location.search);
const slug = params.get('track');
const FLY_MS = Number(params.get('fly') || 13000);
const track = await (await fetch(`../dev/.tracks/${slug}.json`)).json();
// The template: the brand's colours, font, text style and the mark's corner (template.json).
const T = await (await fetch('./template.json')).json();
{
  const css = document.documentElement.style;
  const tall = window.innerHeight > window.innerWidth;
  for (const k of ['navy', 'yellow', 'orange', 'text']) css.setProperty(`--${k}`, T.colours[k]);
  css.setProperty('--font', `'${T.font}'`);
  css.setProperty('--text-size', `${T.text.sizeVmin}vmin`);
  css.setProperty('--text-top', tall ? T.text.topTall : T.text.topWide);
  css.setProperty('--mark-size', `${T.mark.sizeVmin}vmin`);
  css.setProperty('--mark-margin', `${T.mark.marginVmin}vmin`);
  css.setProperty('--mark-opacity', String(T.mark.opacity));
  document.getElementById('mark').setAttribute('class', T.mark.corner);
  document.getElementById('podiumTitle').textContent = T.podium.title;
}
const race = await (await fetch(`../dev/.tracks/${params.get('race')}.json`)).json();
// The field in the standard collection's finished looks (never a seasonal or limited one), named after them.
race.entries = dressEntries(race.entries, params.get('race'), HOUSE_LOOKS).map((e) => ({ ...e, marble: { ...e.marble, name: lookName(e.marble.look) ?? e.marble.name } }));

const canvas = document.getElementById('view');
const scene = new TrackScene(canvas, { interactive: false, lite: false, scenery: true, maxPixelRatio: 1 });
scene.billboardSource = async () => [];
scene.setSize(window.innerWidth, window.innerHeight);
scene.setTrack(track);
scene.render = () => {}; // (this page draws each frame itself, at full size: no frame pacing, no lowered resolution)

const countdown = race.start ? Math.max(COUNTDOWN_MS, race.start.countdownMs ?? 0) : 0;
const winnerIndex = race.results.reduce((a, r, i) => (r.finishTimeMs < race.results[a].finishTimeMs ? i : a), 0);
const winner = race.results[winnerIndex];
const frameAt = (t) => {
  const f = frameAtTime(race.frames, race.tickMs, t);
  return t < 0 && f ? { ...f, t } : f;
};
let clock = null;
let panState = null;
function beginRace() {
  scene.setRace(race.entries, [], race.results, race.start ? { ...race.start, countdownMs: countdown, frame: race.frames[0] } : null);
  scene.setCameraMode('follow');
  scene.setCelebration({ index: winner.index ?? winnerIndex, ms: winner.finishTimeMs });
  clock = -countdown - 1000 / 60;
}
function draw(t) {
  scene.effects?.update(t / 1000, scene.camera.position);
  scene.holiday?.tick(t / 1000, scene.camera.position);
  scene.renderer.render(scene.scene, scene.camera);
}
/** The race on to `t`, a step of `step` race ms at a time (the cameras easing 1/60 s a step). */
function advanceTo(t, step = 1000 / 60) {
  if (clock === null || t < clock - 1) beginRace();
  if (clock < -countdown) clock = -countdown;
  // (Far behind: catch up in bigger steps, the cameras settled by the last few.)
  while (t - clock > 400) { clock += 50; scene.updateRace(frameAt(clock), 'leader', 0.05); }
  while (clock < t - 0.5) { clock = Math.min(t, clock + step); scene.updateRace(frameAt(clock), 'leader', 1 / 60); }
  clock = t;
}
function place({ from, to, fov }) {
  scene.camera.position.set(...from);
  scene.camera.near = 0.3;
  scene.camera.far = scene.sky.scale.x * 1.2;
  if (fov) scene.camera.fov = fov;
  scene.camera.lookAt(...to);
  scene.camera.updateProjectionMatrix();
  scene.camera.updateMatrixWorld();
}
/** A spot on the track (share of the way down): its centre, sideways and forward directions. */
function spot(p) {
  const { samples, segments } = scene.centerline;
  const f = Math.min(1, Math.max(0, p)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const a = samples[i];
  const b = samples[i + 1];
  return { pos: new Vector3().lerpVectors(a.pos, b.pos, f - i), side: new Vector3(a.side.x, 0, a.side.z).normalize(), ahead: new Vector3(a.tangent.x, 0, a.tangent.z).normalize() };
}

// The long flyover: the game's own flight (flyover.js), given FLY_MS instead of the game's 4 s.
let flight = null;
function longFlight() {
  if (flight) return flight;
  scene.flyoverFor(); // (works out where the flight can go: the heights over the scenery)
  flight = flyoverPath(scene.centerline, scene.flyoverTopAt.topAt, {
    highlight: flyoverHighlight(scene.track), end: scene.countdownStart(), aspect: scene.camera.aspect, fov: scene.camera.fov, durationMs: FLY_MS,
  });
  return flight;
}

// ── The texts and the podium (HTML over the picture) ──────────────────────
const $ = (id) => document.getElementById(id);
const fmt = (ms) => `${(ms / 1000).toFixed(2)} s`;

window.rec = {
  ready: (async () => { beginRace(); await scene.whenReady?.(); await new Promise((r) => setTimeout(r, 600)); await document.fonts.ready; return true; })(),
  info() {
    const fin = race.results.map((r) => r.finishTimeMs).filter(Number.isFinite).sort((a, b) => a - b);
    const tv = (scene.tvCams ?? []).map((c) => ({ p: c.p, s: c.s, pos: c.pos.toArray() }));
    return {
      name: track.name, countdownMs: countdown, durationMs: race.durationMs, winnerMs: fin[0], margin: fin[1] - fin[0], flyMs: FLY_MS, tv,
      podium: [...race.results].sort((a, b) => a.finishTimeMs - b.finishTimeMs).slice(0, 3).map((r) => {
        const e = race.entries[r.index];
        return { name: e.marble.name, look: e.marble.look, ms: r.finishTimeMs, index: r.index };
      }),
      // When the leader first reaches share p of the track (ms after GO): for placing cuts.
      leaderAt: Object.fromEntries([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1].map((p) => {
        const f = race.frames.find((fr) => Math.max(...fr.p) >= p);
        return [p, f ? (f.t ?? race.frames.indexOf(f) * race.tickMs) : race.durationMs];
      })),
    };
  },
  flyover(ms) {
    if (clock === null || clock > -countdown) { beginRace(); advanceTo(-countdown); }
    const path = longFlight();
    const { camera, target } = path.poseAt(Math.min(ms, FLY_MS));
    scene.camera.position.copy(camera);
    scene.camera.lookAt(target);
    scene.camera.updateMatrixWorld();
    scene.main.ready = false;
    scene.features?.update(-countdown);
    scene.structures?.update(-countdown);
    draw(-countdown);
  },
  race(t, { step } = {}) {
    advanceTo(t, step);
    draw(t);
  },
  look(t, eye) {
    advanceTo(t);
    place(eye);
    draw(t);
  },
  /**
   * The race at t from a camera standing still at `from`, turning to keep a marble in the picture
   * (follow: 'leader', 'second' or an entry index; the turn eased so the picture never jerks):
   * a broadcast's trackside pan.
   */
  pan(t, { from, follow = 'leader', fov = 32, ease = 0.18, lead = 0.6 }) {
    advanceTo(t);
    const f = frameAt(t);
    const index = typeof follow === 'number' ? follow : (f.s ?? [])[follow === 'second' ? 1 : 0] ?? 0;
    const at = scene.marbles.positionOf(index);
    const key = JSON.stringify(from);
    // (Aimed a little ahead of the marble, so it runs into the picture.)
    const aim = at ? at.clone().add(new Vector3(0, lead * 0.4, 0)) : null;
    if (!panState || panState.key !== key || !aim) panState = { key, aim: aim ?? new Vector3(...from) };
    else panState.aim.lerp(aim, ease);
    place({ from, to: panState.aim.toArray(), fov });
    draw(t);
  },
  /** Where a fixed camera beside share p of the track stands: `back` metres up the track, `beside` to the side, `up` above, looking `ahead` on. */
  eye({ p, back = 0, beside = 8, up = 2, ahead = 0, lookUp = 0.4, fov = 30 }) {
    const s = spot(p);
    const from = s.pos.clone().addScaledVector(s.ahead, -back).addScaledVector(s.side, beside).add(new Vector3(0, up, 0));
    const ground = scene.scenery?.userData?.groundAt?.(from.x, from.z);
    if (Number.isFinite(ground) && from.y < ground + 2) from.y = ground + 2; // (never under the land)
    const to = spot(p + ahead / (scene.channel?.arc ?? 1000)).pos.add(new Vector3(0, lookUp, 0));
    return { from: from.toArray(), to: to.toArray(), fov };
  },
  text({ top = null, opacity = 1 } = {}) {
    $('top').textContent = top ?? '';
    $('texts').style.opacity = String(opacity);
  },
  podium(k, rows = []) {
    const el = $('podium');
    el.style.opacity = String(Math.min(1, k * 1.4));
    el.style.transform = `translateY(${(1 - k) * 40}px)`;
    if (el.dataset.key !== JSON.stringify(rows)) {
      el.dataset.key = JSON.stringify(rows);
      el.querySelector('.rows').innerHTML = rows.map((r, i) => `
        <div class="row r${i + 1}"><span class="place">${T.podium.places[i]}</span>
        <span class="ball" style="background:${GLOSS}, ${pictureBackground(badgeOf(r.look), r.look)}"></span>
        <span class="who">${r.name}</span><span class="time">${i === 0 ? fmt(r.ms) : `+${((r.ms - rows[0].ms) / 1000).toFixed(2)} s`}</span></div>`).join('');
    }
  },
};
