/**
 * What spans a canyon from rim to rim, high over the track (a section's
 * `overhead` on a canyon track): prayer flags strung across the gorge, a
 * concrete arch bridge, a timber railway trestle with a train on it, a
 * swaying footbridge on cables. Each crosses at the section's middle, square
 * to the track, and stays well above it (at least SPAN_CLEAR metres over the
 * rim, so the follow camera and every marble pass far below). Looks only.
 */
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshLambertMaterial, Quaternion, Vector3 } from 'three';
import { merge, piece } from './parts';

const UP = new Vector3(0, 1, 0);
const SPAN_CLEAR = 14; // metres over the track's rim, at the lowest
export const SPAN_KINDS = ['prayer-flags', 'arch-bridge', 'railway-trestle', 'suspension-bridge'];

/** A beam (box) of thickness t from a to b. */
function beam(a, b, t, colour, t2 = t) {
  const dir = new Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new Matrix4().compose(new Vector3().addVectors(a, b).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize()), new Vector3(1, 1, 1));
  return piece(new BoxGeometry(t, t2, len), colour, m);
}

/**
 * The spans of a canyon track: { group, spots } (spots: places kept clear of trees).
 * canyon: makeCanyon's; groundAt: the land; corridor: the track's (nothing may stand in it).
 */
export function buildCanyonSpans(centerline, kit, { canyon, groundAt, corridor, lite = false }) {
  const { samples, segments } = centerline;
  const group = new Group();
  group.name = 'canyon: spans';
  const parts = [];
  const lines = [];
  const spots = [];
  for (const sec of kit.sections ?? []) {
    for (const kind of sec.overhead ?? []) {
      if (!SPAN_KINDS.includes(kind)) continue;
      const i = Math.round(((sec.from + sec.to) / 2) * segments);
      const s = samples[i];
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
      const rimY = s.pos.y + 1.6;
      const reach = (k) => (canyon ? canyon.rimOut(i, k) : 40) + (kind === 'prayer-flags' ? 2 : 8);
      const end = (k) => {
        const p = s.pos.clone().addScaledVector(side, k * reach(k));
        p.y = groundAt(p.x, p.z);
        return p;
      };
      const [a, b] = [end(1), end(-1)];
      const deckY = Math.max(a.y, b.y, rimY + SPAN_CLEAR + (kind === 'prayer-flags' ? 10 : 0));
      const build = { 'prayer-flags': prayerFlags, 'arch-bridge': archBridge, 'railway-trestle': railwayTrestle, 'suspension-bridge': suspensionBridge }[kind];
      build({ a, b, deckY, along, side, s, i, parts, lines, spots, groundAt, corridor, canyon, lite, rimY });
    }
  }
  if (parts.length) {
    const mesh = new Mesh(merge(parts), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mesh.name = 'canyon spans';
    group.add(mesh);
  }
  if (lines.length) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(lines, 3));
    const l = new LineSegments(g, new LineBasicMaterial({ color: '#3a3330' }));
    l.name = 'canyon span cables';
    group.add(l);
  }
  return { group, spots };
}

/** Strings of prayer flags between poles on the two rims, fanning out, sagging between them. */
function prayerFlags({ a, b, deckY, along, parts, lines, spots, groundAt, lite }) {
  const COLOURS = ['#2f6fc4', '#f4f4f0', '#c43a2f', '#2f9a4a', '#f2c230'];
  const strings = lite ? 3 : 5;
  for (let k = 0; k < strings; k += 1) {
    const off = (k - (strings - 1) / 2) * 7;
    const pa = a.clone().addScaledVector(along, off);
    const pb = b.clone().addScaledVector(along, -off * 0.6);
    pa.y = groundAt(pa.x, pa.z);
    pb.y = groundAt(pb.x, pb.z);
    const topA = pa.clone().setY(Math.max(pa.y + 6, deckY + 4 - k));
    const topB = pb.clone().setY(Math.max(pb.y + 6, deckY + 4 - k));
    for (const [foot, top] of [[pa, topA], [pb, topB]]) {
      parts.push(beam(foot, top, 0.3, '#6a4a32'));
      spots.push({ x: foot.x, z: foot.z, r: 2 });
    }
    const n = Math.max(8, Math.round(topA.distanceTo(topB) / (lite ? 4 : 2.4)));
    const at = (u) => topA.clone().lerp(topB, u).addScaledVector(UP, -Math.sin(Math.PI * u) * 7);
    for (let m = 0; m < n; m += 1) {
      const p0 = at(m / n);
      const p1 = at((m + 1) / n);
      lines.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      if (m === 0) continue;
      const dir = new Vector3().subVectors(p1, p0).setY(0).normalize();
      const q = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir);
      parts.push(piece(new BoxGeometry(1.1, 1.3, 0.05), COLOURS[(m + k) % COLOURS.length], new Matrix4().compose(p0.clone().addScaledVector(UP, -0.7), q, new Vector3(1, 1, 1))));
    }
  }
}

/**
 * A concrete arch bridge: a long straight deck from rim to rim, carried on tall slender piers
 * over the plateau and the walls, and over the gorge itself by one great arch rising from the
 * wall feet (Tara River Spins' bridge, a stylised impression).
 */
function archBridge({ a, b, deckY, side, s, i, parts, spots, groundAt, corridor, canyon, lite }) {
  const CONCRETE = '#d9d5ca';
  const SHADE = '#b9b5aa';
  const pa = a.clone().setY(deckY);
  const pb = b.clone().setY(deckY);
  const half = pa.distanceTo(pb) / 2;
  const dir = new Vector3().subVectors(pb, pa).normalize();
  const along = new Vector3().crossVectors(dir, UP).normalize();
  // The deck and its parapets, and the approach decks out over the plateau either side.
  const ext = 40;
  const d0 = pa.clone().addScaledVector(dir, -ext);
  const d1 = pb.clone().addScaledVector(dir, ext);
  parts.push(beam(d0, d1, 9, CONCRETE, 1.4));
  for (const o of [-4.3, 4.3]) parts.push(beam(d0.clone().addScaledVector(along, o).addScaledVector(UP, 1), d1.clone().addScaledVector(along, o).addScaledVector(UP, 1), 0.35, SHADE, 1.1));
  // The great arch, from each wall's foot to the deck's middle (two ribs).
  const footD = (k) => (canyon ? (k === canyon.riverSign ? canyon.river.foot : 20) + 3 : 25);
  const floorY = canyon ? canyon.floorAt(i) : groundAt(s.pos.x, s.pos.z);
  const springA = s.pos.clone().addScaledVector(side, footD(1)).setY(floorY);
  const springB = s.pos.clone().addScaledVector(side, -footD(-1)).setY(floorY);
  const crown = deckY - 1.2;
  const archAt = (u) => springA.clone().lerp(springB, u).setY(floorY + (crown - floorY) * (1 - (2 * u - 1) ** 2));
  const N = lite ? 10 : 18;
  for (const o of [-3, 3]) {
    for (let k = 0; k < N; k += 1) parts.push(beam(archAt(k / N).addScaledVector(along, o), archAt((k + 1) / N).addScaledVector(along, o), 2.2, k % 2 ? CONCRETE : SHADE, 2.6));
  }
  // Spandrel columns from the arch up to the deck, and tall piers out over the walls and plateau.
  const span = springA.distanceTo(springB);
  for (let u = 0.1; u < 0.92; u += lite ? 0.2 : 0.1) {
    const p = archAt(u);
    if (crown - p.y < 2) continue;
    parts.push(beam(p, p.clone().setY(deckY - 0.7), 1.4, SHADE, 4));
  }
  for (const k of [1, -1]) {
    const base = k > 0 ? springA : springB;
    for (let d = 14; d < half - span / 2 + ext; d += 18) {
      const top = base.clone().addScaledVector(side, k * d).setY(deckY - 0.7);
      const foot = top.clone();
      foot.y = groundAt(foot.x, foot.z) - 0.5;
      if (top.y - foot.y < 2) continue;
      if (corridor?.inside(foot.x, foot.y + 1, foot.z, { margin: 2 })) continue;
      parts.push(beam(foot, top, 2.4, CONCRETE, 5));
      spots.push({ x: foot.x, z: foot.z, r: 4 });
    }
  }
  spots.push({ x: springA.x, z: springA.z, r: 5 }, { x: springB.x, z: springB.z, r: 5 });
}

/** A timber railway trestle across the gorge, its bents standing on the land below, a train crossing it. */
function railwayTrestle({ a, b, deckY, parts, spots, groundAt, corridor, lite }) {
  const WOOD = '#7a5434';
  const DARK = '#4f3622';
  const pa = a.clone().setY(deckY);
  const pb = b.clone().setY(deckY);
  const dir = new Vector3().subVectors(pb, pa).normalize();
  const along = new Vector3().crossVectors(dir, UP).normalize();
  const ext = 30;
  const d0 = pa.clone().addScaledVector(dir, -ext);
  const d1 = pb.clone().addScaledVector(dir, ext);
  parts.push(beam(d0, d1, 4.2, DARK, 0.9));
  for (const o of [-0.75, 0.75]) parts.push(beam(d0.clone().addScaledVector(along, o).addScaledVector(UP, 0.55), d1.clone().addScaledVector(along, o).addScaledVector(UP, 0.55), 0.14, '#3a3b40', 0.2));
  // The bents: every 9 m, posts splayed out to the land, cross-braced; none in the track.
  const len = d0.distanceTo(d1);
  for (let t = 0; t <= len; t += lite ? 13 : 9) {
    const top = d0.clone().addScaledVector(dir, t).addScaledVector(UP, -0.5);
    const landY = groundAt(top.x, top.z);
    const h = top.y - landY;
    if (h < 2) continue;
    const legs = [-1, 1].map((k) => {
      const ft = top.clone().addScaledVector(along, k * (1.8 + h * 0.12));
      ft.y = groundAt(ft.x, ft.z) - 0.3;
      return [top.clone().addScaledVector(along, k * 1.8), ft];
    });
    if (legs.some(([, ft]) => corridor?.inside(ft.x, ft.y + 1, ft.z, { margin: 3 }) || corridor?.inside(ft.x, (ft.y + top.y) / 2, ft.z, { margin: 3 }))) continue;
    for (const [tp, ft] of legs) parts.push(beam(tp, ft, 0.5, WOOD));
    const rungs = Math.max(1, Math.floor(h / 6));
    for (let r = 1; r <= rungs; r += 1) {
      const u = r / (rungs + 0.4);
      const l = legs[0][0].clone().lerp(legs[0][1], u);
      const rr = legs[1][0].clone().lerp(legs[1][1], u);
      parts.push(beam(l, rr, 0.3, WOOD));
      if (!lite) {
        const u0 = (r - 1) / (rungs + 0.4);
        parts.push(beam(legs[0][0].clone().lerp(legs[0][1], u0), rr, 0.22, DARK));
      }
    }
    spots.push({ x: legs[0][1].x, z: legs[0][1].z, r: 2.5 }, { x: legs[1][1].x, z: legs[1][1].z, r: 2.5 });
  }
  // The train: a locomotive and coaches, out on the trestle.
  const COACH = ['#b8322a', '#e8dcc0'];
  for (let k = 0; k < (lite ? 3 : 5); k += 1) {
    const c = d0.clone().lerp(d1, 0.35).addScaledVector(dir, k * 9.5).addScaledVector(UP, 0.6);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir);
    parts.push(piece(new BoxGeometry(2.8, 3, 9), k ? COACH[k % 2] : '#2a3a4a', new Matrix4().compose(c.clone().addScaledVector(UP, 1.8), q, new Vector3(1, 1, 1))));
    parts.push(piece(new BoxGeometry(3, 0.4, 9.2), '#2a2a2e', new Matrix4().compose(c.clone().addScaledVector(UP, 3.5), q, new Vector3(1, 1, 1))));
  }
}

/** A footbridge on steel cables across the gorge, sagging, its deck of planks, prayer flags on its handrails. */
function suspensionBridge({ a, b, deckY, parts, lines, spots, lite }) {
  const pa = a.clone().setY(deckY + 4);
  const pb = b.clone().setY(deckY + 4);
  const dir = new Vector3().subVectors(pb, pa).normalize();
  const along = new Vector3().crossVectors(dir, UP).normalize();
  const sag = 5;
  const n = lite ? 14 : 26;
  const deck = (u) => pa.clone().lerp(pb, u).addScaledVector(UP, -Math.sin(Math.PI * u) * sag - 4);
  for (const end of [a, b]) {
    for (const o of [-1.1, 1.1]) parts.push(beam(end.clone().addScaledVector(along, o).setY(Math.min(end.y, deckY) - 1), end.clone().addScaledVector(along, o).setY(deckY + 5.5), 0.5, '#5f6670'));
    spots.push({ x: end.x, z: end.z, r: 4 });
  }
  const COLOURS = ['#2f6fc4', '#f4f4f0', '#c43a2f', '#2f9a4a', '#f2c230'];
  for (let k = 0; k < n; k += 1) {
    const p0 = deck(k / n);
    const p1 = deck((k + 1) / n);
    parts.push(beam(p0, p1, 1.8, k % 2 ? '#8a6446' : '#7a5434', 0.15));
    for (const o of [-1, 1]) {
      const h0 = p0.clone().addScaledVector(along, o).addScaledVector(UP, 1.1);
      const h1 = p1.clone().addScaledVector(along, o).addScaledVector(UP, 1.1);
      lines.push(h0.x, h0.y, h0.z, h1.x, h1.y, h1.z, h0.x, h0.y, h0.z, h0.x, h0.y - 1.1, h0.z);
      if (k % 2 === 0) parts.push(piece(new BoxGeometry(0.05, 0.6, 0.5), COLOURS[(k / 2) % 5], new Matrix4().compose(h0.clone().addScaledVector(UP, -0.4), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir), new Vector3(1, 1, 1))));
    }
  }
}
