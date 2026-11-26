/**
 * The channel check (Moses, 3 Nov 2026: on Saint-Tropez the land showed inside the channel, the marbles
 * rolling through grass). The ground check (groundCheck.js) looks just OUTSIDE the walls, for ground too
 * LOW (wall showing); nothing looked INSIDE the channel for ground too HIGH. This does: at every sample,
 * across the whole U of the channel (a splitter's two Us; a loop's path where it runs near the ground),
 * it finds the drawn ground (terrain, banks, water: every mesh marked userData.ground) straight above
 * each point of the running surface and flags any that rises above it, up to CLEAR metres over the rims
 * (higher than that is something passing well overhead, not land in the channel).
 */
import { Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius, loopAt } from '../iceChannel';

export const INTRUDE_LIMIT = 0.05; // metres the ground may stand above the running surface (rounding)
const CLEAR = 3;                   // metres over the rims: ground higher than this is overhead, not in the channel
const CELL = 3;                    // metres: the grid the ground's triangles are sorted into

/** The ground meshes' triangles, sorted into a grid on the plan, and a height lookup: all ground heights at x, z. */
export function groundIndex(meshes) {
  const cells = new Map();
  const tris = [];
  const v = new Vector3();
  for (const m of meshes) {
    m.updateMatrixWorld(true);
    const pos = m.geometry.getAttribute('position');
    if (!pos) continue;
    const index = m.geometry.index;
    const count = index ? index.count : pos.count;
    const pt = (k) => v.fromBufferAttribute(pos, index ? index.getX(k) : k).applyMatrix4(m.matrixWorld).toArray();
    for (let k = 0; k + 2 < count; k += 3) {
      const t = [pt(k), pt(k + 1), pt(k + 2)];
      const n = tris.length;
      tris.push(t);
      const x0 = Math.floor(Math.min(t[0][0], t[1][0], t[2][0]) / CELL); const x1 = Math.floor(Math.max(t[0][0], t[1][0], t[2][0]) / CELL);
      const z0 = Math.floor(Math.min(t[0][2], t[1][2], t[2][2]) / CELL); const z1 = Math.floor(Math.max(t[0][2], t[1][2], t[2][2]) / CELL);
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4000) continue; // (a sheet over the whole world, the sea: never above the track)
      for (let a = x0; a <= x1; a += 1) for (let b = z0; b <= z1; b += 1) {
        const key = `${a},${b}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(n);
      }
    }
  }
  return {
    /** Every height of the drawn ground at x, z. */
    heightsAt(x, z) {
      const out = [];
      for (const n of cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? []) {
        const [a, b, c] = tris[n];
        const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
        if (Math.abs(d) < 1e-9) continue;
        const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
        const w = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
        const t = 1 - u - w;
        if (u < -1e-6 || w < -1e-6 || t < -1e-6) continue;
        out.push(u * a[1] + w * b[1] + t * c[1]);
      }
      return out;
    },
  };
}

/** The running surface's points at sample i: [{ x, z, y, top, off }] across the U (top: the rims' height). */
function surfacePoints(centerline, channel, i) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const s = samples[i];
  const sArc = i * step;
  const L = channel.loops?.length ? loopAt(channel, sArc) : null;
  const R = channelRadiusAt(channel, sArc);
  const out = [];
  const across = (c, side, r, lip) => {
    const top = c.y + r * (1 - Math.cos(lip));
    for (let k = -6; k <= 6; k += 1) {
      const th = (k / 6) * lip * 0.98;
      const p = c.clone().addScaledVector(side, r * Math.sin(th));
      out.push({ x: p.x, z: p.z, y: c.y + r * (1 - Math.cos(th)), top, off: r * Math.sin(th) });
    }
  };
  if (L) {
    // A loop's own path is drawn here, not the channel: its stretches near the ground under this sample.
    const sh = L.shape;
    const f = sArc - L.s0;
    for (let k = 0; k <= sh.n; k += 1) {
      if (sh.z[k] > 2 || Math.abs(sh.f[k] - f) > step * 0.5) continue;
      across(L.pos[k], new Vector3(L.across[k].x, 0, L.across[k].z).normalize(), R, channel.maxAngle);
    }
    return out;
  }
  const side = new Vector3(s.side.x, 0, s.side.z).normalize();
  const fork = forkAt(channel, sArc);
  if (fork) {
    for (const b of [-1, 1]) across(s.pos.clone().addScaledVector(side, b * forkOffset(fork, sArc)), side, forkRadius(fork, channel.radius, sArc), channel.maxAngle);
  } else across(s.pos, side, R, channelLipAt(channel, sArc));
  return out;
}

/**
 * Where the drawn ground rises into the channel: [{ p, s, section, depth, off }] per sample with any
 * (depth: metres the ground stands over the running surface at its worst point; off: metres aside, + left).
 */
export function channelIntrusions(centerline, channel, track, ground) {
  const index = groundIndex(ground);
  const { segments } = centerline;
  const step = channel.arc / segments;
  const sections = track?.physics?.kit?.sections ?? track?.sections ?? [];
  const out = [];
  for (let i = 0; i <= segments; i += 1) {
    let worst = null;
    for (const pt of surfacePoints(centerline, channel, i)) {
      for (const y of index.heightsAt(pt.x, pt.z)) {
        const depth = y - pt.y;
        if (depth > INTRUDE_LIMIT && y < pt.top + CLEAR && (!worst || depth > worst.depth)) worst = { depth, off: pt.off };
      }
    }
    if (worst) {
      const p = i / segments;
      out.push({ p, s: i * step, section: sections.find((x) => p >= x.from && p <= x.to)?.name ?? null, ...worst });
    }
  }
  return out;
}

/** Runs of samples with ground in the channel: [{ from, metres, worst, sections }]. */
export function intrusionStretches(hits) {
  const runs = [];
  for (const h of hits) {
    const last = runs[runs.length - 1];
    if (last && h.s - last.s1 < 3) {
      last.s1 = h.s; last.worst = Math.max(last.worst, h.depth);
      if (h.section && !last.sections.includes(h.section)) last.sections.push(h.section);
    } else runs.push({ s0: h.s, s1: h.s, from: h.p, worst: h.depth, sections: h.section ? [h.section] : [] });
  }
  return runs.map((r) => ({ from: r.from, metres: Math.round(r.s1 - r.s0) + 1, worst: r.worst, sections: r.sections }));
}
