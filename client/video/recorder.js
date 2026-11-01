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
//   broadcast(t, opts)          the broadcast overlay at race time t (the standings tower, the race clock and sectors, name tags)
//   intro(k, { title, sub })    the broadcast's intro card;  results(k, { title, sub, city }) the results board
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
  css.setProperty('--line', T.colours[T.text.colour] ?? T.colours.text); // (the tagline's colour: template text.colour)
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
/**
 * The race on to `t`, a step of `step` race ms at a time (the cameras easing 1/60 s a step), the game's
 * camera following `follow` ('leader' or an entry index: a marble in the pack). A new marble to follow
 * is a cut: the camera starts afresh behind it rather than sweeping across.
 */
let following = 'leader';
function advanceTo(t, step = 1000 / 60, follow = 'leader') {
  if (clock === null || t < clock - 1) beginRace();
  if (clock < -countdown) clock = -countdown;
  if (follow !== following) { following = follow; scene.main.ready = false; }
  // (Far behind: catch up in bigger steps, the cameras settled by the last few.)
  while (t - clock > 400) { clock += 50; scene.updateRace(frameAt(clock), follow, 0.05); }
  while (clock < t - 0.5) { clock = Math.min(t, clock + step); scene.updateRace(frameAt(clock), follow, 1 / 60); }
  clock = t;
}
let groupState = null;
const BASE_FOV = scene.camera.fov;
let custom = false; // (a shot of this page's own camera: the game's camera starts afresh after it, at its own lens)
function place({ from, to, fov }) {
  scene.tvLens = undefined;
  custom = true;
  scene.camera.fov = BASE_FOV;
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


// ── The broadcast overlay (plans.mjs broadcast; template.json broadcast) ──
const B = T.broadcast ?? {};
const lookOf = (i) => race.entries[i]?.marble?.look;
const chipCss = (i) => `${GLOSS}, ${pictureBackground(badgeOf(lookOf(i)), lookOf(i))}`;
const nameOf = (i) => race.entries[i]?.marble?.name ?? `#${i + 1}`;
const finishOf = Object.fromEntries(race.results.map((r) => [r.index, r.finishTimeMs]));
const winMs = winner.finishTimeMs;
// When the race (its first marble) first reached each share of the track: the gap of a marble is how long ago
// the front of the race was where it is now (the broadcast's gap to the leader).
const BINS = 4000;
const firstAt = new Float64Array(BINS + 1).fill(Infinity);
{
  // (Between two frames, the front of the race is taken to move evenly: gaps to the millisecond, not the frame.)
  let reached = -1;
  let prevT = 0;
  let prevP = 0;
  race.frames.forEach((f, k) => {
    const t = f.t ?? k * race.tickMs;
    const pNow = Math.max(...f.p);
    const top = Math.min(BINS, Math.floor(pNow * BINS));
    for (let b = reached + 1; b <= top; b += 1) firstAt[b] = pNow > prevP ? prevT + ((b / BINS - prevP) / (pNow - prevP)) * (t - prevT) : t;
    if (top > reached) reached = top;
    prevT = t;
    prevP = Math.max(prevP, pNow);
  });
}
const SECTOR_AT = [1 / 3, 2 / 3, 1].map((q) => (q >= 1 ? winMs : firstAt[Math.floor(q * BINS)]));
const clockText = (ms) => { const m = Math.max(0, ms); return `${Math.floor(m / 60000)}:${String(Math.floor((m % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor(m % 1000)).padStart(3, '0')}`; };
const secText = (ms) => (ms / 1000).toFixed(3);
const orderAt = (t) => {
  const f = frameAt(Math.max(0, t));
  if (!f) return [];
  // (Finished marbles by their finish; the rest by how far down the track.)
  return race.entries.map((_, i) => i).sort((a, b) => {
    const fa = finishOf[a] !== undefined && finishOf[a] <= t ? finishOf[a] : null;
    const fb = finishOf[b] !== undefined && finishOf[b] <= t ? finishOf[b] : null;
    if (fa !== null || fb !== null) return (fa ?? Infinity) - (fb ?? Infinity);
    return (f.p[b] ?? 0) - (f.p[a] ?? 0) || a - b;
  });
};
const gapOf = (i, t) => {
  if (finishOf[i] !== undefined && finishOf[i] <= t) return finishOf[i] - winMs;
  const f = frameAt(t);
  const x = Math.min(1, f.p[i] ?? 0) * BINS;
  const b = Math.min(BINS - 1, Math.floor(x));
  const at = firstAt[b] + (firstAt[b + 1] - firstAt[b]) * (x - b);
  return Math.max(0, t - at);
};
let towerKey = '';
let sectorKey = '';
const broadcastApi = {
  broadcast(t, { opacity = 1, label = null, tags = true, captionOn = false } = {}) {
    $('bc').style.opacity = String(opacity);
    if (!opacity) return;
    $('tGp').textContent = B.towerTitle ?? 'GRAND PRIX';
    $('tCity').textContent = B.city ?? '';
    const ord = orderAt(t);
    const before = orderAt(t - 1500);
    const rows = ord.slice(0, B.towerRows ?? 10).map((i, k) => {
      const was = before.indexOf(i);
      const arrow = t <= 1500 || was === k ? '' : was > k ? 'up' : 'down';
      let gap;
      if (t <= 0) gap = `Gate ${(race.entries[i].lane ?? i) + 1}`;
      else if (k === 0) gap = finishOf[i] !== undefined && finishOf[i] <= t ? secText(finishOf[i]) : B.leader ?? 'Leader';
      else gap = `+${secText(gapOf(i, t))}`;
      return `<div class="trow p${k + 1}"><span class="pos">${k + 1}</span><span class="chip" style="background:${chipCss(i)}"></span><span class="nm">${nameOf(i)}</span><span class="gap${k === 0 ? ' lead' : ''}">${gap}</span><span class="arrow ${arrow}">${arrow === 'up' ? '▲' : arrow === 'down' ? '▼' : ''}</span></div>`;
    }).join('');
    if (rows !== towerKey) { towerKey = rows; $('trows').innerHTML = rows; }
    // The race clock (from GO; it stops when the winner crosses the line) and the three sectors (the front of the race's times).
    const shown = Math.min(Math.max(0, t), winMs);
    $('clock').textContent = clockText(shown);
    $('clockLbl').textContent = t >= winMs ? (B.finished ?? 'Finished').toUpperCase() : 'RACE TIME';
    const names = B.sectors ?? ['S1', 'S2', 'S3'];
    const cells = SECTOR_AT.map((end, k) => {
      const start = k ? SECTOR_AT[k - 1] : 0;
      const state = t >= end ? 'done' : t >= start && t > 0 ? 'now' : '';
      const v = state === 'done' ? secText(end - start) : state === 'now' ? secText(t - start) : '—';
      return `<div class="sector ${state}"><div class="k">${names[k]}</div>${v}</div>`;
    }).join('');
    if (cells !== sectorKey) { sectorKey = cells; $('sectors').innerHTML = cells; }
    const rt = $('replayTag');
    rt.style.display = label ? 'block' : 'none';
    rt.textContent = label ?? '';
    // Name tags over the marbles near the camera (in front of it and on screen, the nearest few).
    const near = [];
    if (tags && t > -500) {
      const cam = scene.camera;
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (let i = 0; i < race.entries.length; i += 1) {
        if (finishOf[i] !== undefined && finishOf[i] < t - 1500) continue;
        const pos = scene.marbles?.positionOf?.(i);
        if (!pos) continue;
        const d = pos.distanceTo(cam.position);
        if (d > (B.tagNearMetres ?? 24) || d < 1.5) continue;
        const q = pos.clone().add(new Vector3(0, 0.62, 0)).project(cam); // (the marble's top: the tag stands just above it)
        if (q.z > 1 || Math.abs(q.x) > 0.92 || q.y > 0.9 || q.y < -0.92) continue;
        const x = (q.x * 0.5 + 0.5) * W;
        const y = (0.5 - q.y * 0.5) * H;
        if (x < W * 0.27 && y < H * 0.42) continue; // (under the tower)
        if (x > W * 0.62 && y < H * 0.2) continue; // (under the clock and the mark)
        if (captionOn && x < W * 0.66 && y > H * 0.74) continue; // (under the caption)
        near.push({ i, d, x, y });
      }
      near.sort((a, b) => a.d - b.d);
    }
    const place = new Map(ord.map((i, k) => [i, k + 1]));
    // (No two tags over each other: a nearer marble's tag wins the place.)
    const placed = [];
    const vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
    const shownTags = [];
    for (const n of near) {
      if (shownTags.length >= (B.tagMax ?? 6)) break;
      n.y -= 1.6 * vmin;
      const w = (nameOf(n.i).length * 0.95 + 5.5) * vmin;
      const box = [n.x - w / 2, n.y - 3 * vmin, n.x + w / 2, n.y];
      if (placed.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
      placed.push(box);
      shownTags.push(n);
    }
    $('tags').innerHTML = shownTags.map((n) => `<div class="tag" style="left:${n.x.toFixed(0)}px;top:${n.y.toFixed(0)}px"><span class="chip" style="width:1.8vmin;height:1.8vmin;background:${chipCss(n.i)}"></span><b>${place.get(n.i)}</b>${nameOf(n.i)}</div>`).join('');
  },
  caption(k, text = '', { big = false } = {}) {
    const el = $('cap');
    el.style.opacity = String(k);
    el.style.transform = `translateY(${(1 - k) * 18}px)`;
    if (k > 0 && el.textContent !== text) el.textContent = text;
    el.classList.toggle('big', big);
  },
  intro(k, { title = '', sub = '' } = {}) {
    const el = $('intro');
    el.style.opacity = String(k);
    el.style.transform = `translateX(${(1 - k) * -40}px)`;
    if (k > 0) {
      $('introT').innerHTML = title.replace(/·\s*(.*)$/, '· <em>$1</em>');
      $('introS').textContent = sub;
    }
  },
  results(k, { title = 'Results', sub = '', winnerLabel = 'Winner', columns = ['Pos', 'Marble', 'Gate', 'Time', 'Gap'] } = {}) {
    const el = $('results');
    el.style.opacity = String(k);
    if (k <= 0 || el.dataset.done) return;
    el.dataset.done = '1';
    const fin = [...race.results].filter((r) => Number.isFinite(r.finishTimeMs)).sort((a, b) => a.finishTimeMs - b.finishTimeMs);
    const w = fin[0];
    $('wLab').textContent = winnerLabel.toUpperCase();
    $('wBall').style.background = chipCss(w.index);
    $('wWho').textContent = nameOf(w.index);
    $('wTm').textContent = clockText(w.finishTimeMs);
    $('rTitle').textContent = title.toUpperCase();
    $('rSub').textContent = sub;
    const hd = `<div class="rrow hd"><span class="c">${columns[0]}</span><span></span><span>${columns[1]}</span><span class="c">${columns[2]}</span><span class="r">${columns[3]}</span><span class="r">${columns[4]}</span></div>`;
    $('rrows').innerHTML = hd + fin.map((r, k2) => `<div class="rrow${k2 === 0 ? ' w' : ''}"><span class="c pl">${k2 + 1}</span><span class="chip" style="background:${chipCss(r.index)}"></span><span>${nameOf(r.index)}</span><span class="c">${(race.entries[r.index].lane ?? r.index) + 1}</span><span class="r">${clockText(r.finishTimeMs)}</span><span class="r">${k2 === 0 ? '—' : `+${secText(r.finishTimeMs - w.finishTimeMs)}`}</span></div>`).join('');
  },
};

window.rec = {
  ready: (async () => { beginRace(); await scene.whenReady?.(); await new Promise((r) => setTimeout(r, 600)); await document.fonts.ready; return true; })(),
  info() {
    const fin = race.results.map((r) => r.finishTimeMs).filter(Number.isFinite).sort((a, b) => a - b);
    const tv = (scene.tvCams ?? []).map((c) => ({ p: c.p, s: c.s, pos: c.pos.toArray() }));
    return {
      name: track.name, countdownMs: countdown, durationMs: race.durationMs, winnerMs: fin[0], margin: fin[1] - fin[0], flyMs: FLY_MS, tv,
      arc: scene.channel?.arc ?? scene.centerline.samples.reduce((a, x, i, all) => a + (i ? x.pos.distanceTo(all[i - 1].pos) : 0), 0),
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
  race(t, { step, follow = 'leader' } = {}) {
    if (custom) { custom = false; scene.tvLens = undefined; scene.camera.fov = BASE_FOV; scene.camera.updateProjectionMatrix(); scene.main.ready = false; }
    advanceTo(t, step, follow);
    draw(t);
  },
  /**
   * The race at t from a camera riding behind and above a group of marbles (`members`: entry
   * indexes; the pack, or the whole field leaving the gate), looking on down the track at them:
   * the broadcast's wide chase. Eased, so it glides; `shot` (any key) snaps it when a new shot starts.
   */
  group(t, { members, shot, back = 11, up = 6.5, ahead = 6, fov = 46, step }) {
    advanceTo(t, step, 'leader');
    const pts = members.map((i) => scene.marbles.positionOf(i)).filter(Boolean);
    if (!pts.length) { draw(t); return; }
    const c = pts.reduce((a, q) => a.add(q), new Vector3()).multiplyScalar(1 / pts.length);
    const f = frameAt(t);
    const p = members.reduce((a, i) => a + Math.min(1, f.p[i] ?? 0), 0) / members.length;
    const s = spot(p);
    const cam = c.clone().addScaledVector(s.ahead, -back).add(new Vector3(0, up, 0));
    const ground = scene.scenery?.userData?.groundAt?.(cam.x, cam.z);
    if (Number.isFinite(ground) && cam.y < ground + 3) cam.y = ground + 3;
    const aim = c.clone().addScaledVector(s.ahead, ahead);
    if (!groupState || groupState.shot !== shot) groupState = { shot, cam: cam.clone(), aim: aim.clone() };
    else { groupState.cam.lerp(cam, 0.08); groupState.aim.lerp(aim, 0.12); }
    place({ from: groupState.cam.toArray(), to: groupState.aim.toArray(), fov });
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
  pan(t, { from, follow = 'leader', members = null, fov = 32, ease = 0.18, lead = 0.6 }) {
    advanceTo(t);
    const f = frameAt(t);
    const index = typeof follow === 'number' ? follow : (f.s ?? [])[follow === 'second' ? 1 : 0] ?? 0;
    // (members: aimed at the middle of a group instead, e.g. the whole field leaving the gate.)
    const pts = members ? members.map((i) => scene.marbles.positionOf(i)).filter(Boolean) : [];
    const at = pts.length ? pts.reduce((a, q) => a.add(q), new Vector3()).multiplyScalar(1 / pts.length) : scene.marbles.positionOf(index);
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
  ...broadcastApi,
  /** The broadcast's settings from record.mjs (the city, the tower's title). */
  setBroadcast(o) { Object.assign(B, o); },
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
