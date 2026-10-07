/**
 * Hills shaped around a track: the land follows the track's height, stays
 * just under the road where the track runs, rises in gentle banks beside it,
 * rolls into hills further out and falls into the water at the edges.
 * Pure maths for the heights (unit tested); one mesh to draw them.
 */
import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { TRACK_STYLE } from '../trackModel';
import { smoothstep } from './parts';

/** Smooth bumpy noise from a few sine waves (cheap, seed-free, no visible grid). */
function rolling(x, z) {
  return (
    Math.sin(x * 0.0085 + 1.3) * Math.cos(z * 0.0105 - 0.7) * 0.65
    + Math.sin((x + z) * 0.019 + 2.1) * 0.22
    + Math.cos((x - z) * 0.029 - 1.2) * 0.13
  );
}

/**
 * Returns heightAt(x, z) for ground around the track, plus helpers.
 * Options: hillHeight (m of extra rolling hills away from the track),
 * landRadius (m from the track where land gives way to water),
 * water(x, z) → 0..1 extra pull down into the water (e.g. a bay),
 * street: a channel built into the ground as a city street (San Francisco
 * rebuilt): { halfAt(i), liftAt(i) } per centre-line sample i, the channel's
 * half-width with its pavements, and the height of its pavements above the
 * floor (and optionally dip: metres beyond them the ground stays down, for
 * coarse ground). The ground then sits at pavement level right beside it, dips
 * under the channel itself, and blends into the hills further out.
 */
export function makeHeightField(centerline, laneCount, { hillHeight = 18, landRadius = 300, seaLevel = -1.2, water = () => 0, street = null } = {}, style = TRACK_STYLE) {
  const keep = centerline.samples.map((_, i) => i).filter((i) => i % 3 === 0 || i === centerline.samples.length - 1);
  const samples = keep.map((i) => centerline.samples[i]);
  const xs = samples.map((s) => s.pos.x);
  const zs = samples.map((s) => s.pos.z);
  const ys = samples.map((s) => s.pos.y);
  const halves = street ? keep.map((i) => street.halfAt(i)) : null;
  const lifts = street ? keep.map((i) => street.liftAt(i)) : null;
  const roadHalf = street ? Math.max(...halves.slice(Math.floor(halves.length * 0.1))) : (laneCount * style.laneWidth) / 2 + style.wallThickness;
  const flatTo = roadHalf + 14; // ground stays under the road this far out
  const capReach2 = (flatTo + 110) ** 2;

  function nearest(x, z) {
    let best = Infinity;
    for (let i = 0; i < xs.length; i += 1) {
      const d = (xs[i] - x) ** 2 + (zs[i] - z) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  // A street channel: pavement level beside it (from the nearby stretches, softly
  // blended where two pass close), under the floor beneath it, hills further out.
  function streetHeight(x, z, hills) {
    let wSum = 0;
    let hSum = 0;
    let best = Infinity;
    let bi = 0;
    for (let i = 0; i < xs.length; i += 1) {
      const d2 = (xs[i] - x) ** 2 + (zs[i] - z) ** 2;
      if (d2 < best) { best = d2; bi = i; }
      if (d2 > 90 * 90) continue;
      const w = 1 / (d2 + 25) ** 2;
      wSum += w;
      hSum += w * (ys[i] + lifts[i] - 0.25);
    }
    const d = Math.sqrt(best);
    const inner = halves[bi];
    const pavement = wSum ? hSum / wSum : ys[bi] + lifts[bi] - 0.25;
    const dip = street.dip ?? 0; // (coarse ground: stays down a little further out, under the street's stone walls)
    if (d < inner + dip) return ys[bi] - 2; // under the street: never through its floor
    const kerb = ys[bi] - 2 + (pavement - ys[bi] + 2) * smoothstep(inner + dip, inner + dip + 5, d);
    return kerb + (hills - kerb) * smoothstep(inner + 40, inner + 160, d);
  }

  function heightAt(x, z) {
    let wSum = 0;
    let hSum = 0;
    let best = Infinity;
    let floorBelow = Infinity; // lowest road within flatTo
    for (let i = 0; i < xs.length; i += 1) {
      const dx = xs[i] - x;
      const dz = zs[i] - z;
      const d2 = dx * dx + dz * dz;
      const t = d2 + 400;
      const w = 1 / (t * Math.sqrt(t));
      wSum += w;
      hSum += w * ys[i];
      if (d2 < best) best = d2;
      if (d2 < capReach2) {
        // Beside the road the ground may rise above it by at most half the distance to it (gentle banks).
        const d = Math.sqrt(d2);
        const cap = ys[i] - 1 + Math.max(0, d - flatTo) * 0.5;
        if (cap < floorBelow) floorBelow = cap;
      }
    }
    const r = Math.sqrt(best);
    let h = hSum / wSum - 2 + hillHeight * rolling(x, z) * smoothstep(flatTo, flatTo + 120, r);
    if (street) h = streetHeight(x, z, h);
    else h = Math.min(h, floorBelow);
    // Out at the edges, and wherever the theme puts water, the land sinks into the sea.
    const sink = Math.max(smoothstep(landRadius * 0.7, landRadius, r), water(x, z));
    return h + (seaLevel - 6 - h) * sink;
  }

  /** Metres clear of the road's (or street channel's) edge at a spot (negative: on it). */
  function clearance(x, z) {
    if (!street) return nearest(x, z) - roadHalf;
    let best = Infinity;
    for (let i = 0; i < xs.length; i += 1) best = Math.min(best, Math.hypot(xs[i] - x, zs[i] - z) - halves[i]);
    return best;
  }

  return { heightAt, nearest, clearance, roadHalf };
}

/**
 * One terrain mesh over the track's surroundings, coloured by height and
 * steepness: sand at the waterline, gold-green grass, dry golden hilltops.
 */
export function buildTerrainGeometry(field, bounds, { cells = 96, colors } = {}) {
  return buildTerrain(field, bounds, { cells, colors }).geometry;
}

/**
 * The terrain mesh plus groundAt(x, z): the height of the drawn surface itself
 * (cheap, and things placed with it sit exactly on what you see).
 * tiles > 1 also cuts it into tiles × tiles pieces (`geometries`), so a camera
 * down among the streets only draws the ground in front of it.
 */
export function buildTerrain(field, bounds, { cells = 96, colors, tiles = 1 } = {}) {
  const { minX, maxX, minZ, maxZ } = bounds;
  const n = cells + 1;
  const heights = new Float32Array(n * n);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      heights[j * n + i] = field.heightAt(minX + ((maxX - minX) * i) / cells, minZ + ((maxZ - minZ) * j) / cells);
    }
  }
  const C = {
    sand: new Color(colors?.sand ?? '#e6cf98'),
    grass: new Color(colors?.grass ?? '#9fb35c'),
    dry: new Color(colors?.dry ?? '#c4b46a'),
    shade: new Color(colors?.shade ?? '#7f9a4c'),
  };
  const top = Math.max(...heights);
  const c = new Color();
  const at = (i, j) => [minX + ((maxX - minX) * i) / cells, heights[j * n + i], minZ + ((maxZ - minZ) * j) / cells];
  const piece = (i0, i1, j0, j1) => {
    const positions = [];
    const colorList = [];
    for (let j = j0; j < j1; j += 1) {
      for (let i = i0; i < i1; i += 1) {
        const a = at(i, j); const b = at(i + 1, j); const d = at(i, j + 1); const e = at(i + 1, j + 1);
        for (const tri of [[a, d, b], [b, d, e]]) {
          const y = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
          const steep = Math.max(...tri.map((p) => p[1])) - Math.min(...tri.map((p) => p[1]));
          if (y < 0.3) c.copy(C.sand);
          else c.copy(C.grass).lerp(C.dry, Math.min(1, y / (top || 1)) * 0.9);
          if (steep > 6) c.lerp(C.shade, 0.35);
          for (const p of tri) { positions.push(...p); colorList.push(c.r, c.g, c.b); }
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(colorList, 3));
    g.computeVertexNormals();
    return g;
  };
  const cut = (k) => Math.round((cells * k) / tiles);
  const geometries = [];
  for (let tj = 0; tj < tiles; tj += 1) {
    for (let ti = 0; ti < tiles; ti += 1) geometries.push(piece(cut(ti), cut(ti + 1), cut(tj), cut(tj + 1)));
  }
  const g = geometries[0];

  const sx = cells / (maxX - minX);
  const sz = cells / (maxZ - minZ);
  function groundAt(x, z) {
    const fx = Math.min(cells - 1e-6, Math.max(0, (x - minX) * sx));
    const fz = Math.min(cells - 1e-6, Math.max(0, (z - minZ) * sz));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const h = (a, b) => heights[b * n + a];
    // Same split as the triangles above: (a, d, b) and (b, d, e).
    if (u + v <= 1) return h(i, j) + (h(i + 1, j) - h(i, j)) * u + (h(i, j + 1) - h(i, j)) * v;
    return h(i + 1, j + 1) + (h(i, j + 1) - h(i + 1, j + 1)) * (1 - u) + (h(i + 1, j) - h(i + 1, j + 1)) * (1 - v);
  }
  return { geometry: g, geometries, groundAt };
}
