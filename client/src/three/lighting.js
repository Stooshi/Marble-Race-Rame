/**
 * Lighting and weather presets for kit tracks (track kit, step 6): day,
 * sunset, midnight sun, night with northern lights, fog, snow and rain. A
 * preset sets the sky, sun, haze and effects over the track's landscape (its
 * ground and scenery colours stay its own). Drawing only: the race never sees
 * them. The server picks each race's preset from the track's allowed list
 * (src/trackKit/lighting.js) and stores it with the race.
 *
 * Night stays watchable: the marbles glow softly in their own colours and the
 * channel's rims carry a faint edge light, so the marbles are always in the
 * picture. Phones get far fewer snowflakes and raindrops; fog is free.
 */
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments,
  Mesh, MeshBasicMaterial, Points, PointsMaterial, Vector3,
} from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius } from './iceChannel';

export const LIGHTINGS = ['day', 'sunset', 'midnight-sun', 'night-northern-lights', 'fog', 'snow', 'rain'];

/** Each preset's sky, haze and light (day: the landscape's own). fogRange: metres, near and far. */
export const PRESETS = {
  day: {},
  sunset: {
    sky: { top: '#34477f', horizon: '#ff9a5c', glow: '#ffd27a' },
    fog: '#e3a383',
    hemisphere: { sky: '#ffd2a8', ground: '#5d5068', intensity: 1.35 },
    ambient: 0.32,
    sun: { color: '#ffa860', intensity: 2.0, direction: [-1, 0.16, 0.35] },
  },
  'midnight-sun': {
    sky: { top: '#7392c4', horizon: '#ffd8b4', glow: '#fff0c8' },
    fog: '#f0dccb',
    hemisphere: { sky: '#ffe8d0', ground: '#8790a3', intensity: 1.5 },
    ambient: 0.4,
    sun: { color: '#ffd59a', intensity: 1.7, direction: [0.85, 0.1, -0.55] },
  },
  'night-northern-lights': {
    sky: { top: '#040a1c', horizon: '#13284a', glow: null },
    fog: '#0d1b33',
    fogRange: [260, 1600],
    hemisphere: { sky: '#5f7fbf', ground: '#141c30', intensity: 0.6 },
    ambient: 0.22,
    sun: { color: '#bcd0ff', intensity: 0.55, direction: [0.3, 0.8, -0.4] }, // the moon
    groundTint: 0.35,
    effects: { stars: true, aurora: true, night: true },
  },
  fog: {
    sky: { top: '#b6c0c9', horizon: '#d3d8dc', glow: null },
    fog: '#cfd4d8',
    fogRange: [30, 300],
    hemisphere: { sky: '#eef1f4', ground: '#8f969c', intensity: 1.6 },
    ambient: 0.5,
    sun: { color: '#f4f4f0', intensity: 0.8, direction: [-0.4, 1, 0.3] },
  },
  snow: {
    sky: { top: '#95a3b3', horizon: '#c9d1da', glow: null },
    fog: '#c9d1da',
    fogRange: [70, 700],
    hemisphere: { sky: '#e6ebf0', ground: '#98a1ad', intensity: 1.45 },
    ambient: 0.4,
    sun: { color: '#eef2f8', intensity: 0.75, direction: [-0.4, 1, 0.3] },
    effects: { precipitation: 'snow' },
  },
  rain: {
    sky: { top: '#6f7a88', horizon: '#9aa4af', glow: null },
    fog: '#97a1ab',
    fogRange: [55, 600],
    hemisphere: { sky: '#c9d0d8', ground: '#5f6670', intensity: 1.45 },
    ambient: 0.42,
    sun: { color: '#dfe4ea', intensity: 0.7, direction: [-0.4, 1, 0.3] },
    effects: { precipitation: 'rain' },
  },
};

/** The presets a kit track allows: its own first, then its variants. */
export function allowedLightings(kit) {
  if (!kit) return [];
  const own = kit.lighting || 'day';
  return [own, ...(kit.variants ?? []).filter((v) => v !== own)];
}

/** A ?lighting= override from the address (preview links, screenshots), honoured only if the track allows it. */
export function lightingOverride(kit) {
  try {
    const asked = new URLSearchParams(window.location.search).get('lighting');
    return asked && allowedLightings(kit).includes(asked) ? asked : null;
  } catch {
    return null;
  }
}

/** A theme (the landscape's look) under a preset. */
export function withPreset(theme, name) {
  const preset = PRESETS[name];
  if (!preset || name === 'day') return { ...theme, lighting: 'day', effects: {} };
  const ground = preset.groundTint
    ? { ...theme.ground, color: `#${new Color(theme.ground.color).multiplyScalar(preset.groundTint).getHexString()}` }
    : theme.ground;
  const { groundTint, effects = {}, ...look } = preset;
  return { ...theme, ...look, ground, lighting: name, effects };
}

// ── Effects ────────────────────────────────────────────────────────────────

const noise = (k) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Stars on the upper sky (a child of the unit sky dome). */
function stars(lite) {
  const n = lite ? 400 : 1200;
  const pos = [];
  for (let k = 0; k < n; k += 1) {
    const a = noise(k) * Math.PI * 2;
    const up = 0.08 + 0.92 * noise(k + 0.5) ** 0.7;
    const r = Math.sqrt(1 - up * up);
    pos.push(Math.cos(a) * r * 0.97, up * 0.97, Math.sin(a) * r * 0.97);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const p = new Points(g, new PointsMaterial({ color: '#ffffff', size: lite ? 1.6 : 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false }));
  p.name = 'stars';
  p.renderOrder = -1;
  return p;
}

/**
 * Northern lights: soft curtains low over the horizon, green at the foot fading to
 * violet and nothing at the top, in vertical rays, slowly rippling. One draw call.
 */
function aurora(lite) {
  const segs = lite ? 48 : 110;
  const bands = [[0, -0.6, 1.7, 0.24], [1, 0.9, 1.3, 0.19], [2, 2.6, 1.2, 0.22]];
  const ROWS = 3; // foot, glow, top
  const perBand = (segs + 1) * ROWS;
  const pos = new Float32Array(bands.length * perBand * 3);
  const col = [];
  const index = [];
  bands.forEach((_, n) => {
    for (let i = 0; i <= segs; i += 1) {
      // Rays: the curtain brighter and dimmer across, as the real thing.
      const ray = 0.45 + 0.55 * Math.abs(Math.sin(i * 0.9 + n * 2.1) * Math.sin(i * 0.23 + n));
      col.push(0.2, 1, 0.5, 0); // foot: fades in
      col.push(0.25, 1, 0.55, 0.8 * ray); // the bright band
      col.push(0.6, 0.3, 0.95, 0); // top: violet, fading out
      if (i < segs) {
        const a = n * perBand + i * ROWS;
        for (let r = 0; r < ROWS - 1; r += 1) index.push(a + r, a + r + 1, a + ROWS + r, a + r + 1, a + ROWS + r + 1, a + ROWS + r);
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 4));
  g.setIndex(index);
  const mesh = new Mesh(g, new MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false,
  }));
  mesh.name = 'aurora';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  const update = (sec) => {
    const p = g.getAttribute('position');
    bands.forEach(([k, from, span, height], n) => {
      for (let i = 0; i <= segs; i += 1) {
        const u = i / segs;
        const a = from + u * span;
        const r = 0.93 + 0.035 * Math.sin(u * 9 + sec * 0.35 + k) + 0.02 * Math.sin(u * 23 - sec * 0.6);
        const foot = 0.08 + 0.03 * Math.sin(u * 5 + k);
        const top = foot + height * (0.75 + 0.25 * Math.sin(u * 7 + sec * 0.25 + k * 2));
        const v = n * perBand + i * ROWS;
        for (const [row, y, rr] of [[0, foot, r], [1, foot + (top - foot) * 0.3, r * 0.99], [2, top, r * 0.97]]) {
          p.setXYZ(v + row, Math.cos(a) * rr, y, Math.sin(a) * rr);
        }
      }
    });
    p.needsUpdate = true;
  };
  update(0);
  return { group: mesh, update };
}

/** A soft round snowflake (points are drawn square without one). */
export function flakeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(canvas);
}

/** Snow or rain in a box that travels with the camera (drawn the same whichever way it looks). */
function precipitation(kind, lite) {
  const snow = kind === 'snow';
  const n = snow ? (lite ? 500 : 3000) : (lite ? 500 : 2600);
  const box = snow ? { w: 70, h: 40 } : { w: 60, h: 36 };
  const base = new Float32Array(n * 3);
  for (let k = 0; k < n; k += 1) {
    base[k * 3] = (noise(k) - 0.5) * box.w;
    base[k * 3 + 1] = noise(k + 0.37) * box.h;
    base[k * 3 + 2] = (noise(k + 0.71) - 0.5) * box.w;
  }
  let object;
  if (snow) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3));
    object = new Points(g, new PointsMaterial({ color: '#ffffff', map: flakeTexture(), size: lite ? 0.42 : 0.32, transparent: true, opacity: 0.95, depthWrite: false }));
  } else {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 6), 3));
    object = new LineSegments(g, new LineBasicMaterial({ color: '#dfe8f2', transparent: true, opacity: 0.45, depthWrite: false }));
  }
  object.name = snow ? 'snow' : 'rain';
  object.frustumCulled = false;
  const fall = snow ? 1.6 : 22; // metres per second
  const streak = 0.9;
  // Wrapped into a box centred on the camera, each flake fixed in the world (they don't swim with it).
  const wrap = (v, size) => ((((v + size / 2) % size) + size) % size) - size / 2;
  const update = (sec, at) => {
    const pos = object.geometry.getAttribute('position');
    for (let k = 0; k < n; k += 1) {
      const x = at.x + wrap(base[k * 3] + (snow ? Math.sin(sec * 0.7 + k) * 0.8 : sec * 2.5) - at.x, box.w);
      const z = at.z + wrap(base[k * 3 + 2] + (snow ? Math.cos(sec * 0.5 + k * 1.3) * 0.8 : sec * 1.2) - at.z, box.w);
      const y = at.y + wrap(base[k * 3 + 1] - sec * fall - at.y, box.h);
      if (snow) pos.setXYZ(k, x, y, z);
      else {
        pos.setXYZ(k * 2, x, y, z);
        pos.setXYZ(k * 2 + 1, x - 0.1, y + streak, z - 0.05);
      }
    }
    pos.needsUpdate = true;
  };
  return { object, update };
}

/** A faint edge light along the top of both rims (night): one draw call. */
export function edgeLights(centerline, channel) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const pos = [];
  const rows = [];
  for (let i = 0; i <= segments; i += 1) {
    const s = samples[i];
    const sArc = i * step;
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const R = channelRadiusAt(channel, sArc);
    const lip = channelLipAt(channel, sArc);
    const fork = forkAt(channel, sArc);
    const edge = fork ? Math.abs(forkOffset(fork, sArc)) + forkRadius(fork, channel.radius, sArc) * Math.sin(channel.maxAngle) : R * Math.sin(lip);
    const top = s.pos.y + R * (1 - Math.cos(lip)) + 0.03;
    rows.push([1, -1].map((sign) => [0.04, 0.22].map((d) => {
      const p = s.pos.clone().addScaledVector(side, sign * (edge + d));
      p.y = top;
      return p;
    })));
  }
  for (let i = 0; i < segments; i += 1) {
    for (let k = 0; k < 2; k += 1) {
      const [a0, a1] = rows[i][k];
      const [b0, b1] = rows[i + 1][k];
      for (const p of [a0, b0, b1, a0, b1, a1]) pos.push(p.x, p.y, p.z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeBoundingSphere();
  const mesh = new Mesh(g, new MeshBasicMaterial({ color: '#7fd8ff', side: DoubleSide, fog: false }));
  mesh.name = 'edge lights';
  return mesh;
}

/**
 * The effects of a theme's preset: { sky (children for the sky dome), world
 * (things in the world), update(sec, cameraPosition), dispose } or null.
 */
export function buildEffects(theme, { centerline = null, channel = null, lite = false } = {}) {
  const fx = theme?.effects ?? {};
  if (!fx.stars && !fx.aurora && !fx.precipitation && !fx.night) return null;
  const sky = new Group();
  sky.name = 'sky effects';
  const world = new Group();
  world.name = 'weather';
  const updates = [];
  if (fx.stars) sky.add(stars(lite));
  if (fx.aurora) {
    const a = aurora(lite);
    sky.add(a.group);
    updates.push((sec) => a.update(sec));
  }
  if (fx.precipitation) {
    const p = precipitation(fx.precipitation, lite);
    world.add(p.object);
    updates.push((sec, at) => p.update(sec, at));
  }
  if (fx.night && centerline && channel) world.add(edgeLights(centerline, channel));
  const dispose = () => {
    for (const g of [sky, world]) {
      g.traverse((o) => {
        o.geometry?.dispose();
        o.material?.map?.dispose();
        o.material?.dispose();
      });
      g.removeFromParent();
    }
  };
  return { sky, world, night: Boolean(fx.night), update: (sec, at) => updates.forEach((u) => u(sec, at)), dispose };
}
