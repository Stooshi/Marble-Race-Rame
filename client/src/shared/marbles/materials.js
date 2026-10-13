/**
 * The collection marbles in 3D, shared by the website and the phone apps
 * (which wrap this web client). three.js only: no React and no DOM, so a look
 * can be built anywhere (a race, the shop's turntable, a test).
 *
 * The flat shop picture is the master (badge.js): the 3D marble is painted
 * from the very same gradient layers and colour values (paint.js), so the two
 * read as the same marble.
 *
 *   - The shading and shine (the design's body gradient and GLOSS) are painted
 *     into a small square picture and laid over the ball as seen from the
 *     camera (like a highlight on a real ball, they stay put as it rolls).
 *   - The details that turn with the ball (Champion flakes, Steelie machining
 *     lines, the aurora's ribbons) are painted on the sphere in the same
 *     colours; the Cat's Eye vane is the picture's own vane layer, turning as
 *     the ball rolls.
 *   - The shader writes the picture's sRGB bytes straight to the screen: no
 *     scene lights, tone mapping, colour-space change, fog or reflections of
 *     the track touch the colours, so a marble reads the same on every track.
 *     Night races only darken it (setNight), keeping its hue.
 *
 * Phone budget per marble: one sphere (one draw call); glowing looks add one
 * halo sprite. Textures are small and made once per item.
 */
import {
  AdditiveBlending, ClampToEdgeWrapping, Color, DataTexture, Group, LinearFilter, Mesh, NoColorSpace, RepeatWrapping, RGBAFormat,
  ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Vector3,
} from 'three';
import { BUILT_MATERIALS as BUILT_LIST, DESIGN, ITEM } from './index.js';
import { GLOSS_LAYERS, lookOf } from './badge.js';
import { hexRgb, rasterize, toBytes } from './paint.js';

const TEX_W = 256;
const TEX_H = 128;
/** The camera-facing picture's size (px square). */
const VIEW_N = 256;
/** How much a marble darkens in a night race (its hue stays the same). */
export const NIGHT_LEVEL = 0.8;

// ── Small helpers ──────────────────────────────────────────────────────────

// A colour as sRGB bytes, exactly as the shop picture uses it (never converted to linear light).
const rgb = (hex) => hexRgb(hex);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/** A small seeded random number generator (the same item always looks the same). */
function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** 3D value noise in [0, 1] (smooth blotches for stone, clouds and rock). */
function makeNoise(rand) {
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) { perm[i] = i; vals[i] = rand(); }
  for (let i = 255; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i += 1) perm[i + 256] = perm[i];
  const v = (x, y, z) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];
  const fade = (t) => t * t * (3 - 2 * t);
  const noise = (x, y, z) => {
    const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
    const xf = fade(x - xi); const yf = fade(y - yi); const zf = fade(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(v(xi, yi, zi), v(xi + 1, yi, zi), xf), l(v(xi, yi + 1, zi), v(xi + 1, yi + 1, zi), xf), yf),
      l(l(v(xi, yi, zi + 1), v(xi + 1, yi, zi + 1), xf), l(v(xi, yi + 1, zi + 1), v(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    );
  };
  return (x, y, z, octaves = 3) => {
    let sum = 0; let amp = 0.5; let f = 1; let norm = 0;
    for (let o = 0; o < octaves; o += 1) { sum += amp * noise(x * f + o * 17.3, y * f, z * f); norm += amp; amp *= 0.5; f *= 2.03; }
    return sum / norm;
  };
}

/**
 * Paints a texture on the sphere (the details that turn with the ball):
 * paint(d) gets the unit direction of each texel (as three's SphereGeometry
 * maps it) and returns [r, g, b, a] (sRGB 0–255, a 0–1), or null for nothing.
 * `w`, `h`: a finer texture for a look with tiny details (the Champion's flakes).
 */
function paintSphere(paint, { w: W = TEX_W, h: H = TEX_H } = {}) {
  const data = new Uint8Array(W * H * 4);
  const d = new Vector3();
  for (let j = 0; j < H; j += 1) {
    const theta = (1 - (j + 0.5) / H) * Math.PI;
    for (let i = 0; i < W; i += 1) {
      const phi = ((i + 0.5) / W) * Math.PI * 2;
      d.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      const c = paint(d);
      if (!c) continue;
      const k = (j * W + i) * 4;
      data[k] = c[0]; data[k + 1] = c[1]; data[k + 2] = c[2]; data[k + 3] = Math.round((c[3] ?? 1) * 255);
    }
  }
  return dataTexture(data, W, H, { wrap: true });
}

/** A texture of raw sRGB bytes (NoColorSpace: the GPU hands the shader the bytes as they are). */
function dataTexture(data, w, h, { wrap = false } = {}) {
  const tex = new DataTexture(data, w, h, RGBAFormat);
  tex.colorSpace = NoColorSpace;
  tex.wrapS = wrap ? RepeatWrapping : ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Layers (top first) as the camera-facing picture: a VIEW_N square, top row
 * first in the data (the shader reads it that way up). Premultiplied for a
 * see-through layer, straight for an opaque one.
 */
const viewCache = new Map();
function viewTexture(key, layers, { premultiplied = false } = {}) {
  if (viewCache.has(key)) return viewCache.get(key);
  const tex = dataTexture(toBytes(rasterize(layers, VIEW_N), { premultiplied }), VIEW_N, VIEW_N);
  viewCache.set(key, tex);
  return tex;
}
/** The GLOSS shine, the same over every marble (premultiplied). */
const glossTexture = () => viewTexture('gloss', GLOSS_LAYERS, { premultiplied: true });

/** A soft round glow for halos (white, fading out). */
let glowSpriteTexture = null;
function glowTexture() {
  if (glowSpriteTexture) return glowSpriteTexture;
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const r = Math.hypot(i + 0.5 - n / 2, j + 0.5 - n / 2) / (n / 2);
      const a = Math.pow(clamp01(1 - r), 2.2);
      const k = (j * n + i) * 4;
      data[k] = 255; data[k + 1] = 255; data[k + 2] = 255; data[k + 3] = a * 255;
    }
  }
  glowSpriteTexture = dataTexture(data, n, n);
  glowSpriteTexture.colorSpace = SRGBColorSpace;
  return glowSpriteTexture;
}

// ── The looks ──────────────────────────────────────────────────────────────
// Each builder gets the item's look from badge.js (its layers, named parts and
// colours) and a seeded random function, and returns what the 3D marble is
// made of, every colour taken from that look:
//   { body: layers facing the camera, turning?: layers facing the camera that turn as the ball rolls,
//     over?: layers on top (default the GLOSS shine), detail?: sphere texture, halo?, spin?, twinkle? }

const BUILDERS = {
  /**
   * Cat's Eye: the picture's glass, its four-wedge vane and the glass's tinted
   * edge, layer for layer. The vane turns with the ball as it rolls.
   */
  'vane-glass'({ parts }) {
    return { body: [parts.back], turning: [parts.vaneLayer], over: [...GLOSS_LAYERS, parts.tint] };
  },

  /** Steelie: the picture's polished-steel gradient, with faint machining lines round the ball that turn as it rolls. */
  steel({ parts }, rand) {
    const line = rgb(parts.lines);
    const scratch = makeNoise(rand);
    const detail = paintSphere((d) => {
      const k = smooth(0.7, 0.95, scratch(d.x * 40, d.y * 3, d.z * 40, 1)) * 0.12;
      return k > 0.004 ? [...line, k] : null;
    });
    return { body: [parts.body], detail };
  },

  /** Champion Shooter: the picture's glowing radial body, full of glinting flakes in its flake colour, and a soft halo. */
  champion({ parts }, rand) {
    const f = rgb(parts.flake);
    // About as many and as big as the picture's flakes (about 14 on the side facing you, ~1% of its width).
    const flakes = Array.from({ length: 44 }, () => [new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(), 0.99952 + rand() * 0.00008]);
    const detail = paintSphere((d) => {
      let k = 0;
      for (const [p, edge] of flakes) { const dot = d.dot(p); if (dot > edge) k = Math.max(k, smooth(edge, edge + 0.00008, dot)); }
      return k > 0 ? [...f, k] : null;
    }, { w: 512, h: 256 });
    return { body: [parts.body], detail, twinkle: true, halo: { color: parts.glow, size: 2.6, opacity: 0.32 } };
  },

  /** Northern Lights: the night sky, with the picture's three aurora ribbons and stars drifting round the ball. */
  'aurora-glass'({ parts }, rand) {
    const noise = makeNoise(rand);
    const pts = Array.from({ length: 40 }, () => new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize());
    const ribbons = parts.ribbons.map(([hex, a], k) => [rgb(hex), a, [0.35, -0.05, -0.42][k]]);
    const detail = paintSphere((d) => {
      for (const p of pts) if (d.dot(p) > 0.9993) return [255, 255, 255, 1];
      const phi = Math.atan2(d.z, d.x);
      const n = noise(Math.cos(phi) * 1.4, d.y * 1.2, Math.sin(phi) * 1.4, 3);
      let best = null;
      for (const [c, a, y0] of ribbons) {
        const w = (1 - smooth(0.0, 0.13, Math.abs(d.y - (y0 + 0.22 * Math.sin(phi * 2 + n * 4))))) * a;
        if (w > 0.004 && (!best || w > best[3])) best = [...c, w];
      }
      return best;
    });
    return { body: [parts.sky], detail, spin: 0.04, halo: { color: parts.glow, size: 2.8, opacity: 0.3 } };
  },
};

/** Designs whose 3D look isn't built yet: a plain glossy swirl in the picture's first two colours. */
function placeholderLook({ colours }) {
  const a = rgb(colours[0]); const b = rgb(colours[1] ?? colours[0]);
  const detail = paintSphere((d) => [...mix(a, b, Math.sin(Math.atan2(d.z, d.x) * 2 + d.y * 3) * 0.5 + 0.5), 1]);
  return { body: [{ type: 'solid', color: colours[0] }], detail };
}

/** The designs with a finished 3D look (the others show a placeholder swirl for now). */
export const BUILT_MATERIALS = Object.keys(BUILDERS);
if ([...BUILT_MATERIALS].sort().join() !== [...BUILT_LIST].sort().join()) console.warn('[marbles] BUILT_MATERIALS in index.js is out of date');

const cache = new Map();

/** The textures and settings for one item, made once and shared by every marble wearing it. */
export function lookSpec(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const item = ITEM[slug];
  if (!item) throw new Error(`Unknown marble ${slug}`);
  const look = lookOf(slug);
  const build = BUILDERS[look.material];
  const spec = build ? build(look, seeded(slug)) : placeholderLook(look);
  spec.slug = slug;
  spec.built = Boolean(build);
  spec.look = look;
  spec.bodyTexture = viewTexture(`${slug}:body`, spec.body);
  if (spec.turning) spec.turningTexture = viewTexture(`${slug}:turning`, spec.turning, { premultiplied: true });
  spec.overTexture = spec.over ? viewTexture(`${slug}:over`, spec.over, { premultiplied: true }) : glossTexture();
  cache.set(slug, spec);
  return spec;
}

// ── The shader ─────────────────────────────────────────────────────────────

const VERTEX = /* glsl */`
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec2 vUv;
varying float vTurn;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewPos = -mv.xyz;
  vUv = uv;
  // How far the ball has turned about the line of sight (for the layers that turn as it rolls).
  vec3 ax = (modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
  vTurn = atan(ax.y, ax.x);
  gl_Position = projectionMatrix * mv;
}`;

// Where on the camera-facing picture this point of the ball falls: the
// picture's centre straight ahead, its rim at the ball's outline (corrected
// for perspective, as three's matcap does). Then the picture's layers in its
// own order: body, turning layer, sphere details, and the shine on top
// (premultiplied, composited in sRGB as the browser does).
const FRAGMENT = /* glsl */`
uniform sampler2D uView;
uniform sampler2D uTurning;
uniform sampler2D uOver;
uniform sampler2D uDetail;
uniform float uLevel;
uniform float uDetailBoost;
uniform vec2 uDetailOffset;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec2 vUv;
varying float vTurn;
vec2 facingUv(vec3 n) {
  vec3 v = normalize(vViewPos);
  vec3 x = normalize(vec3(v.z, 0.0, -v.x));
  vec3 y = cross(v, x);
  return vec2(dot(x, n), dot(y, n));
}
vec2 toTex(vec2 m) { return vec2(0.5 + 0.5 * m.x, 0.5 - 0.5 * m.y); }
void main() {
  vec2 m = facingUv(normalize(vNormal));
  vec3 c = texture2D(uView, toTex(m)).rgb;
  #ifdef MS_TURNING
  float s = sin(vTurn); float k = cos(vTurn);
  vec4 t = texture2D(uTurning, toTex(vec2(k * m.x + s * m.y, -s * m.x + k * m.y)));
  c = t.rgb + c * (1.0 - t.a);
  #endif
  #ifdef MS_DETAIL
  vec4 d = texture2D(uDetail, vUv + uDetailOffset);
  c = mix(c, min(d.rgb * uDetailBoost, vec3(1.0)), d.a);
  #endif
  vec4 o = texture2D(uOver, toTex(m));
  c = o.rgb + c * (1.0 - o.a);
  gl_FragColor = vec4(c * uLevel, 1.0);
}`;

/**
 * A marble's material: the picture's bytes straight out (no lights, fog or
 * tone mapping; textures are raw sRGB and nothing converts the output).
 */
function marbleMaterial(spec) {
  const defines = {};
  if (spec.detail) defines.MS_DETAIL = '';
  if (spec.turningTexture) defines.MS_TURNING = '';
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines,
    uniforms: {
      uView: { value: spec.bodyTexture },
      uTurning: { value: spec.turningTexture ?? null },
      uOver: { value: spec.overTexture },
      uDetail: { value: spec.detail ?? null },
      uLevel: { value: 1 },
      uDetailBoost: { value: 1 },
      uDetailOffset: { value: { x: 0, y: 0 } },
    },
    fog: false,
    lights: false,
  });
  material.toneMapped = false;
  return material;
}

/**
 * One marble wearing a collection look.
 *
 *   const look = createMarbleLook('steelie-classic', { radius: 0.55 });
 *   scene.add(look.object);           // the ball: position and rotate this
 *   look.update(seconds) every frame; look.setNight(true) at night.
 *   look.dispose() when done (shared textures stay cached).
 */
export function createMarbleLook(slug, { radius = 0.55, geometry = null } = {}) {
  const spec = lookSpec(slug);
  const ownGeometry = !geometry;
  const sphere = geometry ?? new SphereGeometry(radius, 24, 16);
  const object = new Group();
  const extras = [];
  const shell = new Mesh(sphere, marbleMaterial(spec));
  object.add(shell);
  const materials = [shell.material];

  let halo = null;
  if (spec.halo) {
    const mat = new SpriteMaterial({ map: glowTexture(), color: new Color(spec.halo.color), transparent: true, opacity: spec.halo.opacity, blending: AdditiveBlending, depthWrite: false, depthTest: true, fog: false });
    halo = new Sprite(mat);
    halo.scale.setScalar(radius * spec.halo.size);
    halo.renderOrder = 3; // after the ball, depth-tested: the glow shows round it, never over it (as in the picture)
    object.add(halo);
    extras.push(mat);
  }

  let night = false;
  const look = {
    slug,
    spec,
    object,
    shell,
    trail: null,
    /** Night races: the marble is a little darker, in the same colours; a halo shows a little more. */
    setNight(on) {
      night = on;
      for (const m of materials) m.uniforms.uLevel.value = on ? NIGHT_LEVEL : 1;
      if (halo) halo.material.opacity = spec.halo.opacity * (on ? 1.5 : 1);
    },
    /** Per frame: drifting aurora ribbons, the halo's flicker, the flakes' glints. */
    update(t) {
      if (spec.spin) shell.material.uniforms.uDetailOffset.value = { x: (t * spec.spin) % 1, y: 0 };
      if (halo) halo.material.opacity = spec.halo.opacity * (night ? 1.5 : 1) * (0.9 + 0.1 * Math.sin(t * 7.3));
      if (spec.twinkle) shell.material.uniforms.uDetailBoost.value = 1 + 0.25 * Math.max(0, Math.sin(t * 5.1));
    },
    resetTrail() {},
    dispose() {
      if (ownGeometry) sphere.dispose();
      for (const m of materials) m.dispose();
      for (const x of extras) x.dispose();
    },
  };
  return look;
}

/** Whether an item's look glows (a halo): handy for picking the night lighting in previews. */
export const glows = (slug) => Boolean(lookSpec(slug).halo);

export { DESIGN };
export const _test = { paintSphere, seeded, makeNoise, TEX_W, TEX_H, VIEW_N };
