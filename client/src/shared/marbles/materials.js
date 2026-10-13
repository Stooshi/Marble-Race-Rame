/**
 * The collection marbles in 3D, shared by the website and the phone apps
 * (which wrap this web client). three.js only: no React and no DOM, so a look
 * can be built anywhere (a race, the shop's turntable, a test).
 *
 * Every look is painted procedurally into small data textures (256 × 128), from
 * the shade's named colours in catalog.json, so the items need no image
 * files. Glass marbles are a see-through shell over a solid inner piece (the
 * cat's-eye vane); glowing marbles add an emissive map and a soft halo, steel
 * reflects a painted surround. Looks only: nothing here can
 * reach the race.
 *
 * Phone budget per marble: one sphere, plus one inner piece for glass, plus
 * one halo sprite for glowing looks. Textures are tiny and made once per item.
 */
import {
  AdditiveBlending, BufferGeometry, Color, DataTexture, DoubleSide, EquirectangularReflectionMapping, Float32BufferAttribute, Group, LinearFilter,
  Mesh, MeshBasicMaterial, MeshPhongMaterial, MixOperation, Points, PointsMaterial, RepeatWrapping, RGBAFormat, SphereGeometry,
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
 * { c, e } with an emissive colour too. Returns { map, emissive? }. `w`, `h`:
 * a finer texture for a look with tiny details (the Champion Shooter's flakes).
 */
function paintSphere(paint, { emissive = false, w: W = TEX_W, h: H = TEX_H } = {}) {
  const map = new Uint8Array(W * H * 4);
  const glow = emissive ? new Uint8Array(W * H * 4) : null;
  const d = new Vector3();
  for (let j = 0; j < H; j += 1) {
    const theta = (1 - (j + 0.5) / H) * Math.PI;
    for (let i = 0; i < W; i += 1) {
      const phi = ((i + 0.5) / W) * Math.PI * 2;
      d.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      const out = paint(d);
      const c = Array.isArray(out) ? out : out.c;
      const k = (j * W + i) * 4;
      map[k] = c[0]; map[k + 1] = c[1]; map[k + 2] = c[2]; map[k + 3] = 255;
      if (glow) {
        const e = Array.isArray(out) ? null : out.e;
        glow[k] = e ? e[0] : 0; glow[k + 1] = e ? e[1] : 0; glow[k + 2] = e ? e[2] : 0; glow[k + 3] = 255;
      }
    }
  }
  return { map: dataTexture(map, W, H), emissive: glow && dataTexture(glow, W, H) };
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

/**
 * The surround a steel marble reflects (equirectangular, small): a bright sky in
 * its tint, a dark band at the horizon (the track's walls), a bright strip of
 * sky light, and a darker floor. Made once per shade.
 */
const envCache = new Map();
function steelEnvironment(sky, shadow) {
  const key = `${sky}|${shadow}`;
  if (envCache.has(key)) return envCache.get(key);
  const w = 128; const h = 64;
  const top = mix(rgb(sky), [255, 255, 255], 0.6); const mid = rgb(sky); const dark = rgb(shadow);
  const data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j += 1) {
    const v = j / (h - 1); // 0 = straight down, 1 = straight up (three's equirect, flipY off)
    let c;
    if (v > 0.62) c = mix(mid, top, smooth(0.62, 1, v));
    else if (v > 0.53) c = mix(dark, mid, smooth(0.53, 0.62, v));
    else if (v > 0.47) c = dark;
    else c = mix(mix(dark, mid, 0.55), dark, smooth(0.47, 0, v));
    for (let i = 0; i < w; i += 1) {
      // A couple of bright windows of sky light round the horizon (the glints that move as the ball turns).
      const u = i / w;
      const glint = (1 - smooth(0, 0.03, Math.abs(v - 0.7))) * (Math.sin(u * Math.PI * 6) > 0.6 ? 1 : 0.25);
      const k = (j * w + i) * 4;
      const out = mix(c, [255, 255, 255], glint * 0.85);
      data[k] = out[0]; data[k + 1] = out[1]; data[k + 2] = out[2]; data[k + 3] = 255;
    }
  }
  const tex = dataTexture(data, w, h);
  tex.mapping = EquirectangularReflectionMapping;
  envCache.set(key, tex);
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
//   { map, emissive?, shininess, specular, glass?, inner?, halo?, trail?, spin?, metal?, core?, twinkle? }

const BUILDERS = {
  /** Cat's Eye: clear glass with a 4-blade twisted vane inside. */
  'vane-glass'([vane, vane2, glass], rand) {
    const g = rgb(glass);
    const bubbles = Array.from({ length: 5 }, () => new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize());
    const { map } = paintSphere((d) => {
      let c = g;
      for (const p of bubbles) if (d.dot(p) > 0.996) c = mix(c, [255, 255, 255], 0.7);
      return c;
    });
    return {
      map, shininess: 170, specular: '#ffffff',
      glass: { opacity: 0.16, rim: glass, rimOpacity: 0.9 },
      inner: { kind: 'vane', scale: 0.8, colours: [vane, vane2], shininess: 60 },
    };
  },

  /**
   * Steelie: a polished steel ball bearing. Its colour is the shade's tint; what
   * makes it steel is the reflection: a small painted sky-and-track surround in
   * world space (metal below), so the highlights stay put while the ball rolls.
   */
  steel([steel, shadow], rand) {
    const s = rgb(steel); const sh = rgb(shadow);
    const scratch = makeNoise(rand);
    const { map } = paintSphere((d) => {
      // Faint machining lines round the ball, nothing more: the reflection does the rest.
      const line = scratch(d.x * 40, d.y * 3, d.z * 40, 1);
      return mix(s, mix(s, sh, 0.25), smooth(0.7, 0.95, line) * 0.4);
    });
    return { map, shininess: 220, specular: '#ffffff', metal: { sky: steel, shadow, reflectivity: 0.88 } };
  },

  /**
   * Champion Shooter: deep glass full of glinting flakes, lighter clouds drifting
   * through it, a glow from inside that deepens towards the edge, and a soft halo.
   */
  champion([glass, deep, flake], rand) {
    const g = rgb(glass); const dp = rgb(deep); const f = rgb(flake);
    const noise = makeNoise(rand);
    const flakes = Array.from({ length: 320 }, () => [new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(), 0.99955 + rand() * 0.0003]);
    const textures = paintSphere((d) => {
      const cloud = noise(d.x * 2.2 + 5, d.y * 2.2, d.z * 2.2, 3);
      let c = mix(dp, g, smooth(0.3, 0.8, cloud) * 0.75);
      let e = mix([0, 0, 0], g, smooth(0.45, 0.85, cloud) * 0.12);
      for (const [p, edge] of flakes) {
        const dot = d.dot(p);
        if (dot > edge) { const k = smooth(edge, edge + 0.00015, dot); c = mix(c, f, k); e = mix(e, f, k * 0.9); }
      }
      return { c, e };
    }, { emissive: true, w: 512, h: 256 });
    return {
      ...textures,
      emissiveIntensity: 0.85,
      twinkle: true,
      shininess: 170,
      specular: '#ffffff',
      core: { centre: glass, middle: glass, rim: deep, strength: 0.3 },
      halo: { color: glass, size: 2.6, opacity: 0.32 },
    };
  },

  /** Northern Lights: night-sky glass with green and violet ribbons that slowly drift. */
  'aurora-glass'([a, b, c, sky], rand) {
    const ca = rgb(a); const cb = rgb(b); const cc = rgb(c); const s = rgb(sky);
    const noise = makeNoise(rand);
    const pts = Array.from({ length: 40 }, () => new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize());
    const textures = paintSphere((d) => {
      const phi = Math.atan2(d.z, d.x);
      const n = noise(Math.cos(phi) * 1.4, d.y * 1.2, Math.sin(phi) * 1.4, 3);
      const ribbon = (y0, col) => [col, 1 - smooth(0.0, 0.13, Math.abs(d.y - (y0 + 0.22 * Math.sin(phi * 2 + n * 4))))];
      let col = s; let e = [0, 0, 0];
      for (const [cl, w] of [ribbon(0.35, ca), ribbon(-0.05, cb), ribbon(-0.42, cc)]) {
        col = mix(col, cl, w * 0.9);
        e = mix(e, cl, w * 0.8);
      }
      for (const p of pts) if (d.dot(p) > 0.9993) { col = [255, 255, 255]; e = [220, 220, 220]; }
      return { c: col, e };
    }, { emissive: true });
    return { ...textures, emissiveIntensity: 0.9, shininess: 150, specular: '#ffffff', halo: { color: a, size: 2.8, opacity: 0.3 }, spin: 0.04 };
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
if ([...BUILT_MATERIALS].sort().join() !== [...BUILT_LIST].sort().join()) console.warn('[marbles] BUILT_MATERIALS in index.js is out of date');

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
 * core (Champion Shooter) gets a gradient from its centre to its rim.
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
function innerGeometry(kind, colours = []) {
  if (kind === 'sphere') return new SphereGeometry(1, 16, 12);
  if (kind === 'vane') return vaneGeometry(colours);
  throw new Error(`Unknown inner piece ${kind}`);
}

/** The cat's-eye vane: four thin blades twisting a quarter turn from top to bottom, in two colours. */
function vaneGeometry([c1, c2]) {
  const pos = []; const col = []; const idx = [];
  const colours = [new Color(c1), new Color(c2)];
  const rows = 14;
  for (let blade = 0; blade < 4; blade += 1) {
    const base = pos.length / 3;
    const colour = colours[blade % 2];
    for (let j = 0; j <= rows; j += 1) {
      const y = -0.8 + (1.6 * j) / rows;
      // Eye-shaped: widest in the middle, coming to a point at each end (as a real cat's-eye vane).
      const reach = Math.sqrt(Math.max(0, 1 - y * y)) * 0.9 * (1 - Math.pow(Math.abs(y) / 0.8, 2.2) * 0.85);
      const a = (blade * Math.PI) / 2 + y * 0.9;
      for (const r of [0.04, reach]) {
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
        col.push(colour.r, colour.g, colour.b);
      }
      if (j < rows) { const k = base + j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
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
    ...(spec.metal && { envMap: steelEnvironment(spec.metal.sky, spec.metal.shadow), combine: MixOperation, reflectivity: spec.metal.reflectivity }),
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
    const geo = innerGeometry(spec.inner.kind, spec.inner.colours);
    const mat = spec.inner.colours
      ? new MeshPhongMaterial({ vertexColors: true, side: DoubleSide, shininess: spec.inner.shininess ?? 60, specular: new Color('#ffffff') })
      : new MeshPhongMaterial({ map: spec.inner.map, shininess: spec.inner.shininess ?? 60, specular: new Color('#ffffff') });
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
      if (spec.twinkle) material.emissiveIntensity = baseEmissive * (night ? 1.6 : 1) * (0.8 + 0.2 * Math.sin(t * 5.1));
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
