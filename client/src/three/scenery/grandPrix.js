/**
 * The Grand Prix look (a kit track with `grandPrix` in its file): packed
 * grandstands at the start, the finish straight and the sharp bend, smaller
 * groups along the way (and wherever a section's scenery asks for a
 * 'grandstand' or a 'crowd'), barriers along the outside of the bends, a finish
 * building with a balcony over the line, floodlight masts on a night race, and
 * fireworks over the finish once the winner is home. The start lights and the
 * chequered finish gantry are drawn by the start gate and the finish arch; the
 * kerbs by the channel itself.
 *
 * The crowds: every spectator in one merged mesh per neighbourhood, moved on the
 * graphics card: flags wave all the time, and a stand's crowd stands up (and
 * bounces) while marbles pass it. On phones the crowds are thinner and plainer:
 * half the people, each one box, fewer flags.
 *
 * Drawing only: the race never sees any of it.
 */
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Float32BufferAttribute, Group, Matrix4, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, Points, PointsMaterial, Quaternion, Vector3,
} from 'three';
import { bendSegments } from '../iceChannel';
import { hashString, merge, mergeByArea, piece, seededRandom } from './parts';

const UP = new Vector3(0, 1, 0);
const MAX_STANDS = 32;          // stands (and the finish building's balcony) whose crowds stand up on their own
const BEND_RADIUS = 200;        // metres: a bend tighter than this gets barriers along its outside
const MAX_FOOTING = 14;         // metres: no stand on scaffolding taller than this
const SCAFFOLD = '#8d929a';
const OTHER_CLEAR = 16;         // metres a stand keeps from any other stretch of the track
const SMALL_EVERY = 230;        // metres between the smaller groups of spectators along the way (a track's grandPrix.groupsEvery overrides it)
const CHEER_NEAR = 35;          // metres: marbles this close bring a stand's crowd to its feet…
const CHEER_FAR = 70;           // …and they are sitting again by this far
const FIREWORKS_FOR = 14000;    // ms of fireworks after the winner is home
const BURST_LIFE = 1800;        // ms each burst lasts
const BURST_GAP = 450;          // ms between bursts

/** Who fills the stands: shirt colours, skin, what they wave, and the seats. */
export const CROWD_STYLES = {
  fans: {
    shirts: ['#d8322b', '#2556b8', '#f2b81c', '#2f9a4a', '#f2f2ee', '#1c1d21', '#e86a1b', '#7a3fb0'],
    skin: ['#f0c8a0', '#d9a37a', '#a8724a', '#6e4a30', '#4a3020'],
    flags: ['#d8322b', '#2556b8', '#f2b81c', '#2f9a4a', '#f2f2ee', '#e86a1b'],
    seats: ['#2556b8', '#d8322b'],
    stand: '#c9c6bf', roof: '#f2f2ee',
  },
  // Elderglade: elves and woodland folk in greens and golds, waving glowing lanterns; tree-house stands.
  elves: {
    shirts: ['#3f8f3a', '#5aa344', '#2f6e5a', '#8a6a45', '#c9a24a', '#e8dcc0'],
    skin: ['#f2dcc0', '#e8c8a0', '#d9b48a'],
    flags: ['#ffe27a', '#bfff8a', '#fff2b0'],
    seats: ['#6b4a2f', '#8a6a45'],
    stand: '#7a5a3a', roof: '#3f7a3a',
  },
  // Frostmere: the kingdom's folk in fur cloaks, waving blue and silver.
  'kingdom-folk': {
    shirts: ['#8a6a4a', '#5a4a3a', '#e8e4dc', '#6a7a8a', '#3a4a6a', '#a8382a'],
    skin: ['#f2d8c0', '#e8c4a4', '#d0a07a'],
    flags: ['#2f5d9a', '#c9d6e2', '#f2f2ee', '#8fb3d1'],
    seats: ['#6b4a2f', '#4a3424'],
    stand: '#8a6a45', roof: '#e8eef5',
  },
  // The Sahara: robes in indigo, white and saffron; the stands are colourful tents.
  'desert-folk': {
    shirts: ['#2a3f8a', '#f2f2ee', '#e8a02a', '#b8312f', '#3a8a8a', '#c9a06a'],
    skin: ['#a8724a', '#8a5a3a', '#6e4a30', '#c98f6a'],
    flags: ['#d8322b', '#2f9a4a', '#f2c230', '#2556b8'],
    seats: ['#b8312f', '#2a3f8a'],
    stand: '#c98a52', roof: '#e8c45a',
  },
  // Wyrmwood Hollow: knights in grey steel and villagers in homespun, waving battle banners.
  villagers: {
    shirts: ['#8a8d93', '#6a6d73', '#7a5a3a', '#5a6a3a', '#a8382a', '#c9b28a'],
    skin: ['#f0c8a0', '#d9a37a', '#a8724a'],
    flags: ['#a8201c', '#e0b43c', '#2f4a8a', '#1f2024'],
    seats: ['#6b5a48', '#5a4a3a'],
    stand: '#9a9282', roof: '#6b2a22',
  },
};

/** What lines the outside of the bends: racing tyres, logs, snow banks or stone. */
export const BARRIER_STYLES = {
  tyres: { body: '#1c1d21', bands: ['#d8322b', '#f2f2ee'] },
  logs: { body: '#6b4a2f', bands: ['#8a6a45', '#5a3f2a'], round: true },
  snow: { body: '#f4f7fa', bands: ['#dbe6f0', '#f4f7fa'] },
  stone: { body: '#8d877d', bands: ['#a49e94', '#7f796f'] },
  // Delhi: tyres hung with marigold garlands.
  marigolds: { body: '#1c1d21', bands: ['#f28a1c', '#f2c21c'] },
};

/** A soft round spark for the fireworks (none where there is no canvas: square sparks then). */
function sparkTexture() {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const g = canvas?.getContext?.('2d');
  if (!g) return null;
  canvas.width = 32;
  canvas.height = 32;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(canvas);
}

/** The crowds' material: their stand's excitement lifts them; flags wave with time. */
function crowdMaterial() {
  const uniforms = { uTime: { value: 0 }, uExcite: { value: new Array(MAX_STANDS).fill(0) } };
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uExcite = uniforms.uExcite;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aCrowd; // stand, kind (1 a person, 2 a flag), phase, how far along its flag
attribute vec3 aSway;  // which way its flag flutters
uniform float uTime;
uniform float uExcite[${MAX_STANDS}];`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float ex = uExcite[int(aCrowd.x + 0.5)];
transformed.y += step(0.5, aCrowd.y) * ex * (0.3 + 0.08 * sin(uTime * 11.0 + aCrowd.z));
transformed += aSway * aCrowd.w * sin(uTime * 7.0 + aCrowd.z) * (0.22 + 0.4 * ex);`);
  };
  material.customProgramCacheKey = () => 'grand-prix-crowd';
  return { material, uniforms };
}

/** A box for the crowd mesh: coloured, with its crowd attributes (flag: how far along the flag each corner is, from `poleX`). */
function crowdBox(w, h, d, x, y, z, color, stand, kind, phase, frame, flag = null) {
  const g = piece(new BoxGeometry(w, h, d), color, new Matrix4().makeTranslation(x, y, z));
  const n = g.getAttribute('position').count;
  const crowd = new Float32Array(n * 4);
  const sway = new Float32Array(n * 3);
  const pos = g.getAttribute('position');
  for (let k = 0; k < n; k += 1) {
    crowd.set([stand, kind, phase, flag ? Math.max(0, (pos.getX(k) - flag.poleX) / flag.length) : 0], k * 4);
    if (flag) sway.set([flag.dir.x, flag.dir.y, flag.dir.z], k * 3);
  }
  g.applyMatrix4(frame);
  g.setAttribute('aCrowd', new Float32BufferAttribute(crowd, 4));
  g.setAttribute('aSway', new Float32BufferAttribute(sway, 3));
  return g;
}

/**
 * The Grand Prix scenery for a kit track: { group, update(t, ctx), spots } or null.
 * ground: from buildKitGround (rows, over, onBridge, field, groundAt); solids: spots kept clear
 * (landmarks, billboards); boardFeet: the billboards' feet.
 */
export function buildGrandPrix(centerline, channel, kit, { lite = false, ground, solids = [], boardFeet = [], slug = '' } = {}) {
  const gp = kit?.grandPrix;
  if (!gp) return null;
  const { samples, segments } = centerline;
  const { rows, over, onBridge, field, groundAt } = ground;
  const arc = channel.arc;
  const rand = seededRandom(hashString(`grand-prix:${slug}`));
  const style = CROWD_STYLES[gp.crowd] ?? CROWD_STYLES.fans;
  const barrier = BARRIER_STYLES[gp.barrier] ?? BARRIER_STYLES.tyres;
  const group = new Group();
  group.name = 'grand prix';
  const still = [];   // stands, barriers, the building, masts: into the still scenery
  const crowd = [];   // spectators and their flags
  const stands = [];  // { centre, index }
  const spots = [];   // { x, z, r } kept clear of trees
  const covered = (p) => kit.sections.some((s) => (s.tunnel || s.bridge) && p >= s.from && p <= s.to);
  const sampleAt = (p) => Math.min(segments, Math.max(0, Math.round(p * segments)));
  const flat = (v) => new Vector3(v.x, 0, v.z).normalize();
  const hDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  /** Horizontal distance from a point to this stretch of track (samples near i)… */
  const ownDist = (P, i) => {
    let best = Infinity;
    for (let j = Math.max(0, i - 80); j <= Math.min(segments, i + 80); j += 2) best = Math.min(best, hDist(P, samples[j].pos));
    return best;
  };
  /** …and to any other stretch (further along or back than that). */
  const otherDist = (P, i) => {
    let best = Infinity;
    for (let j = 0; j <= segments; j += 2) if (Math.abs(j - i) > 120) best = Math.min(best, hDist(P, samples[j].pos));
    return best;
  };
  /** Which way the track turns at sample i, seen along `side` (+1 towards it, -1 away, 0 straight). */
  const turnAt = (i, K = 6) => {
    const a = samples[Math.max(0, i - K)];
    const b = samples[Math.min(segments, i + K)];
    const d = flat(b.tangent).sub(flat(a.tangent));
    const v = d.dot(flat(samples[i].side));
    return Math.abs(v) < 1e-3 ? 0 : Math.sign(v);
  };

  // ── Grandstands ─────────────────────────────────────────────────────────
  const SIZES = {
    big: { width: lite ? 16 : 24, tiers: lite ? 3 : 4, roof: true },
    small: { width: lite ? 7 : 10, tiers: 2, roof: false },
  };
  const placeStand = (p, sign, size, { shift = 0, slide = 0, people = true } = {}) => {
    if (stands.length >= MAX_STANDS || p < 0 || p > 1) return false;
    const i = sampleAt(p);
    if (over[i] || onBridge[i] || covered(p)) return false;
    const row = rows[i]?.[sign];
    if (!row) return false;
    const s = samples[i];
    const out = flat(s.side).multiplyScalar(sign);
    const along = flat(s.tangent);
    const { width, tiers, roof } = SIZES[size];
    const depth = tiers * 1.4 + 0.6;
    // Just outside the rim's shoulder, at track level, following the track's slope, on a footing down to the
    // ground; where the track runs in a cutting, up on the land at the top of the bank.
    const cutting = row.out.y > row.shoulder.y + 1;
    const front = (cutting ? row.out.clone().addScaledVector(out, 2.5) : row.shoulder.clone().addScaledVector(out, 2)).addScaledVector(out, shift).addScaledVector(along, slide);
    const corners = [-1, 1].flatMap((k) => [0, 1].map((b) => front.clone().addScaledVector(along, (k * width) / 2).addScaledVector(out, b * depth)));
    for (const c of corners) {
      if (otherDist(c, i) < OTHER_CLEAR) return false;
      if (ownDist(c, i) < hDist(front, s.pos) - 2) return false;
    }
    const centre = front.clone().addScaledVector(out, depth / 2);
    const reach = Math.hypot(width, depth) / 2;
    if (solids.some((o) => hDist(o, centre) < o.r + reach) || spots.some((o) => hDist(o, centre) < o.r + reach)) return false;
    if (boardFeet.some((f) => hDist(f, centre) < reach + 4)) return false;
    const segLen = arc / segments;
    // Each end at the rim's height beside it (or the ground's, past the start), the stand leaning between them.
    const base = [-1, 1].map((k) => {
      const e = front.clone().addScaledVector(along, (k * width) / 2);
      const j = i + Math.round((slide + (k * width) / 2) / segLen);
      const rim = !cutting && j >= 0 && j <= segments ? rows[j]?.[sign]?.shoulder.y : -Infinity;
      return Math.max(rim ?? -Infinity, groundAt(e.x, e.z));
    });
    const x = new Vector3().crossVectors(UP, out); // local x along the stand (y up, z away from the track)
    const rise = base[1] - base[0]; // along the track's direction of travel
    const tilt = Math.max(-0.3, Math.min(0.3, Math.atan2(rise * Math.sign(x.dot(along)), width)));
    const y0 = (base[0] + base[1]) / 2 - 0.1;
    const heights = corners.map((c) => groundAt(c.x, c.z));
    const footing = Math.max(0, y0 - Math.min(...heights)) + Math.abs(Math.tan(tilt)) * (width / 2) + 0.5;
    if (footing > MAX_FOOTING) return false;
    const frame = new Matrix4().makeBasis(x, UP, out).multiply(new Matrix4().makeRotationZ(tilt)).setPosition(front.x, y0, front.z);
    const lift = 0;
    if (footing <= 1.6) still.push(piece(new BoxGeometry(width, footing, depth), style.stand, new Matrix4().makeTranslation(0, -footing / 2, depth / 2 - 0.3).premultiply(frame)));
    else {
      // Higher up, it stands on steel scaffolding, as a race weekend's stands do.
      still.push(piece(new BoxGeometry(width, 0.35, depth), style.stand, new Matrix4().makeTranslation(0, -0.18, depth / 2 - 0.3).premultiply(frame)));
      const cols = Math.max(2, Math.round(width / (lite ? 8 : 4)));
      for (let c = 0; c <= cols; c += 1) {
        const px = -width / 2 + (width * c) / cols;
        for (const pz of [0, depth - 0.6]) still.push(piece(new BoxGeometry(0.22, footing, 0.22), SCAFFOLD, new Matrix4().makeTranslation(px, -footing / 2, pz).premultiply(frame)));
      }
      for (let y = 2.5; y < footing - 0.5; y += 3) {
        for (const pz of [0, depth - 0.6]) still.push(piece(new BoxGeometry(width, 0.14, 0.14), SCAFFOLD, new Matrix4().makeTranslation(0, -y, pz).premultiply(frame)));
      }
    }
    const index = stands.length;
    stands.push({ centre: centre.clone().setY(y0 + 2), index });
    spots.push({ x: centre.x, z: centre.z, r: reach + 1 });
    // The stand: stepped concrete tiers with a stripe of seats on each, side walls, a back wall, a roof on posts.
    const top = (k) => 0.6 + lift + k * 0.55;
    for (let k = 0; k < tiers; k += 1) {
      still.push(piece(new BoxGeometry(width, top(k), 1.4), style.stand, new Matrix4().makeTranslation(0, top(k) / 2, 0.7 + k * 1.4).premultiply(frame)));
      still.push(piece(new BoxGeometry(width - 0.4, 0.14, 0.45), style.seats[k % style.seats.length], new Matrix4().makeTranslation(0, top(k) + 0.07, 1.05 + k * 1.4).premultiply(frame)));
    }
    const back = top(tiers - 1) + (roof ? 3.4 : 1.2);
    still.push(piece(new BoxGeometry(width, back, 0.3), style.stand, new Matrix4().makeTranslation(0, back / 2, depth - 0.45).premultiply(frame)));
    for (const k of [-1, 1]) still.push(piece(new BoxGeometry(0.3, top(tiers - 1) + 1, depth), style.stand, new Matrix4().makeTranslation((k * width) / 2, (top(tiers - 1) + 1) / 2, depth / 2 - 0.3).premultiply(frame)));
    if (roof) {
      still.push(piece(new BoxGeometry(width + 1, 0.25, depth + 0.6), style.roof, new Matrix4().makeTranslation(0, back, depth / 2 - 0.3).premultiply(frame)));
      for (const k of [-0.5, 0, 0.5]) still.push(piece(new BoxGeometry(0.22, back, 0.22), style.stand, new Matrix4().makeTranslation(k * width, back / 2, 0.15).premultiply(frame)));
    }
    if (!people) return true;
    // The crowd: a row on every tier (on phones half as many people, each one box, and fewer flags).
    const gap = lite ? 1.5 : 0.78;
    let n = 0;
    for (let k = 0; k < tiers; k += 1) {
      for (let px = -width / 2 + 0.6; px <= width / 2 - 0.6; px += gap) {
        const jx = px + (rand() - 0.5) * 0.2;
        const y = top(k) + 0.14;
        const z = 1.0 + k * 1.4;
        const shirt = style.shirts[Math.floor(rand() * style.shirts.length)];
        const phase = rand() * 6.28;
        if (lite) crowd.push(crowdBox(0.44, 0.78, 0.3, jx, y + 0.39, z, shirt, index, 1, phase, frame));
        else {
          crowd.push(crowdBox(0.42, 0.56, 0.28, jx, y + 0.28, z, shirt, index, 1, phase, frame));
          crowd.push(crowdBox(0.24, 0.24, 0.24, jx, y + 0.7, z, style.skin[Math.floor(rand() * style.skin.length)], index, 1, phase, frame));
        }
        if (n % (lite ? 7 : 4) === 2) {
          // A flag on a pole, fluttering towards and away from the track.
          const poleX = jx + 0.22;
          crowd.push(crowdBox(0.04, 1.3, 0.04, poleX, y + 1.15, z, '#d8d4cc', index, 2, phase, frame));
          const dir = out.clone();
          crowd.push(crowdBox(0.7, 0.45, 0.03, poleX + 0.36, y + 1.55, z, style.flags[Math.floor(rand() * style.flags.length)], index, 2, phase, frame, { poleX, length: 0.72, dir }));
        }
        n += 1;
      }
    }
    return true;
  };

  // The start: packed stands either side of the plunge, out past the starting funnel.
  for (const sign of [1, -1]) placeStand(0, sign, 'big', { slide: -6 }) || placeStand(0, sign, 'big', { slide: -6, shift: 6 }) || placeStand(0, sign, 'small', { slide: -4 });
  // The finish straight: a packed stand opposite the finish building, and another further up.
  const finishSign = kit.mirrored ? -1 : 1; // the building's side
  placeStand(1 - 22 / arc, -finishSign, 'big') || placeStand(1 - 45 / arc, -finishSign, 'big');
  placeStand(1 - 60 / arc, finishSign, 'big') || placeStand(1 - 80 / arc, finishSign, 'small');
  // The sharp bend: a packed stand on its outside.
  for (const sec of kit.sections.filter((x) => x.shape === 'hairpin')) {
    const p = (sec.from + sec.to) / 2;
    const outside = -turnAt(sampleAt(p)) || 1;
    placeStand(p, outside, 'big') || placeStand(p, outside, 'big', { shift: 8 }) || placeStand(p, -outside, 'small');
  }
  // Where a section's scenery asks: a packed 'grandstand' or a smaller 'crowd' (on the outside of a bend, else on the left).
  for (const sec of kit.sections) {
    for (const tag of ['grandstand', 'crowd']) {
      if (!(sec.scenery ?? []).includes(tag)) continue;
      const p = (sec.from + sec.to) / 2;
      const outside = -turnAt(sampleAt(p)) || 1;
      const size = tag === 'grandstand' ? 'big' : 'small';
      placeStand(p, outside, size) || placeStand(p + 15 / arc, outside, size) || placeStand(p, -outside, size);
    }
  }
  // Smaller groups along the way, every so often, on alternate sides.
  let side = 1;
  for (let m = 120; m < arc - 120; m += kit.grandPrix.groupsEvery ?? SMALL_EVERY) {
    const p = m / arc;
    if (stands.some((st) => hDist(st.centre, samples[sampleAt(p)].pos) < 70)) continue;
    if (placeStand(p, side, 'small') || placeStand(p, -side, 'small') || placeStand(p + 20 / arc, side, 'small')) side = -side;
  }

  // ── Barriers along the outside of the bends ───────────────────────────
  const bends = bendSegments(centerline, BEND_RADIUS);
  const every = lite ? 4 : 2;
  for (let i = 2; i < segments - every - 2; i += every) {
    if (!bends[i] || over[i] || onBridge[i] || over[i + every] || onBridge[i + every] || covered(i / segments)) continue;
    const outside = -turnAt(i);
    if (!outside) continue;
    const a = rows[i]?.[outside];
    const b = rows[i + every]?.[outside];
    if (!a || !b) continue;
    const p0 = a.inner.clone().lerp(a.shoulder, 0.55);
    const p1 = b.inner.clone().lerp(b.shoulder, 0.55);
    const len = p0.distanceTo(p1);
    if (len < 0.5 || len > 4 * every) continue;
    const m = new Matrix4().lookAt(p0, p1, UP).setPosition(p0.clone().add(p1).multiplyScalar(0.5).add(new Vector3(0, 0.42, 0)));
    const band = barrier.bands[(i / every) % 2];
    if (barrier.round) still.push(piece(new CylinderGeometry(0.42, 0.42, len + 0.05, 6).rotateX(Math.PI / 2), barrier.body, m));
    else still.push(piece(new BoxGeometry(0.8, 0.84, len + 0.05), barrier.body, m));
    if (!lite) still.push(piece(new BoxGeometry(0.84, 0.22, len + 0.06), band, new Matrix4().makeTranslation(0, 0.1, 0).premultiply(m)));
  }

  // ── The finish building, its balcony over the line ────────────────────
  {
    const i = segments;
    const s = samples[i];
    const out = flat(s.side).multiplyScalar(finishSign);
    const along = flat(s.tangent);
    const row = rows[i]?.[finishSign];
    const front = (row?.out ?? s.pos.clone().addScaledVector(out, 8)).clone().addScaledVector(out, 3).addScaledVector(along, -4);
    const y0 = groundAt(front.x, front.z) - 0.2;
    const x = new Vector3().crossVectors(UP, out);
    const frame = new Matrix4().makeBasis(x, UP, out).setPosition(front.x, y0, front.z);
    const W = 16;
    const D = 9;
    const P = (geometry, colour, tx, ty, tz) => still.push(piece(geometry, colour, new Matrix4().makeTranslation(tx, ty, tz).premultiply(frame)));
    P(new BoxGeometry(W, 4.4, D), '#e8e6e0', 0, 2.2, D / 2 + 1);
    P(new BoxGeometry(W - 1, 1.6, 0.1), '#2d3e52', 0, 2.4, 1);                 // ground-floor glass
    P(new BoxGeometry(W, 3.6, D - 2), '#f2f2ee', 0, 6.2, D / 2 + 2);
    P(new BoxGeometry(W - 1, 2.0, 0.1), '#2d3e52', 0, 6.3, 2);                 // the upper floor's glass front
    P(new BoxGeometry(W, 0.3, 3.2), '#c9c6bf', 0, 4.55, 1.3);                  // the balcony
    P(new BoxGeometry(W, 0.9, 0.08), '#d8d4cc', 0, 5.15, -0.25);               // its railing
    P(new BoxGeometry(W + 0.6, 0.4, D - 1), '#c9c6bf', 0, 8.2, D / 2 + 1.5);   // roof
    for (const k of [-0.4, 0, 0.4]) {
      P(new BoxGeometry(0.12, 4, 0.12), '#d8d4cc', k * W, 10.4, D / 2 + 1.5);
      P(new BoxGeometry(1.4, 0.9, 0.05), style.flags[Math.floor(rand() * style.flags.length)], k * W + 0.75, 11.8, D / 2 + 1.5);
    }
    // Spectators on the balcony (they stand up as the field comes home, too).
    const index = stands.length;
    if (index < MAX_STANDS) {
      stands.push({ centre: front.clone().setY(y0 + 5), index });
      for (let px = -W / 2 + 0.8; px <= W / 2 - 0.8; px += lite ? 1.8 : 0.9) {
        const shirt = style.shirts[Math.floor(rand() * style.shirts.length)];
        const phase = rand() * 6.28;
        crowd.push(crowdBox(0.44, lite ? 0.95 : 0.7, 0.3, px, 4.7 + (lite ? 0.48 : 0.35), 1.2, shirt, index, 1, phase, frame));
        if (!lite) crowd.push(crowdBox(0.24, 0.24, 0.24, px, 4.7 + 0.86, 1.2, style.skin[Math.floor(rand() * style.skin.length)], index, 1, phase, frame));
      }
    }
    spots.push({ x: front.x + out.x * (D / 2), z: front.z + out.z * (D / 2), r: W / 2 + 2 });
  }

  // ── Floodlight masts (a night race) ───────────────────────────────────
  const lamps = [];
  if (kit.lighting === 'night') {
    let k = 0;
    for (let m = 60; m < arc - 30; m += lite ? 160 : 110, k += 1) {
      const i = sampleAt(m / arc);
      const sign = k % 2 ? -1 : 1;
      const row = rows[i]?.[sign];
      if (!row || over[i] || onBridge[i]) continue;
      const out = flat(samples[i].side).multiplyScalar(sign);
      const foot = row.out.clone().addScaledVector(out, 4);
      if (otherDist(foot, i) < OTHER_CLEAR) continue;
      foot.y = groundAt(foot.x, foot.z);
      const H = Math.max(16, samples[i].pos.y + 14 - foot.y);
      still.push(piece(new BoxGeometry(0.4, H, 0.4), '#5a5e66', new Matrix4().makeTranslation(foot.x, foot.y + H / 2, foot.z)));
      const x = new Vector3().crossVectors(UP, out);
      const head = new Matrix4().makeBasis(x, UP, out).premultiply(new Matrix4().makeRotationAxis(x, -0.5)).setPosition(foot.x, foot.y + H, foot.z);
      still.push(piece(new BoxGeometry(3, 1.4, 0.4), '#3a3d44', head));
      lamps.push(piece(new BoxGeometry(2.7, 1.1, 0.1), '#fff6d8', new Matrix4().makeTranslation(0, 0, -0.25).premultiply(head)));
    }
  }

  for (const g of still) if (!g.getAttribute('normal')) g.computeVertexNormals();
  for (const geometry of mergeByArea(still, 400)) group.add(Object.assign(new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true })), { name: 'grandstands' }));
  if (lamps.length) group.add(Object.assign(new Mesh(merge(lamps), new MeshBasicMaterial({ vertexColors: true })), { name: 'floodlights' }));
  const { material: crowdMat, uniforms } = crowdMaterial();
  if (crowd.length) for (const geometry of mergeByArea(crowd, lite ? 600 : 300)) group.add(Object.assign(new Mesh(geometry, crowdMat), { name: 'crowds' }));

  // ── Fireworks over the finish once the winner is home ─────────────────
  const sparkles = gp.fireworks === 'sparkles';
  const bursts = lite ? 5 : 8;
  const per = lite ? 26 : 50;
  const fwGeo = new BufferGeometry();
  fwGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(bursts * per * 3), 3));
  fwGeo.setAttribute('color', new Float32BufferAttribute(new Float32Array(bursts * per * 3), 3));
  const fwPos = fwGeo.getAttribute('position').array; // (written in place every frame)
  const fwCol = fwGeo.getAttribute('color').array;
  const fireworks = new Points(fwGeo, new PointsMaterial({ size: sparkles ? 0.8 : 1.4, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  fireworks.name = 'fireworks';
  fireworks.frustumCulled = false;
  fireworks.visible = false;
  group.add(fireworks);
  const end = samples[segments];
  const endAlong = flat(end.tangent);
  const endSide = flat(end.side);
  const palette = (sparkles ? ['#ffe27a', '#bfff8a', '#ffffff', '#9fe8ff'] : ['#ff4a3a', '#ffd23a', '#4ab0ff', '#7dff6a', '#ff7af0', '#ffffff']).map((c) => new Color(c));
  const dirs = Array.from({ length: per }, (_, k) => {
    // Evenly round a sphere (a golden-angle spiral), so every burst is a round ball of sparks.
    const y = 1 - (2 * (k + 0.5)) / per;
    const r = Math.sqrt(1 - y * y);
    const a = k * 2.399963;
    return new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });
  let fireFrom = null;
  const fire = (t) => {
    const age = fireFrom === null ? -1 : t - fireFrom;
    fireworks.visible = age >= 0 && age < FIREWORKS_FOR + BURST_LIFE;
    if (!fireworks.visible) return;
    for (let b = 0; b < bursts; b += 1) {
      // Burst b goes off every bursts × BURST_GAP ms, somewhere new each time (seeded: every viewer sees the same).
      const cycle = Math.floor((age - b * BURST_GAP) / (bursts * BURST_GAP));
      const k = (age - b * BURST_GAP - cycle * bursts * BURST_GAP) / BURST_LIFE; // 0 → 1 over its life
      const live = cycle >= 0 && k >= 0 && k < 1 && age - b * BURST_GAP < FIREWORKS_FOR;
      const r = seededRandom(hashString(`fw:${b}:${cycle}`));
      const centre = end.pos.clone()
        .addScaledVector(endAlong, 28 + r() * 26)
        .addScaledVector(endSide, (r() - 0.5) * 34)
        .add(new Vector3(0, (sparkles ? 4 : 7) + r() * 9, 0));
      const colour = palette[Math.floor(r() * palette.length)];
      const sec = (k * BURST_LIFE) / 1000;
      const speed = sparkles ? 4 : 10;
      const fall = sparkles ? 0.8 : 3.5;
      const fade = live ? (1 - k) ** 1.6 : 0;
      for (let n = 0; n < per; n += 1) {
        const j = (b * per + n) * 3;
        const d = dirs[n];
        const spread = speed * (1 - Math.exp(-3 * sec)) / 3 * 3;
        fwPos[j] = centre.x + d.x * spread;
        fwPos[j + 1] = centre.y + d.y * spread - fall * sec * sec;
        fwPos[j + 2] = centre.z + d.z * spread;
        fwCol[j] = colour.r * fade;
        fwCol[j + 1] = colour.g * fade;
        fwCol[j + 2] = colour.b * fade;
      }
    }
    fwGeo.getAttribute('position').needsUpdate = true;
    fwGeo.getAttribute('color').needsUpdate = true;
  };

  // ── On the race clock ─────────────────────────────────────────────────
  const excite = new Array(MAX_STANDS).fill(0);
  let lastT = null;
  const update = (t, ctx = {}) => {
    uniforms.uTime.value = t / 1000;
    const dt = lastT === null || t < lastT || t - lastT > 500 ? null : (t - lastT) / 1000;
    lastT = t;
    const positions = ctx.positions ?? [];
    for (const st of stands) {
      let near = Infinity;
      for (const p of positions) if (p) near = Math.min(near, p.distanceTo(st.centre));
      const want = near <= CHEER_NEAR ? 1 : near >= CHEER_FAR ? 0 : (CHEER_FAR - near) / (CHEER_FAR - CHEER_NEAR);
      excite[st.index] = dt === null ? want : excite[st.index] + (want - excite[st.index]) * Math.min(1, dt * 4);
    }
    uniforms.uExcite.value = excite;
    // The fireworks: from the moment the first marble is home (a replay rewound past it puts them away).
    const home = ctx.frame?.p?.some((x) => x >= 1);
    if (!home) fireFrom = null;
    else if (fireFrom === null || t < fireFrom) fireFrom = t;
    fire(t);
  };
  update(0);
  return { group, update, spots, stands: stands.length };
}
