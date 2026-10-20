/**
 * The Holiday Season's layer (Moses, 20 Oct 2026), on the holiday tracks listed in
 * ../shared/holidayLayer.json: warm string lights twinkling on the start gate and the finish arch,
 * the place's weather (light falling snow on the winter tracks; confetti or warm sparkles on the
 * summer-Christmas and New Year tracks), and a short burst of fireworks over the finish as the
 * winner crosses the line.
 *
 * LOOKS ONLY: built from the track's shape and drawn on the race clock; nothing here is read by the
 * race. Nothing solid: the lights are tiny unlit points hung above the gate and on the arch's beam and
 * posts (outside the channel), the weather is soft points round the camera and the fireworks are
 * points high over the line, so no camera is ever blocked. Two draw calls at most (the lights and the
 * weather share one; the fireworks show only for a few seconds); fewer points on a phone (the quality setting's `lite`).
 */
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Points, PointsMaterial, ShaderMaterial, SRGBColorSpace, Vector2, Vector3,
} from 'three';
import HOLIDAY from '../shared/holidayLayer.json';

const UP = new Vector3(0, 1, 0);

/** The layer's settings for a track: { weather } or null (not a holiday track, or not switched on yet). */
export function holidayOf(slug) {
  if (!slug || !HOLIDAY.on.includes(slug)) return null;
  return { weather: HOLIDAY.weather[slug] ?? null };
}

/** A soft round dot (bright middle, fading edge): the lights, flakes and sparks. */
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const WARM = ['#ffd98a', '#ffc35c', '#fff1c9', '#ff9f43', '#ffe3a3'];

/**
 * The lights and the weather share one draw call: soft points, each with its own size and colour
 * (additive: they glow), drawn by one small shader. Every holiday track has warm lights; its weather is
 * at night or in warm light, where additive points read well.
 */
const VERTEX = `
attribute float size;
attribute vec3 color;
uniform float scale;
varying vec3 vColor;
void main() {
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAGMENT = `
uniform sampler2D map;
varying vec3 vColor;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  if (t.a < 0.02) discard;
  gl_FragColor = vec4(vColor * t.a, t.a);
}`;

/**
 * One Points object: the string lights (rows of positions, fixed) and the weather ('snow',
 * 'confetti', 'sparkles' or null) falling in a box round the camera.
 */
function lightsAndWeather(rows, kind, lite) {
  const bulbs = rows.flat();
  const L = bulbs.length;
  const W = !kind ? 0 : kind === 'snow' ? (lite ? 450 : 2200) : (lite ? 300 : 1200);
  const n = L + W;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const warm = bulbs.map((_, k) => new Color(WARM[k % WARM.length]));
  bulbs.forEach((p, k) => { pos.set([p.x, p.y, p.z], k * 3); size[k] = lite ? 1.25 : 1.05; });
  const box = { w: 60, h: 34 };
  const base = new Float32Array(W * 3);
  const palette = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#b388ff', '#ffffff', '#ff9f1c'].map((c) => new Color(c));
  for (let k = 0; k < W; k += 1) {
    base.set([(hash(k, 1) - 0.5) * box.w, hash(k, 2) * box.h, (hash(k, 3) - 0.5) * box.w], k * 3);
    const c = kind === 'confetti' ? palette[k % palette.length] : kind === 'sparkles' ? new Color('#ffcf6e') : new Color('#e8eef6');
    col.set([c.r, c.g, c.b], (L + k) * 3);
    size[L + k] = kind === 'confetti' ? (lite ? 0.55 : 0.45) : kind === 'sparkles' ? (lite ? 0.42 : 0.34) : (lite ? 0.4 : 0.32);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('size', new Float32BufferAttribute(size, 1));
  const tex = dotTexture();
  const material = new ShaderMaterial({
    uniforms: { map: { value: tex }, scale: { value: 300 } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const object = new Points(g, material);
  object.name = 'holiday: lights and weather';
  object.frustumCulled = false;
  const drawn = new Vector2();
  object.onBeforeRender = (renderer) => { material.uniforms.scale.value = renderer.getDrawingBufferSize(drawn).y / 2; };
  const fall = kind === 'snow' ? 1.3 : kind === 'confetti' ? 2.2 : 0.9; // metres per second
  const sway = kind === 'confetti' ? 1.4 : 0.8;
  const wrap = (v, sz) => ((((v + sz / 2) % sz) + sz) % sz) - sz / 2;
  const update = (sec, at) => {
    const C = g.getAttribute('color');
    for (let k = 0; k < L; k += 1) {
      // Gently: each bulb breathes on its own slow rhythm, between 55% and 100%.
      const w = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(sec * (1.2 + hash(k) * 1.6) + hash(k, 3) * 6.28));
      C.setXYZ(k, warm[k].r * w, warm[k].g * w, warm[k].b * w);
    }
    C.needsUpdate = true;
    if (!W || !at) return;
    const P = g.getAttribute('position');
    for (let k = 0; k < W; k += 1) {
      const x = at.x + wrap(base[k * 3] + Math.sin(sec * 0.8 + k) * sway - at.x, box.w);
      const z = at.z + wrap(base[k * 3 + 2] + Math.cos(sec * 0.6 + k * 1.3) * sway - at.z, box.w);
      const y = at.y + wrap(base[k * 3 + 1] - sec * fall - at.y, box.h);
      P.setXYZ(L + k, x, y, z);
    }
    P.needsUpdate = true;
  };
  update(0, null);
  // (Weather points start far below until the first tick puts them round the camera.)
  for (let k = 0; k < W; k += 1) g.getAttribute('position').setXYZ(L + k, 0, -1e5, 0);
  return { object, update, dispose: () => { g.dispose(); material.dispose(); tex.dispose(); } };
}

/** A garland from a to b sagging `sag` metres in the middle, `n` bulbs. */
function garland(a, b, sag, n) {
  const out = [];
  for (let k = 0; k <= n; k += 1) {
    const f = k / n;
    out.push(a.clone().lerp(b, f).addScaledVector(UP, -sag * 4 * f * (1 - f)));
  }
  return out;
}

/**
 * The winner's fireworks: three quick bursts high over the finish arch, opening one after another as
 * the winner crosses the line (race time), drifting down and fading; hidden before and after.
 */
function finishFireworks(at, lite) {
  const BURSTS = 3;
  const SPARKS = lite ? 60 : 120;
  const LIFE = 1.8;
  const START = [0, 0.45, 0.95]; // seconds after the winner crosses
  const COLOURS = [[1, 0.82, 0.35], [1, 0.4, 0.45], [0.45, 0.8, 1]].map(([r, g, b]) => new Color(r, g, b));
  const dirs = [];
  for (let k = 0; k < SPARKS; k += 1) {
    const y = 1 - (2 * (k + 0.5)) / SPARKS;
    const r = Math.sqrt(1 - y * y);
    const a = k * 2.39996;
    dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(BURSTS * SPARKS * 3), 3));
  g.setAttribute('color', new Float32BufferAttribute(new Float32Array(BURSTS * SPARKS * 3), 3));
  const tex = dotTexture();
  const object = new Points(g, new PointsMaterial({ size: lite ? 1.6 : 1.3, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }));
  object.name = 'holiday: finish fireworks';
  object.frustumCulled = false;
  object.visible = false;
  const centres = [new Vector3(-9, 30, 6), new Vector3(8, 34, -4), new Vector3(0, 27, -12)].map((o) => at.clone().add(o));
  /** since: seconds since the winner crossed (negative before). */
  const update = (since) => {
    const live = since >= 0 && since < START[BURSTS - 1] + LIFE;
    object.visible = live;
    if (!live) return;
    const P = g.getAttribute('position');
    const C = g.getAttribute('color');
    for (let b = 0; b < BURSTS; b += 1) {
      const tau = since - START[b];
      const on = tau >= 0 && tau < LIFE;
      const t = Math.max(0, tau) / LIFE;
      const radius = 9 * (1 - (1 - t) ** 3);
      const fade = on ? (1 - t) ** 1.4 : 0;
      for (let k = 0; k < SPARKS; k += 1) {
        const [dx, dy, dz] = dirs[k];
        const i = b * SPARKS + k;
        P.setXYZ(i, centres[b].x + dx * radius, centres[b].y + dy * radius - 3 * t * t, centres[b].z + dz * radius);
        const c = COLOURS[(b + (k % 5 === 0 ? 1 : 0)) % COLOURS.length];
        C.setXYZ(i, c.r * fade, c.g * fade, c.b * fade);
      }
    }
    P.needsUpdate = true;
    C.needsUpdate = true;
  };
  return { object, update, dispose: () => { g.dispose(); object.material.dispose(); tex.dispose(); } };
}

/**
 * The layer for a track (null if it has none). centerline: the track's; half: the finish arch's
 * half-width and archH its height (TrackScene.buildFinishArch); startHalf: the start's half-width.
 * Returns { group, tick(sec, cameraAt) (real time: twinkle, weather), race(raceMs, winnerMs) (the fireworks), dispose }.
 */
export function buildHolidayLayer(track, centerline, { half, archH, startHalf, lite = false, precipitation = false }) {
  const holiday = holidayOf(track?.slug);
  if (!holiday || !centerline?.samples?.length) return null;
  const group = new Group();
  group.name = 'holiday layer';
  const parts = [];
  const { samples } = centerline;
  const side = (s) => new Vector3(s.side.x, 0, s.side.z).normalize();

  // The string lights: a garland high over the start line between two points beyond the walls, and
  // along the finish arch's beam and down the outer face of its posts.
  const s0 = samples[0];
  const end = samples[samples.length - 1];
  const rows = [];
  const sd0 = side(s0);
  const gateTop = s0.pos.y + 6.5;
  rows.push(garland(
    s0.pos.clone().addScaledVector(sd0, -(startHalf + 1.2)).setY(gateTop),
    s0.pos.clone().addScaledVector(sd0, startHalf + 1.2).setY(gateTop),
    1.1, lite ? 18 : 30,
  ));
  const sdE = side(end);
  const alongE = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const beamY = end.pos.y + archH + 0.95;
  rows.push(garland(end.pos.clone().addScaledVector(sdE, -(half + 0.3)).setY(beamY), end.pos.clone().addScaledVector(sdE, half + 0.3).setY(beamY), 0, lite ? 18 : 32));
  for (const k of [-1, 1]) {
    const post = end.pos.clone().addScaledVector(sdE, k * (half + 0.45)).addScaledVector(alongE, -0.35);
    const col = [];
    const n = lite ? 8 : 14;
    for (let q = 0; q <= n; q += 1) col.push(post.clone().setY(end.pos.y + 1 + ((archH - 1.2) * q) / n));
    rows.push(col);
  }
  // The lights and the weather (none where the track's own sky already snows): one draw call.
  const kind = holiday.weather && !(holiday.weather === 'snow' && precipitation) ? holiday.weather : null;
  const lw = lightsAndWeather(rows, kind, lite);
  group.add(lw.object);
  parts.push(lw);

  // The winner's fireworks, over the finish.
  const fw = finishFireworks(end.pos.clone(), lite);
  group.add(fw.object);
  parts.push(fw);

  return {
    group,
    weather: holiday.weather,
    tick: (sec, at) => lw.update(sec, at),
    race: (raceMs, winnerMs) => fw.update(winnerMs == null ? -1 : (raceMs - winnerMs) / 1000),
    dispose: () => { for (const p of parts) p.dispose(); group.removeFromParent(); },
  };
}
