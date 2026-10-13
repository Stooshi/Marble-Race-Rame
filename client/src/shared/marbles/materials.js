/**
 * The collection marbles in 3D, shared by the website and the phone apps
 * (which wrap this web client). three.js only: no React and no DOM, so a look
 * can be built anywhere (a race, the shop's turntable, a test).
 *
 * Every look is painted procedurally into small data textures (256 × 128), from
 * the shade's named colours in catalog.json, so the 76 items need no image
 * files. Glass marbles are a see-through shell over a solid inner piece (the
 * cat's-eye vane, the frozen core); glowing marbles add an emissive map, a soft
 * halo and, for Sunfire, a short spark trail. Looks only: nothing here can
 * reach the race.
 *
 * Phone budget per marble: one sphere, plus one inner piece for glass, plus
 * one halo sprite for glowing looks. Textures are tiny and made once per item.
 */
import {
  AdditiveBlending, BufferGeometry, Color, DataTexture, Float32BufferAttribute, Group, LinearFilter,
  Mesh, MeshBasicMaterial, MeshPhongMaterial, Points, PointsMaterial, RepeatWrapping, RGBAFormat, SphereGeometry,
  Sprite, SpriteMaterial, SRGBColorSpace, Vector3,
} from 'three';
import { BUILT_MATERIALS as BUILT_LIST, DESIGN, ITEM } from './index.js';

const TEX_W = 256;
const TEX_H = 128;

// ── Small helpers ──────────────────────────────────────────────────────────

const rgb = (hex) => {
  const c = new Color(hex);
  return [c.r * 255, c.g * 255, c.b * 255];
};
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
 * Paints a sphere texture: paint(d) gets the unit direction of each texel (as
 * three's SphereGeometry maps it) and returns [r, g, b] (0–255), or
 * { c, e } with an emissive colour too. Returns { map, emissive? }.
 */
function paintSphere(paint, { emissive = false } = {}) {
  const map = new Uint8Array(TEX_W * TEX_H * 4);
  const glow = emissive ? new Uint8Array(TEX_W * TEX_H * 4) : null;
  const d = new Vector3();
  for (let j = 0; j < TEX_H; j += 1) {
    const theta = (1 - (j + 0.5) / TEX_H) * Math.PI;
    for (let i = 0; i < TEX_W; i += 1) {
      const phi = ((i + 0.5) / TEX_W) * Math.PI * 2;
      d.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      const out = paint(d);
      const c = Array.isArray(out) ? out : out.c;
      const k = (j * TEX_W + i) * 4;
      map[k] = c[0]; map[k + 1] = c[1]; map[k + 2] = c[2]; map[k + 3] = 255;
      if (glow) {
        const e = Array.isArray(out) ? null : out.e;
        glow[k] = e ? e[0] : 0; glow[k + 1] = e ? e[1] : 0; glow[k + 2] = e ? e[2] : 0; glow[k + 3] = 255;
      }
    }
  }
  return { map: dataTexture(map), emissive: glow && dataTexture(glow) };
}

function dataTexture(data, w = TEX_W, h = TEX_H) {
  const tex = new DataTexture(data, w, h, RGBAFormat);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** A soft round glow for halos and sparks (white, fading out). */
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
  return glowSpriteTexture;
}

// ── The looks ──────────────────────────────────────────────────────────────
// Each builder gets the shade's colours (in the design's slot order) and a
// seeded random function, and returns a description of the marble:
//   { map, emissive?, shininess, specular, glass?, inner?, halo?, trail?, spin? }

const BUILDERS = {
  /** Candy Stripe: opaque, glossy, candy-cane stripes wrapping the ball. */
  stripe([stripe, base]) {
    const s = rgb(stripe); const b = rgb(base);
    const { map } = paintSphere((d) => {
      // Three helices round the ball, half stripe and half base (a candy cane from any side).
      const a = Math.atan2(d.z, d.x) / (Math.PI * 2) + d.y * 0.55;
      const f = ((a * 3) % 1 + 1) % 1;
      const band = smooth(0.0, 0.035, f) - smooth(0.5, 0.535, f);
      return mix(b, s, band);
    });
    return { map, shininess: 140, specular: '#ffffff' };
  },

  /** Fjord Pebble: matte polished stone with dark and light flecks. */
  stone([stone, stone2, fleck, fleck2], rand) {
    const a = rgb(stone); const b = rgb(stone2); const f1 = rgb(fleck); const f2 = rgb(fleck2);
    const noise = makeNoise(rand);
    const speck = makeNoise(rand);
    const { map } = paintSphere((d) => {
      const n = noise(d.x * 2.2 + 3, d.y * 2.2, d.z * 2.2, 4);
      let c = mix(a, b, smooth(0.35, 0.7, n));
      // Veins: a few soft lighter lines through the stone.
      const vein = Math.abs(noise(d.x * 1.3, d.y * 1.3 + 7, d.z * 1.3, 2) - 0.5);
      c = mix(c, mix(a, f2, 0.4), (1 - smooth(0.0, 0.03, vein)) * 0.5);
      const s = speck(d.x * 26, d.y * 26, d.z * 26, 1);
      if (s > 0.86) c = mix(c, f1, smooth(0.86, 0.92, s));
      else if (s < 0.1) c = mix(c, f2, smooth(0.1, 0.05, s));
      return c;
    });
    return { map, shininess: 14, specular: '#3a3a3a' };
  },

  /** Glacier Glass: crystal-clear glass, a smaller marble frozen inside, tiny air bubbles. */
  'core-glass'([glass, core, core2, bubble], rand) {
    const g = rgb(glass); const bub = rgb(bubble);
    const bubbles = Array.from({ length: 9 }, () => new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize());
    const { map } = paintSphere((d) => {
      let c = g;
      for (const p of bubbles) {
        const dot = d.dot(p);
        if (dot > 0.995) c = mix(c, bub, smooth(0.995, 0.999, dot));
      }
      return c;
    });
    // The frozen core: a darker rim to a bright centre, like a marble seen through ice.
    const a = rgb(core); const b = rgb(core2);
    const inner = paintSphere((d) => {
      const swirl = Math.sin(Math.atan2(d.z, d.x) * 3 + d.y * 4) * 0.5 + 0.5;
      return mix(b, a, 0.55 + 0.45 * swirl);
    }).map;
    return {
      map,
      shininess: 160,
      specular: '#ffffff',
      glass: { opacity: 0.22, rim: glass, rimOpacity: 0.95 },
      inner: { kind: 'sphere', scale: 0.52, map: inner, shininess: 90 },
    };
  },

  /** Sunfire: the logo marble. Liquid-gold glow, swirling flame streaks, a halo and a short spark trail. */
  sunfire([spark, glow, flame, ember], rand) {
    const g = rgb(glow); const f = rgb(flame); const e = rgb(ember);
    const noise = makeNoise(rand);
    const textures = paintSphere((d) => {
      // Flame streaks swirling round the ball over liquid gold.
      const a = Math.atan2(d.z, d.x);
      const n = noise(Math.cos(a) * 1.5, d.y * 3, Math.sin(a) * 1.5, 3);
      const streak = Math.sin(a * 3 + d.y * 4 + n * 5);
      const flameMix = smooth(0.45, 0.85, streak);
      const c = mix(g, f, flameMix * 0.9);
      return { c, e: mix(mix(g, f, 0.25), e, flameMix * 0.8) };
    }, { emissive: true });
    return {
      ...textures,
      emissiveIntensity: 0.45,
      shininess: 60,
      specular: '#5a4a2a',
      // The logo's gradient, seen from wherever you look: a white-hot centre, solar yellow, an ember rim.
      core: { centre: spark, middle: glow, rim: ember, strength: 0.5 },
      halo: { color: glow, size: 3.6, opacity: 0.7 },
      trail: { color: flame, color2: glow, count: 16 },
      spin: 0.12, // the flame streaks keep turning, even standing still (turns per second)
    };
  },
};

/** Designs whose look isn't built yet: a plain glossy swirl in the shade's first colours. */
function placeholderLook(colours) {
  const a = rgb(colours[0]); const b = rgb(colours[1] ?? colours[0]);
  const { map } = paintSphere((d) => mix(a, b, Math.sin(Math.atan2(d.z, d.x) * 2 + d.y * 3) * 0.5 + 0.5));
  return { map, shininess: 80, specular: '#ffffff' };
}

/** The designs with a finished 3D look (the others show a placeholder swirl for now). */
export const BUILT_MATERIALS = Object.keys(BUILDERS);
if (BUILT_MATERIALS.join() !== BUILT_LIST.join()) console.warn('[marbles] BUILT_MATERIALS in index.js is out of date');

const cache = new Map();

/** The painted textures and settings for one item, made once and shared by every marble wearing it. */
export function lookSpec(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const item = ITEM[slug];
  if (!item) throw new Error(`Unknown marble ${slug}`);
  const colours = item.shade.colours.map((c) => c.hex);
  const build = BUILDERS[item.design.material];
  const spec = build ? build(colours, seeded(slug)) : placeholderLook(colours);
  spec.slug = slug;
  spec.built = Boolean(build);
  cache.set(slug, spec);
  return spec;
}

/**
 * Effects that depend on where you look from, added to three's Phong shader:
 * glass gets thicker and tinted towards its edge (like real glass), a glowing
 * core (Sunfire) gets the logo's white-to-ember gradient from centre to rim.
 */
function shadeByFacing(material, spec) {
  if (!spec.glass && !spec.core) return;
  const glass = spec.glass;
  const core = spec.core;
  const uniforms = {
    msRim: { value: new Color(glass?.rim ?? '#ffffff') },
    msRimOpacity: { value: glass?.rimOpacity ?? 1 },
    msCentre: { value: new Color(core?.centre ?? '#ffffff') },
    msMiddle: { value: new Color(core?.middle ?? '#ffffff') },
    msEdge: { value: new Color(core?.rim ?? '#000000') },
    msCore: { value: core?.strength ?? 0 },
  };
  material.userData.msUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 msRim; uniform float msRimOpacity; uniform vec3 msCentre; uniform vec3 msMiddle; uniform vec3 msEdge; uniform float msCore;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float msFacing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  ${glass ? `float msEdgeAmt = pow(1.0 - msFacing, 2.5);
  diffuseColor.a = mix(diffuseColor.a, msRimOpacity, msEdgeAmt);
  diffuseColor.rgb = mix(diffuseColor.rgb, msRim * 0.8, msEdgeAmt * 0.6);` : ''}
  ${core ? `vec3 msGrad = mix(msEdge, msMiddle, smoothstep(0.1, 0.75, msFacing));
  msGrad = mix(msGrad, msCentre, smoothstep(0.9, 1.0, msFacing) * 0.6);
  totalEmissiveRadiance += msGrad * msCore;` : ''}
}`);
  };
  material.customProgramCacheKey = () => `ms-facing-${glass ? 'g' : ''}${core ? 'c' : ''}`;
}

/** The solid piece inside a glass marble. */
function innerGeometry(kind) {
  if (kind === 'sphere') return new SphereGeometry(1, 16, 12);
  throw new Error(`Unknown inner piece ${kind}`);
}

/**
 * One marble wearing a collection look.
 *
 *   const look = createMarbleLook('sun-solar', { radius: 0.55 });
 *   scene.add(look.object);           // the ball: position and rotate this
 *   if (look.trail) scene.add(look.trail); // world-space effects (spark trail)
 *   look.update(seconds, look.object.position) every frame; look.setNight(true) at night.
 *   look.dispose() when done (shared textures stay cached).
 */
export function createMarbleLook(slug, { radius = 0.55, geometry = null } = {}) {
  const spec = lookSpec(slug);
  const ownGeometry = !geometry;
  const sphere = geometry ?? new SphereGeometry(radius, 24, 16);
  const material = new MeshPhongMaterial({
    map: spec.map,
    shininess: spec.shininess,
    specular: new Color(spec.specular),
    ...(spec.emissive && { emissiveMap: spec.emissive, emissive: new Color('#ffffff'), emissiveIntensity: spec.emissiveIntensity ?? 1 }),
    ...(spec.glass && { transparent: true, opacity: spec.glass.opacity, depthWrite: false }),
  });
  if (spec.spin) {
    // Its own copy of the texture settings, so its flames can turn on their own.
    material.map = spec.map.clone();
    material.map.needsUpdate = true;
    if (spec.emissive) { material.emissiveMap = spec.emissive.clone(); material.emissiveMap.needsUpdate = true; }
  }
  shadeByFacing(material, spec);
  const object = new Group();
  const shell = new Mesh(sphere, material);
  shell.renderOrder = spec.glass ? 2 : 0;
  object.add(shell);

  const extras = [];
  if (spec.inner) {
    const geo = innerGeometry(spec.inner.kind);
    const mat = new MeshPhongMaterial({ map: spec.inner.map, shininess: spec.inner.shininess ?? 60, specular: new Color('#ffffff') });
    const inner = new Mesh(geo, mat);
    inner.scale.setScalar(radius * spec.inner.scale);
    object.add(inner);
    extras.push(geo, mat);
  }

  let halo = null;
  if (spec.halo) {
    const mat = new SpriteMaterial({ map: glowTexture(), color: new Color(spec.halo.color), transparent: true, opacity: spec.halo.opacity, blending: AdditiveBlending, depthWrite: false, depthTest: false });
    halo = new Sprite(mat);
    halo.scale.setScalar(radius * spec.halo.size);
    halo.renderOrder = 3;
    object.add(halo);
    extras.push(mat);
  }

  // The spark trail lives in world space (it stays behind as the ball moves on).
  let trail = null;
  let trailPositions = null;
  let trailHead = 0;
  let lastDrop = -1;
  if (spec.trail) {
    const n = spec.trail.count;
    trailPositions = new Float32Array(n * 3).fill(1e6);
    const colours = new Float32Array(n * 3);
    const a = new Color(spec.trail.color); const b = new Color(spec.trail.color2);
    for (let i = 0; i < n; i += 1) {
      const c = a.clone().lerp(b, i / n);
      colours.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(trailPositions, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colours, 3));
    const mat = new PointsMaterial({ map: glowTexture(), size: radius * 0.9, vertexColors: true, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false });
    trail = new Points(geo, mat);
    trail.frustumCulled = false;
    trail.renderOrder = 3;
    extras.push(geo, mat);
  }

  let night = false;
  const baseEmissive = material.emissiveIntensity;
  const look = {
    slug,
    spec,
    object,
    shell,
    trail,
    /** Night races: glowing looks glow brighter; the others get a soft glow in their own colours (as plain marbles do). */
    setNight(on) {
      night = on;
      if (spec.emissive) {
        material.emissiveIntensity = baseEmissive * (on ? 1.6 : 1);
      } else {
        material.emissiveMap = on ? material.map : null;
        material.emissive.set(on ? '#7a7a7a' : '#000000');
        material.needsUpdate = true;
      }
      if (halo) halo.material.opacity = spec.halo.opacity * (on ? 1.5 : 1);
    },
    /** Per frame: turning flames, the halo's flicker, sparks dropped behind a moving ball. */
    update(t, worldPosition = null) {
      if (spec.spin) {
        material.map.offset.x = (t * spec.spin) % 1;
        if (material.emissiveMap) material.emissiveMap.offset.x = material.map.offset.x;
      }
      if (halo) halo.material.opacity = spec.halo.opacity * (night ? 1.5 : 1) * (0.9 + 0.1 * Math.sin(t * 7.3));
      if (trail && worldPosition) {
        if (t - lastDrop > 0.035) {
          lastDrop = t;
          const k = trailHead % spec.trail.count;
          trailPositions[k * 3] = worldPosition.x + (Math.random() - 0.5) * radius * 0.6;
          trailPositions[k * 3 + 1] = worldPosition.y + (Math.random() - 0.3) * radius * 0.6;
          trailPositions[k * 3 + 2] = worldPosition.z + (Math.random() - 0.5) * radius * 0.6;
          trailHead += 1;
          trail.geometry.attributes.position.needsUpdate = true;
        }
        // Older sparks sink a little and fade (the material fades them all; the oldest are replaced first).
      }
    },
    /** Hides the trail (e.g. when the ball jumps to a new place). */
    resetTrail() {
      if (!trailPositions) return;
      trailPositions.fill(1e6);
      trail.geometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      if (ownGeometry) sphere.dispose();
      if (material.map !== spec.map) material.map.dispose();
      if (spec.emissive && material.emissiveMap && material.emissiveMap !== spec.emissive) material.emissiveMap.dispose();
      material.dispose();
      for (const x of extras) x.dispose();
    },
  };
  return look;
}

/** Whether an item's look glows (emissive): handy for picking the night lighting in previews. */
export const glows = (slug) => Boolean(lookSpec(slug).emissive);

export { DESIGN };
export const _test = { paintSphere, seeded, makeNoise, TEX_W, TEX_H };
