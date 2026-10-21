/**
 * The edge check (dev and tests; Moses, 21 Oct 2026): does the drawn channel's rim (the barrier along
 * each edge, its top and outer face) ever cross into the running surface? On a bend tighter than the
 * channel is wide, the inside edge's cross-sections overlap and its rim folds back over the floor;
 * the same happens wherever the sideways direction jumps between two samples.
 *
 * Looks only: the race never reads this mesh (the physics' walls are the channel's lip angle,
 * src/game/physicsSimulator.js).
 */
import { Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt } from './iceChannel';

const flat = (v) => new Vector3(v.x, 0, v.z).normalize();

/**
 * The places where a rim point lies over the floor of a nearby stretch of the channel.
 * Returns [{ i (segment), s (metres), side (-1 inside left / +1 right), depth (metres into the floor) }].
 * rimWidth: as drawn (iceChannel's default 0.45); window: how many samples either side are compared.
 */
export function rimCrossings(centerline, channel, { rimWidth = 0.45, window = 40, margin = 0.15 } = {}) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const edgeAt = (i) => channelRadiusAt(channel, i * step) * Math.sin(channelLipAt(channel, i * step));
  const out = [];
  for (let i = 0; i <= segments; i += 1) {
    if (forkAt(channel, i * step)) continue; // (split channels: drawn as two, each its own check)
    const s = samples[i];
    const side = flat(s.side);
    const e = edgeAt(i);
    for (const k of [-1, 1]) {
      for (const w of [0, rimWidth]) {
        const p = s.pos.clone().addScaledVector(side, k * (e + w));
        let worst = 0;
        for (let j = Math.max(0, i - window); j <= Math.min(segments - 1, i + window); j += 1) {
          if (Math.abs(j - i) <= 1) continue;
          if (forkAt(channel, j * step)) continue;
          const a = samples[j];
          const b = samples[j + 1];
          // Same level only (a stretch passing far over or under is a bridge, not a fold).
          if (Math.abs(p.y - (a.pos.y + b.pos.y) / 2) > 2.5) continue;
          const t = flat(new Vector3().subVectors(b.pos, a.pos));
          const len = new Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).length();
          const d = new Vector3(p.x - a.pos.x, 0, p.z - a.pos.z);
          const along = d.dot(t);
          if (along < 0 || along > len) continue;
          const lat = Math.abs(d.dot(flat(a.side)));
          const inside = Math.min(edgeAt(j), edgeAt(j + 1)) - lat;
          if (inside > margin) worst = Math.max(worst, inside);
        }
        if (worst > 0) out.push({ i, s: i * step, side: k, depth: worst });
      }
    }
  }
  return out;
}

/** The crossings grouped into stretches: [{ from, to (metres), side, depth (deepest) }]. */
export function rimCrossingStretches(found, gap = 6) {
  const out = [];
  for (const side of [-1, 1]) {
    const list = found.filter((f) => f.side === side).sort((a, b) => a.s - b.s);
    for (const f of list) {
      const last = out[out.length - 1];
      if (last && last.side === side && f.s - last.to <= gap) { last.to = f.s; last.depth = Math.max(last.depth, f.depth); } else out.push({ from: f.s, to: f.s, side, depth: f.depth });
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

/**
 * Pieces of a rail or barrier drawn along the rims (polylines of points) that hang over the running
 * surface: a point along a piece (5 per piece) closer to the middle of a stretch of channel at its
 * level than that stretch's lip, by more than `margin` metres (0.15: the rail resting on the rim is 0.45 wide) once the piece's own half-width
 * (`half`) is counted. Returns [{ line, k (piece), s (metres along the nearest stretch), depth }].
 */
export function railCrossings(centerline, channel, lines, { half = 0.22, margin = 0.15 } = {}) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const lipAt = (i) => channelRadiusAt(channel, i * step) * Math.sin(channelLipAt(channel, i * step));
  const topAt = (i) => channelRadiusAt(channel, i * step) * (1 - Math.cos(channelLipAt(channel, i * step)));
  // Stretches near a point (a coarse grid over the samples, seen from above).
  const CELL = 12;
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (let j = 0; j < segments; j += 1) {
    const m = samples[j].pos;
    const k = key(m.x, m.z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(j);
  }
  const near = (p) => {
    const gx = Math.floor(p.x / CELL); const gz = Math.floor(p.z / CELL);
    const out = [];
    for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) out.push(...(grid.get(`${gx + dx},${gz + dz}`) ?? []));
    return out;
  };
  const found = [];
  lines.forEach((line, n) => {
    for (let k = 1; k < line.length; k += 1) {
      let worst = 0; let at = 0;
      for (let q = 0; q <= 4; q += 1) {
        const p = line[k - 1].clone().lerp(line[k], q / 4);
        for (const j of near(p)) {
          if (forkAt(channel, j * step)) continue;
          const a = samples[j]; const b = samples[j + 1];
          if (Math.abs(p.y - ((a.pos.y + b.pos.y) / 2 + topAt(j))) > 1.5) continue; // (another level: a bridge)
          const t = flat(new Vector3().subVectors(b.pos, a.pos));
          const len = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
          const d = new Vector3(p.x - a.pos.x, 0, p.z - a.pos.z);
          const along = d.dot(t);
          if (along < 0 || along > len) continue;
          const over = Math.min(lipAt(j), lipAt(j + 1)) - (Math.abs(d.dot(flat(a.side))) - half);
          if (over > margin && over > worst) { worst = over; at = j * step; }
        }
      }
      if (worst > 0) found.push({ line: n, k, s: at, depth: worst });
    }
  });
  return found;
}
