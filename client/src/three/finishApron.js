import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial } from 'three';
import banners from '../shared/trackBanners.json';
import { KERB_COLORS } from './iceChannel';
import { PEN_DROP } from './marbles';

/**
 * The finish apron (Moses, 2 Nov 2026; looks only): where a kit track's channel meets its catch area.
 *
 * - The flare: the channel's U opens out into the catch area's flat floor over FLARE.length metres, like
 *   the end of a ramp. Its shape is the one the finishers are drawn on (marbles.js: a finisher glides down
 *   off the wall it crossed the line on over its first 3 metres in the catch area), so no marble sinks
 *   into it or floats over it.
 * - The cheeks: on both sides, the channel's walls (higher than the catch area's) come down smoothly to the
 *   catch area's walls over FLARE.cheek metres, with a padded, bevelled top. They close the bare gaps where
 *   the channel's open end met the lower box.
 * - Dressed by series: chequered (Grand Prix) or red-and-white kerbs (World Tour, Coasters, Pinball, Arcade,
 *   Blocks); on Canyons, Rivers, Peaks, Track and Field (and anything else) two tones of the scenery's ground.
 *
 * Built as plain-coloured meshes, so TrackScene's mergeByMaterial bakes them into the finish's one mesh:
 * no draw call of its own. In the catch area's frame: x across, y up, z down the catch area from the line.
 */
export const FLARE = { length: 3, cheek: 4.5, across: 16, along: 8, tile: 0.75, pad: 0.18 };
const KERB_SERIES = new Set(['World Tour', 'Coasters', 'Pinball', 'Arcade', 'Blocks']);
const CHEQUER = { a: '#1d1f24', b: '#f4f4f2' };

const smooth = (k) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

/** The apron's look for a track: 'chequer', 'kerb' or 'scenery', and its two colours. */
export function apronStyle(slug, groundColor = '#9b9b97') {
  const series = banners.banners?.[slug]?.series ?? null;
  if (series === 'Grand Prix') return { kind: 'chequer', series, ...CHEQUER };
  if (KERB_SERIES.has(series)) return { kind: 'kerb', series, a: KERB_COLORS.kerbA, b: KERB_COLORS.kerbB };
  const ground = new Color(groundColor);
  return { kind: 'scenery', series, a: `#${ground.clone().multiplyScalar(0.8).getHexString()}`, b: `#${ground.clone().lerp(new Color('#ffffff'), 0.35).getHexString()}` };
}

/**
 * The apron's meshes. `radius`, `lip` (radians): the channel's at the line; `pen`: { halfWidth };
 * `wall`: { height, thickness } of the catch area's walls; `floor`: the catch area floor's colour.
 */
export function buildFinishApron({ radius, lip, pen, wall, floor, style }) {
  const group = new Group();
  group.name = 'finish apron';
  const buckets = new Map(); // colour → positions
  const tri = (colour, a, b, c) => {
    if (!buckets.has(colour)) buckets.set(colour, []);
    buckets.get(colour).push(...a, ...b, ...c);
  };
  // Both faces of each quad (a few hundred triangles more), so it reads from every side and stays a plain
  // front-side material that mergeByMaterial can bake.
  const quad = (colour, a, b, c, d) => { tri(colour, a, b, c); tri(colour, a, c, d); tri(colour, a, c, b); tri(colour, a, d, c); };
  const hw = pen.halfWidth;
  const dropAt = (z) => -z * PEN_DROP;

  // The flare: the U at the line (height R(1 − cos θ) at x = R sin θ) easing down to the flat floor.
  const thMax = Math.min(lip, Math.asin(Math.min(1, hw / radius)));
  const height = (th, z) => radius * (1 - Math.cos(th)) * (1 - smooth(z / FLARE.length));
  const point = (th, z) => [radius * Math.sin(th), height(th, z) + dropAt(z) + 0.01, z];
  const { across, along } = FLARE;
  for (let j = 0; j < along; j += 1) {
    const z0 = (FLARE.length * j) / along;
    const z1 = (FLARE.length * (j + 1)) / along;
    for (let i = 0; i < across; i += 1) {
      const t0 = -thMax + (2 * thMax * i) / across;
      const t1 = -thMax + (2 * thMax * (i + 1)) / across;
      // The outermost strip either side is the apron's edge (its pattern); the rest the floor's colour.
      const edge = i === 0 || i === across - 1;
      const colour = edge ? ((j % 2 === 0) !== (i === 0) ? style.a : style.b) : floor;
      quad(colour, point(t0, z0), point(t0, z1), point(t1, z1), point(t1, z0));
    }
  }

  // The cheeks: from the channel's lip height at the line down to the catch area's wall, padded on top.
  const lipTop = radius * (1 - Math.cos(lip));
  const steps = Math.max(2, Math.round(FLARE.cheek / FLARE.tile));
  const topAt = (z) => wall.height + Math.max(0, lipTop - wall.height) * (1 - smooth(z / FLARE.cheek));
  for (const s of [-1, 1]) {
    const xi = s * hw;                       // the catch area's inside wall
    const xo = s * (hw + wall.thickness);    // its outside
    const pad = s * FLARE.pad;               // the bevel of the padded top
    const base = (z) => wall.height - 0.05 + dropAt(z);
    for (let k = 0; k < steps; k += 1) {
      const z0 = (FLARE.cheek * k) / steps;
      const z1 = (FLARE.cheek * (k + 1)) / steps;
      const y0 = topAt(z0) + dropAt(z0);
      const y1 = topAt(z1) + dropAt(z1);
      const tile = style.kind === 'chequer' ? null : (k % 2 === 0 ? style.a : style.b);
      // Inner face (towards the marbles), outer face, the bevels and the flat top.
      const inner = tile ?? (k % 2 === 0 ? style.a : style.b);
      const outer = tile ?? (k % 2 === 0 ? style.b : style.a);
      quad(inner, [xi, base(z0), z0], [xi, y0 - FLARE.pad, z0], [xi, y1 - FLARE.pad, z1], [xi, base(z1), z1]);
      quad(outer, [xo, base(z0), z0], [xo, base(z1), z1], [xo, y1 - FLARE.pad, z1], [xo, y0 - FLARE.pad, z0]);
      quad(inner, [xi, y0 - FLARE.pad, z0], [xi + pad, y0, z0], [xi + pad, y1, z1], [xi, y1 - FLARE.pad, z1]);
      quad(outer, [xo, y0 - FLARE.pad, z0], [xo, y1 - FLARE.pad, z1], [xo - pad, y1, z1], [xo - pad, y0, z0]);
      const top = style.kind === 'chequer' ? (k % 2 === 0 ? style.a : style.b) : inner;
      quad(top, [xi + pad, y0, z0], [xo - pad, y0, z0], [xo - pad, y1, z1], [xi + pad, y1, z1]);
    }
    // Its end towards the channel, closing the channel's open end down to the catch area's wall.
    const y0 = topAt(0);
    quad(style.a, [xi, base(0) - 1.6, 0], [xo, base(0) - 1.6, 0], [xo, y0 - FLARE.pad, 0], [xi, y0 - FLARE.pad, 0]);
    quad(style.a, [xi, y0 - FLARE.pad, 0], [xo, y0 - FLARE.pad, 0], [xo - pad, y0, 0], [xi + pad, y0, 0]);
  }

  const materials = new Map();
  for (const [colour, list] of buckets) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(list, 3));
    g.computeVertexNormals();
    if (!materials.has(colour)) materials.set(colour, new MeshLambertMaterial({ color: colour, side: 0 }));
    const mesh = new Mesh(g, materials.get(colour));
    mesh.name = 'finish apron';
    group.add(mesh);
  }
  return group;
}
