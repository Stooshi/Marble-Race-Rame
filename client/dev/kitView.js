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
import { Frustum, Matrix4, Raycaster, Vector3 } from 'three';
import { TrackScene } from '../src/three/TrackScene';
import { frameAtTime } from '../src/utils/splits';
import { COUNTDOWN_MS } from '../src/three/startCamera';
import { ITEMS, dressEntries } from '../src/shared/marbles';
import { BUILT_MATERIALS } from '../src/shared/marbles/materials';

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
    for (let x = o; x && x !== scene.scene; x = x.parent) path.unshift(x.name || (x === o && x.material?.color ? `${x.type}#${x.material.color.getHexString()}` : x.type));
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
// &looks=all: every marble in a finished collection look (the phone check with 20 decorated marbles).
// (&designs=snowball-before,snowball: the field in designs under review, from the Holiday preview page, taking turns.)
if (race && params.get('designs')) {
  const { REVIEW_LOOKS } = await import('../src/site/marbles/holidayDesigns');
  const keys = params.get('designs').split(',');
  race.entries = race.entries.map((e, i) => {
    const key = keys[i % keys.length];
    return { ...e, marble: { ...e.marble, customLook: { key: `holiday:${key}`, look: REVIEW_LOOKS[key] } } };
  });
}
if (race && params.get('looks') === 'all') {
  race.entries = dressEntries(race.entries, params.get('race'), ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material)).map((i) => i.slug));
}
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
/** Draw calls the marbles themselves cost in this view (each marble its own; their shadows one). */
function marbleCalls() {
  if (!scene.marbles) return { calls: 0, triangles: 0 };
  scene.camera.updateMatrixWorld();
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(scene.camera.projectionMatrix, scene.camera.matrixWorldInverse));
  let calls = 0;
  let triangles = 0;
  scene.marbles.group.traverseVisible((o) => {
    if (!o.isMesh || (o.frustumCulled && !frustum.intersectsObject(o))) return;
    calls += 1;
    const g = o.geometry;
    triangles += ((g.index ? g.index.count : g.getAttribute('position').count) / 3) * (o.count ?? 1);
  });
  return { calls, triangles: Math.round(triangles) };
}

function drawNow(t) {
  scene.effects?.update(t / 1000, scene.camera.position);
  scene.holiday?.tick(t / 1000, scene.camera.position); // (the Holiday Season's lights and weather)
  scene.renderer.info.reset();
  scene.renderer.render(scene.scene, scene.camera);
  return { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles, marbles: marbleCalls(), ...(params.get('why') && { by: drawnBy() }) };
}

window.kitView = {
  /** Dev: the scenery's notes (a coaster's lift hill and station). */
  info() {
    const u = scene.scenery?.userData ?? {};
    const v = (x) => x && { x: x.x, y: x.y, z: x.z };
    const s0 = scene.centerline?.samples?.[0];
    const start = s0 && { top: v(s0.pos), back: v(new Vector3(-s0.tangent.x, 0, -s0.tangent.z).normalize()), side: v(new Vector3(s0.side.x, 0, s0.side.z).normalize()) };
    return { liftHill: u.liftHill && { top: v(u.liftHill.top), foot: v(u.liftHill.foot), back: v(u.liftHill.back), side: v(u.liftHill.side), length: u.liftHill.length }, start };
  },
  /** Dev: the land's height at (x, z). */
  ground(x, z) {
    return scene.scenery?.userData?.groundAt?.(x, z);
  },
  /** Dev: a free camera, from one point looking at another ([x, y, z] each), one frame drawn. */
  look({ from, to }) {
    scene.camera.position.set(...from);
    scene.camera.near = 0.3;
    scene.camera.far = scene.sky.scale.x * 1.2;
    scene.camera.lookAt(...to);
    scene.camera.updateProjectionMatrix();
    scene.renderer.render(scene.scene, scene.camera);
  },
  race: race && { durationMs: race.durationMs, countdownMs: countdown, winnerMs: Math.min(...race.results.map((r) => r.finishTimeMs)) },
  /** Dev: a spot on the track (share of the way down): its centre, its sideways and its forward directions ([x, y, z] each). */
  spot(p) {
    const { samples, segments } = scene.centerline;
    const f = Math.min(1, Math.max(0, p)) * segments;
    const i = Math.min(segments - 1, Math.floor(f));
    const a = samples[i];
    const b = samples[i + 1];
    const pos = new Vector3().lerpVectors(a.pos, b.pos, f - i);
    const v = (x) => [x.x, x.y, x.z];
    return { pos: v(pos), side: v(new Vector3(a.side.x, 0, a.side.z).normalize()), ahead: v(new Vector3(a.tangent.x, 0, a.tangent.z).normalize()), arc: scene.channel?.arc ?? null };
  },
  /** Dev: hide or show a part of the drawing ('scenery', 'structures', 'features', 'billboards', 'ground', 'track': the channel and finish pieces). */
  show(part, on) {
    const g = { scenery: scene.scenery, structures: scene.structures?.group, features: scene.features?.group, billboards: scene.billboards?.group, ground: scene.ground }[part];
    if (g) g.visible = on;
    if (part === 'track') for (const c of scene.trackGroup.children) if (![scene.scenery, scene.structures?.group, scene.features?.group, scene.billboards?.group].includes(c)) c.visible = on;
  },
  /** Dev: what is drawn at a screen point (pixels from the top left) in the last view: the names up its parents, and the point. */
  pick({ x, y }) {
    const ray = new Raycaster();
    ray.setFromCamera({ x: (x / window.innerWidth) * 2 - 1, y: -(y / window.innerHeight) * 2 + 1 }, scene.camera);
    const hit = ray.intersectObjects(scene.scene.children, true).find((h) => h.object.visible);
    if (!hit) return null;
    const names = [];
    for (let o = hit.object; o && o !== scene.scene; o = o.parent) names.push(o.name || o.type);
    const m = hit.object.material; names.push(`colour ${m?.color?.getHexString?.() ?? '?'}${m?.vertexColors ? ' (vertex colours)' : ''}`, `parent index ${scene.scene.children.indexOf(hit.object.parent?.parent ?? hit.object.parent)}`);
    const owner = [['scenery', scene.scenery], ['structures', scene.structures?.group], ['features', scene.features?.group], ['billboards', scene.billboards?.group]].find(([, g]) => { let found = false; g?.traverse((o) => { if (o === hit.object) found = true; }); return found; });
    names.push(`in ${owner?.[0] ?? 'the track itself'}`);
    if (hit.face) {
      const pos = hit.object.geometry.getAttribute('position');
      const v = [hit.face.a, hit.face.b, hit.face.c].map((k) => new Vector3().fromBufferAttribute(pos, k).applyMatrix4(hit.object.matrixWorld).toArray().map((x) => +x.toFixed(2)));
      names.push(`triangle ${JSON.stringify(v)}`);
      const col = hit.object.geometry.getAttribute('color');
      if (col) names.push(`vertex colour ${[col.getX(hit.face.a), col.getY(hit.face.a), col.getZ(hit.face.a)].map((x) => x.toFixed(2)).join(',')}`);
    }
    return { names, point: hit.point.toArray().map((v) => +v.toFixed(2)), distance: +hit.distance.toFixed(2) };
  },
  /** Dev (clips): the race at t ms, seen from a fixed camera ([x, y, z] from and to). */
  raceLook({ t, from, to, fov = null }) {
    advance(t, 'leader');
    scene.camera.position.set(...from);
    scene.camera.near = 0.3;
    scene.camera.far = scene.sky.scale.x * 1.2;
    if (fov) scene.camera.fov = fov;
    scene.camera.lookAt(...to);
    scene.camera.updateProjectionMatrix();
    return drawNow(t);
  },
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

  /** Plays the race live (follow camera) from `from` ms for `seconds`, and reports frames per second and the slowest frame. */
  racePlay({ from = 0, seconds = 8 } = {}) {
    advance(from);
    return new Promise((resolve) => {
      const start = performance.now();
      let prev = start; let frames = 0; let worst = 0; let cpu = 0; let calls = 0;
      const tick = (now) => {
        const t0 = performance.now();
        const t = from + (now - start);
        scene.updateRace(raceFrame(t), 'leader', (now - prev) / 1000);
        const s = drawNow(t);
        cpu += performance.now() - t0;
        calls = Math.max(calls, s.calls);
        worst = Math.max(worst, now - prev); prev = now; frames += 1;
        if (now - start < seconds * 1000) requestAnimationFrame(tick);
        else resolve({ fps: Math.round((frames * 1000) / (now - start)), worstMs: Math.round(worst), cpuMsPerFrame: +(cpu / frames).toFixed(2), maxCalls: calls });
      };
      requestAnimationFrame(tick);
    });
  },

  /**
   * The track picker's picture: a raised three-quarter view from behind and beside the leader,
   * looking on down the track, the same on every track. Tries each moment (ms after GO) on both
   * sides, keeps the one that shows the most marbles unblocked with the camera clear of the land,
   * draws it and returns what it picked. `pick`: { t, side } to draw one pose without choosing.
   */
  banner({ times = [], back = 10, beside = 2.5, up = 6.5, ahead = 16, pick = null } = {}) {
    if (scene.billboards) scene.billboards.group.visible = false; // (no text in the picture)
    const ray = new Raycaster();
    ray.camera = scene.camera; // (sprites need it)
    const others = scene.scene.children.filter((o) => o !== scene.marbles?.group && o !== scene.sky);
    const pose = (t, sideSign) => {
      advance(t, 'leader');
      const f = raceFrame(t);
      const lead = f.s?.[0] ?? f.p.indexOf(Math.max(...f.p));
      const L = scene.marbles.positionOf(lead);
      if (!L) return null;
      const { samples, segments } = scene.centerline;
      const sm = samples[Math.round(Math.min(1, Math.max(0, f.p[lead])) * segments)];
      const T = new Vector3(sm.tangent.x, 0, sm.tangent.z).normalize();
      const S = new Vector3(sm.side.x, 0, sm.side.z).normalize();
      // Behind the fourth marble (or the last of the first four still racing), so a few are in the picture.
      const fourth = (f.s ?? []).slice(0, 4).map((i) => scene.marbles.positionOf(i)).filter(Boolean).pop() ?? L;
      const base = fourth.distanceTo(L) < 40 ? fourth : L;
      const cam = base.clone().addScaledVector(T, -back).addScaledVector(S, beside * sideSign).add(new Vector3(0, up, 0));
      const ground = scene.scenery?.userData?.groundAt?.(cam.x, cam.z);
      const lifted = Number.isFinite(ground) && cam.y < ground + 3 ? ground + 3 - cam.y : 0;
      cam.y += lifted;
      const target = L.clone().addScaledVector(T, ahead).add(new Vector3(0, -1, 0));
      return { t, side: sideSign, lead, cam, target, lifted };
    };
    const place = (p) => {
      scene.camera.position.copy(p.cam);
      scene.camera.near = 0.3;
      scene.camera.far = scene.sky.scale.x * 1.2;
      scene.camera.lookAt(p.target);
      scene.camera.updateProjectionMatrix();
      scene.camera.updateMatrixWorld();
    };
    const score = (p) => {
      place(p);
      const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(scene.camera.projectionMatrix, scene.camera.matrixWorldInverse));
      let seen = 0;
      let blocked = 0;
      let nearest = Infinity;
      scene.marbles.positions.forEach((m) => {
        if (!m || !frustum.containsPoint(m)) return;
        const d = m.distanceTo(p.cam);
        nearest = Math.min(nearest, d);
        if (d > 90) return;
        ray.set(p.cam, m.clone().sub(p.cam).normalize());
        ray.far = d - 0.6;
        if (ray.intersectObjects(others, true).length) blocked += 1;
        else seen += 1;
      });
      const L = scene.marbles.positionOf(p.lead);
      ray.set(p.cam, L.clone().sub(p.cam).normalize());
      ray.far = L.distanceTo(p.cam) - 0.6;
      const leaderBlocked = ray.intersectObjects(others, true).length > 0;
      // (A marble right in front of the lens fills the picture: never that.)
      return { seen, blocked, leaderBlocked, value: Math.min(seen, 8) - blocked * 0.5 - (leaderBlocked ? 6 : 0) - (p.lifted > 4 ? 2 : 0) - (nearest < 5 ? 12 : 0) };
    };
    // A track's own framing (scripts/track-banners.json): the camera set by a spot on the track
    // (`at`: share of the way down) rather than by the leader, with the race at the moment the
    // leader gets there (or `t`).
    if (pick?.at !== undefined) {
      const arc = scene.channel?.arc ?? scene.centerline.length ?? 1000;
      const o = { back, beside, up, ahead, rise: 0, side: 1, ...pick };
      const firstAt = race.frames.find((fr) => Math.max(...fr.p) >= o.at);
      const t = o.t ?? (firstAt ? firstAt.t ?? race.frames.indexOf(firstAt) * race.tickMs : 0);
      advance(t, 'leader');
      const anchor = at(o.at);
      const { samples, segments } = scene.centerline;
      const sm = samples[Math.round(Math.min(1, Math.max(0, o.at)) * segments)];
      const T = new Vector3(sm.tangent.x, 0, sm.tangent.z).normalize();
      const cam = anchor.pos.clone().addScaledVector(T, -o.back).addScaledVector(anchor.side, o.beside * o.side).add(new Vector3(0, o.up, 0));
      // (Past the finish, e.g. a pinball table's flippers: on along the last stretch's direction.)
      const end = samples[segments];
      const past = Math.max(0, o.at * arc + o.ahead - arc);
      const target = at(o.at + o.ahead / arc).pos.addScaledVector(new Vector3(end.tangent.x, 0, end.tangent.z).normalize(), past).add(new Vector3(0, o.rise, 0));
      const p = { t, side: o.side, lead: 0, cam, target, lifted: 0 };
      place(p);
      scene.features?.update(t);
      scene.structures?.update(t);
      drawNow(t);
      const sc = score(p);
      return { t, side: o.side, ...sc, leaderBlocked: false, framed: true }; // (framed by hand: no leader to keep in view)
    }
    let best = null;
    const tries = [];
    for (const t of pick ? [pick.t] : times) {
      for (const sideSign of pick ? [pick.side] : [1, -1]) {
        const p = pose(t, sideSign);
        if (!p) continue;
        const sc = score(p);
        tries.push({ t, side: sideSign, ...sc });
        if (!best || sc.value > best.sc.value) best = { p, sc };
      }
    }
    if (!best) return { tries };
    advance(best.p.t, 'leader');
    place(best.p);
    scene.features?.update(best.p.t);
    scene.structures?.update(best.p.t);
    drawNow(best.p.t);
    return { t: best.p.t, side: best.p.side, ...best.sc, tries };
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
    scene.holiday?.tick(t / 1000, scene.camera.position); // (the Holiday Season's lights and weather)
    scene.renderer.info.reset();
    scene.renderer.render(scene.scene, scene.camera);
    return { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles, ...(params.get('why') && { by: drawnBy() }) };
  },
};
