/**
 * The floor check (dev and tests; Moses, 25 Oct 2026: on an iPhone a hole in Wadi Mujib Burst's floor at
 * 36 s, the supports showing through): is the drawn channel whole along the whole track, its floor, its
 * walls up to the lip and the rims along their tops, as the game draws it on a phone and on a computer?
 *
 *   - gaps: points on the true channel (as the physics has it, placeOnChannel) at the middle of every
 *     segment, across the floor and up both walls, and on both rims: each must lie on a drawn triangle
 *     of its own segment or a neighbour's (within the panels' sag off the true curve);
 *   - pieces: the pieces the channel is drawn in (channelPieces) together hold all of it, in order;
 *   - cut: no point of the channel lies in what is clipped away while racing (a coaster station's
 *     canopy, TrackScene finishCutaway, cut for the whole race on a phone).
 *
 * Looks only: the race never reads the drawn channel (the physics: src/game/physicsSimulator.js).
 */
import { Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius, placeOnChannel } from './iceChannel';

const ACROSS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
const TOLERANCE = 0.3; // metres: the flat panels' sag off the true curve is at most about 0.15

/** Distance from p to triangle abc (squared), or Infinity when the triangle's box is further than `reach`. */
function triDistSq(p, ax, ay, az, bx, by, bz, cx, cy, cz, reach) {
  if (p.x < Math.min(ax, bx, cx) - reach || p.x > Math.max(ax, bx, cx) + reach) return Infinity;
  if (p.y < Math.min(ay, by, cy) - reach || p.y > Math.max(ay, by, cy) + reach) return Infinity;
  if (p.z < Math.min(az, bz, cz) - reach || p.z > Math.max(az, bz, cz) + reach) return Infinity;
  // (Ericson, Real-Time Collision Detection 5.1.5.)
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = p.x - ax, apy = p.y - ay, apz = p.z - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  const sq = (x, y, z) => x * x + y * y + z * z;
  if (d1 <= 0 && d2 <= 0) return sq(apx, apy, apz);
  const bpx = p.x - bx, bpy = p.y - by, bpz = p.z - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return sq(bpx, bpy, bpz);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return sq(apx - v * abx, apy - v * aby, apz - v * abz); }
  const cpx = p.x - cx, cpy = p.y - cy, cpz = p.z - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return sq(cpx, cpy, cpz);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return sq(apx - w * acx, apy - w * acy, apz - w * acz); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return sq(bpx - w * (cx - bx), bpy - w * (cy - by), bpz - w * (cz - bz)); }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return sq(apx - abx * v - acx * w, apy - aby * v - acy * w, apz - abz * v - acz * w);
}

/** The points to find on the drawn channel at the middle of segment i: [{ p, part }]. */
export function channelPoints(centerline, channel, i, { rimWidth = 0.45 } = {}) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const s = (i + 0.5) * step;
  const prog = (i + 0.5) / segments;
  const out = [];
  const fork = forkAt(channel, s);
  const branches = fork ? [1, -1] : [0];
  const R = fork ? forkRadius(fork, channel.radius, s) : channelRadiusAt(channel, s);
  const lip = fork ? channel.maxAngle : channelLipAt(channel, s);
  const offset = fork ? forkOffset(fork, s) : 0;
  for (const b of branches) {
    for (const l of ACROSS) {
      // (A split channel still overlapping its twin: only its own side of the middle is drawn.)
      const lateral = b * offset + R * Math.sin(l * lip);
      if (b && lateral * b < -0.05) continue;
      // (placeOnChannel's angle share is of the full wall; the funnel's lower lip scaled to it.)
      const p = placeOnChannel(centerline, channel, prog, (l * lip) / channel.maxAngle, b, 0, -0.02);
      out.push({ p, part: Math.abs(l) === 1 ? 'wall' : 'floor', at: s });
    }
  }
  if (!fork) {
    // The rims' tops, midway across each.
    const a = samples[i];
    const c = samples[i + 1];
    const side = new Vector3((a.side.x + c.side.x) / 2, 0, (a.side.z + c.side.z) / 2).normalize();
    const centre = a.pos.clone().lerp(c.pos, 0.5);
    const edge = R * Math.sin(lip);
    const top = R * (1 - Math.cos(lip));
    for (const k of [-1, 1]) out.push({ p: centre.clone().addScaledVector(side, k * (edge + rimWidth / 2)).setY(centre.y + top), part: 'rim', at: s });
  }
  return out;
}

/**
 * The holes in a drawn channel. geometry: buildIceChannelGeometry's (with its segmentStarts);
 * pieces: channelPieces' (optional); cut: TrackScene finishCutaway's, as when cutting (optional).
 * → [{ at (metres), part ('floor', 'wall', 'rim', 'pieces'), why ('gap', 'cut', 'pieces') }]
 */
export function floorHoles(centerline, channel, geometry, { pieces = null, cut = null, rimWidth } = {}) {
  const pos = geometry.getAttribute('position').array;
  const starts = geometry.userData.segmentStarts;
  const total = pos.length / 3;
  const { segments } = centerline;
  const holes = [];
  const reach = TOLERANCE;
  for (let i = 0; i < segments; i += 1) {
    const from = starts[Math.max(0, i - 1)];
    const to = i + 2 < starts.length ? starts[i + 2] : total;
    for (const { p, part, at } of channelPoints(centerline, channel, i, { rimWidth })) {
      let best = Infinity;
      for (let v = from; v + 2 < to && best > reach * reach; v += 3) {
        const o = v * 3;
        const d = triDistSq(p, pos[o], pos[o + 1], pos[o + 2], pos[o + 3], pos[o + 4], pos[o + 5], pos[o + 6], pos[o + 7], pos[o + 8], reach);
        if (d < best) best = d;
      }
      if (best > reach * reach) holes.push({ at, part, why: 'gap' });
      if (cut?.contains(p)) holes.push({ at, part, why: 'cut' });
    }
  }
  if (pieces) {
    // The pieces, end to end, are the whole channel.
    let n = 0;
    let same = true;
    for (const g of pieces) {
      const a = g.getAttribute('position').array;
      for (let k = 0; k < a.length && same; k += 97) same = a[k] === pos[n * 3 + k];
      n += a.length / 3;
    }
    if (n !== total || !same) holes.push({ at: 0, part: 'pieces', why: 'pieces' });
  }
  return holes;
}

/** Holes grouped into stretches: [{ from, to, parts, why }] (metres along). */
export function holeStretches(holes, join = 6) {
  const out = [];
  for (const h of [...holes].sort((a, b) => a.at - b.at)) {
    const last = out[out.length - 1];
    if (last && last.why === h.why && h.at - last.to <= join) {
      last.to = h.at;
      last.parts.add(h.part);
    } else out.push({ from: h.at, to: h.at, parts: new Set([h.part]), why: h.why });
  }
  return out.map((x) => ({ ...x, parts: [...x.parts] }));
}
