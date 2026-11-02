import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial } from 'three';
import banners from '../shared/trackBanners.json';
import { KERB_COLORS } from './iceChannel';
import { PEN_DROP } from './marbles';
import { ART as PINBALL_ART } from './scenery/pinball';
import { ART as ARCADE_ART } from './scenery/arcade';

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
 * - Dressed by series: chequered (Grand Prix); red-and-white kerbs (World Tour, Coasters, Blocks); the table's or
 *   cabinet's own neon glow and accent (Pinball, Arcade: their art's colours, as the scenery); on Canyons, Rivers,
 *   Peaks, Track and Field (and Winter Wonders, Classic, anything else) two tones of the scenery's ground.
 *
 * Built as plain-coloured meshes, so TrackScene's mergeByMaterial bakes them into the finish's one mesh:
 * no draw call of its own. In the catch area's frame: x across, y up, z down the catch area from the line.
 */
export const FLARE = { length: 3, cheek: 4.5, across: 16, along: 8, tile: 0.75, pad: 0.18, end: 0.22 };
const KERB_SERIES = new Set(['World Tour', 'Coasters', 'Blocks']);
const CHEQUER = { a: '#1d1f24', b: '#f4f4f2' };
// The catch area wall's top rim stands 5 cm proud of the wall either side and 6 cm above it (TrackScene:
// wallT + 0.1 wide, 0.12 tall, centred on the wall's top); the cheek is 1 cm bigger all round, so the two
// never share a face (no flicker) and the rim never pokes through.
const RIM = 0.06;
const RIM_TOP = 0.07;

const smooth = (k) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

/** The apron's look for a track: 'chequer', 'kerb', 'neon' or 'scenery', and its two colours. `kit`: the track's physics.kit. */
export function apronStyle(slug, groundColor = '#9b9b97', kit = null) {
  const series = banners.banners?.[slug]?.series ?? null;
  if (series === 'Grand Prix') return { kind: 'chequer', series, ...CHEQUER };
  if (series === 'Pinball' || kit?.pinball) {
    const c = PINBALL_ART[kit?.pinball?.art] ?? PINBALL_ART.manor;
    return { kind: 'neon', series: series ?? 'Pinball', a: c.glow, b: c.accent };
  }
  if (series === 'Arcade' || kit?.arcade) {
    const c = ARCADE_ART[kit?.arcade?.art] ?? ARCADE_ART['coin-op'];
    return { kind: 'neon', series: series ?? 'Arcade', a: c.glow, b: c.accent };
  }
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
  // (Out to the cheeks' inner faces, so its edge never pokes through them.)
  const thMax = Math.min(lip, Math.asin(Math.min(1, (hw - RIM) / radius)));
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
  // It comes down to a padded end FLARE.end above the wall's rim (a clean, rounded end rather than a
  // thin sliver fading into the rim).
  const low = wall.height + RIM_TOP + FLARE.end;
  const topAt = (z) => low + Math.max(0, lipTop - low) * (1 - smooth(z / FLARE.cheek));
  for (const s of [-1, 1]) {
    // (As wide as the catch area wall's top rim, which stands 5 cm proud of the wall either side: the rim
    // never pokes through the cheek, and the cheek ends flush with it.)
    const xi = s * (hw - RIM);               // the catch area's inside wall
    const xo = s * (hw + wall.thickness + RIM); // its outside
    const padAt = () => FLARE.pad; // the padded top's bevel
    // (It sits on the wall's rim: below that the wall shows, so nothing of the cheek stands in front of it.)
    const base = (z) => wall.height + RIM_TOP - 0.03 + dropAt(z);
    for (let k = 0; k < steps; k += 1) {
      const z0 = (FLARE.cheek * k) / steps;
      const z1 = (FLARE.cheek * (k + 1)) / steps;
      const y0 = topAt(z0) + dropAt(z0);
      const y1 = topAt(z1) + dropAt(z1);
      const tile = style.kind === 'chequer' ? null : (k % 2 === 0 ? style.a : style.b);
      // Inner face (towards the marbles), outer face, the bevels and the flat top.
      const inner = tile ?? (k % 2 === 0 ? style.a : style.b);
      const outer = tile ?? (k % 2 === 0 ? style.b : style.a);
      const p0 = padAt(z0);
      const p1 = padAt(z1);
      quad(inner, [xi, base(z0), z0], [xi, y0 - p0, z0], [xi, y1 - p1, z1], [xi, base(z1), z1]);
      quad(outer, [xo, base(z0), z0], [xo, base(z1), z1], [xo, y1 - p1, z1], [xo, y0 - p0, z0]);
      quad(inner, [xi, y0 - p0, z0], [xi + s * p0, y0, z0], [xi + s * p1, y1, z1], [xi, y1 - p1, z1]);
      quad(outer, [xo, y0 - p0, z0], [xo, y1 - p1, z1], [xo - s * p1, y1, z1], [xo - s * p0, y0, z0]);
      const top = style.kind === 'chequer' ? (k % 2 === 0 ? style.a : style.b) : inner;
      quad(top, [xi + s * p0, y0, z0], [xo - s * p0, y0, z0], [xo - s * p1, y1, z1], [xi + s * p1, y1, z1]);
    }
    // Its end towards the channel, closing the channel's open end down to the catch area's wall.
    // Its padded end, where it meets the wall's rim.
    const ze = FLARE.cheek;
    const ye = topAt(ze) + dropAt(ze);
    const pe = padAt(ze);
    const endTile = style.kind === 'chequer' ? style.b : (steps % 2 === 0 ? style.b : style.a);
    quad(endTile, [xi, base(ze), ze], [xo, base(ze), ze], [xo, ye - pe, ze], [xi, ye - pe, ze]);
    quad(endTile, [xi, ye - pe, ze], [xo, ye - pe, ze], [xo - s * pe, ye, ze], [xi + s * pe, ye, ze]);
    const y0 = topAt(0);
    const p0 = padAt(0);
    quad(style.a, [xi, wall.height - 1.6, 0], [xo, wall.height - 1.6, 0], [xo, y0 - p0, 0], [xi, y0 - p0, 0]);
    quad(style.a, [xi, y0 - p0, 0], [xo, y0 - p0, 0], [xo - s * p0, y0, 0], [xi + s * p0, y0, 0]);
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
