/**
 * The bridges a Rivers track runs under (a section's `overhead`), high over the track (at least
 * SPAN_CLEAR metres over every stretch they cross, so the follow camera and every marble pass far
 * below). Looks only.
 *   chain-bridge:        a chain bridge laid along the section, its piers standing in the river and
 *                        beside the track (never in it): the field weaves between them; two towers,
 *                        the chains sagging between them, lamps along the deck (lit at night).
 *   steel-arch-bridge:   a steel arch crossing the track square at the section's middle, from bank to
 *                        bank, the deck on struts over it.
 *   cable-stayed-bridge: a long deck crossing the track square, held by fans of cables from one tall
 *                        pylon standing well clear of the track.
 */
import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshLambertMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { merge, piece } from './parts';

const SPAN_CLEAR = 18; // metres over the track's rim, at the lowest
const PIER_CLEAR = 9;  // metres from any stretch's middle to a pier's side
export const RIVER_SPAN_KINDS = ['chain-bridge', 'steel-arch-bridge', 'cable-stayed-bridge'];

function beam(a, b, t, colour, t2 = t) {
  const dir = new Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new Matrix4().compose(new Vector3().addVectors(a, b).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize()), new Vector3(1, 1, 1));
  return piece(new BoxGeometry(t, t2, len), colour, m);
}

/**
 * The bridges of a Rivers track: { group, spots, glow } (spots: places kept clear of trees; glow: lamps).
 * river: makeRiver's; groundAt: the land; corridor: the track's.
 */
export function buildRiverSpans(centerline, channel, kit, { river, groundAt, corridor, lite = false }) {
  const { samples, segments } = centerline;
  const group = new Group();
  group.name = 'river: bridges';
  const parts = [];
  const lines = [];
  const spots = [];
  const glow = [];
  const night = ['night', 'fireworks-night'].includes(kit.lighting);
  // The highest track (rim) within `r` metres of a point on the plan, anywhere along the track.
  const trackTopNear = (x, z, r) => {
    let top = -Infinity;
    for (let i = 0; i <= segments; i += 2) {
      const p = samples[i].pos;
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < r * r) top = Math.max(top, p.y + 1.6);
    }
    return top;
  };
  // Is a spot on the plan clear of every stretch (its middle at least `r` metres away)?
  const clear = (x, z, r) => {
    for (let i = 0; i <= segments; i += 1) {
      const p = samples[i].pos;
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < r * r) return false;
    }
    return true;
  };
  const ctx = { parts, lines, spots, glow, groundAt, corridor, lite, night, river, trackTopNear, clear };
  for (const sec of kit.sections ?? []) {
    for (const kind of sec.overhead ?? []) {
      if (!RIVER_SPAN_KINDS.includes(kind)) continue;
      const i0 = Math.round(sec.from * segments);
      const i1 = Math.round(sec.to * segments);
      const im = Math.round(((sec.from + sec.to) / 2) * segments);
      if (kind === 'chain-bridge') chainBridge({ ...ctx, a: samples[i0].pos, b: samples[i1].pos });
      else {
        const s = samples[im];
        const side = new Vector3(s.side.x, 0, s.side.z).normalize();
        (kind === 'steel-arch-bridge' ? steelArch : cableStayed)({ ...ctx, s, side, along: new Vector3(s.tangent.x, 0, s.tangent.z).normalize() });
      }
    }
  }
  // (On a phone the cables are thin beams in the bridges' one mesh: one draw call fewer.)
  if (lite) {
    for (let k = 0; k < lines.length; k += 6) parts.push(beam(new Vector3(lines[k], lines[k + 1], lines[k + 2]), new Vector3(lines[k + 3], lines[k + 4], lines[k + 5]), 0.12, '#2a2c30'));
    lines.length = 0;
  }
  if (parts.length) {
    const mesh = new Mesh(merge(parts), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mesh.name = 'river bridges';
    mesh.userData.built = true;
    group.add(mesh);
  }
  if (lines.length) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(lines, 3));
    const l = new LineSegments(g, new LineBasicMaterial({ color: '#2a2c30' }));
    l.name = 'river bridge cables';
    group.add(l);
  }
  return { group, spots, glow };
}

/** A pier from the land (or the river's bed; or from `from`) up to `top`, square, `w` wide. */
function pier(parts, groundAt, p, top, w, colour, from = null) {
  const y0 = from ?? groundAt(p.x, p.z) - 1;
  const h = Math.max(1, top - y0);
  parts.push(piece(new BoxGeometry(w, h, w), colour, new Matrix4().makeTranslation(p.x, y0 + h / 2, p.z)));
}

/** A chain bridge along a section: its deck on the line from the section's start to its end, high over it. */
function chainBridge({ a, b, parts, lines, spots, glow, groundAt, lite, night, trackTopNear, clear }) {
  const dir = new Vector3(b.x - a.x, 0, b.z - a.z);
  const len = dir.length();
  dir.normalize();
  const across = new Vector3(-dir.z, 0, dir.x);
  // (Out past both ends of the section, to stand its towers on the banks.)
  const ext = 18;
  const A = new Vector3(a.x, 0, a.z).addScaledVector(dir, -ext);
  const B = new Vector3(b.x, 0, b.z).addScaledVector(dir, ext);
  const L = len + ext * 2;
  // The deck: level, SPAN_CLEAR over the highest stretch anywhere under it.
  let top = -Infinity;
  for (let t = 0; t <= L; t += 6) {
    const p = A.clone().addScaledVector(dir, t);
    top = Math.max(top, trackTopNear(p.x, p.z, 12));
  }
  const deckY = top + SPAN_CLEAR;
  const STONE = '#c9c1b0';
  const IRON = '#3d4a3f';
  const deckW = 13;
  // The deck in pieces of 6 m, with railings.
  for (let t = 0; t < L; t += 6) {
    const p = A.clone().addScaledVector(dir, t + 3);
    const m = new Matrix4().compose(new Vector3(p.x, deckY, p.z), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir), new Vector3(1, 1, 1));
    parts.push(piece(new BoxGeometry(deckW, 1, 6.1), '#6b6a66', m));
    for (const k of [1, -1]) {
      const r = p.clone().addScaledVector(across, k * deckW * 0.5);
      parts.push(beam(new Vector3(r.x - dir.x * 3, deckY + 1.2, r.z - dir.z * 3), new Vector3(r.x + dir.x * 3, deckY + 1.2, r.z + dir.z * 3), 0.15, IRON));
    }
  }
  // Two stone towers (arched gateways) at the ends, the chains hung from their tops.
  const towerH = 16;
  const towers = [A.clone().addScaledVector(dir, 4), B.clone().addScaledVector(dir, -4)];
  for (const t of towers) {
    for (const k of [1, -1]) {
      const leg = t.clone().addScaledVector(across, k * (deckW * 0.5 + 1.8));
      if (clear(leg.x, leg.z, PIER_CLEAR - 1)) pier(parts, groundAt, leg, deckY + towerH, 3, STONE);
      else pier(parts, groundAt, leg.clone().setY(0), deckY + towerH, 3, STONE, deckY - 1); // (over the track: from the deck up only)
    }
    const lintel = new Matrix4().compose(new Vector3(t.x, deckY + towerH - 1.5, t.z), new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), across), new Vector3(1, 1, 1));
    parts.push(piece(new BoxGeometry(deckW + 6, 3, 3.2), STONE, lintel));
    spots.push({ x: t.x, z: t.z, r: 10 });
  }
  // The chains: from tower top to tower top, sagging to the deck in the middle, hangers down to the deck.
  for (const k of [1, -1]) {
    const pts = [];
    const n = lite ? 10 : 20;
    for (let q = 0; q <= n; q += 1) {
      const f = q / n;
      const p = towers[0].clone().lerp(towers[1], f).addScaledVector(across, k * deckW * 0.5);
      p.y = deckY + 2 + (towerH - 3) * (2 * f - 1) ** 2;
      pts.push(p);
    }
    for (let q = 0; q < pts.length - 1; q += 1) parts.push(beam(pts[q], pts[q + 1], 0.5, IRON));
    for (let q = 1; q < pts.length - 1; q += lite ? 2 : 1) lines.push(pts[q].x, pts[q].y, pts[q].z, pts[q].x, deckY + 0.5, pts[q].z);
  }
  // Piers between the towers, in the river and beside the track (never in it): the field weaves between them.
  for (let t = 24; t < L - 20; t += 22) {
    const p = A.clone().addScaledVector(dir, t);
    if (!clear(p.x, p.z, PIER_CLEAR)) continue;
    pier(parts, groundAt, p, deckY - 0.5, 3.4, STONE);
    spots.push({ x: p.x, z: p.z, r: 5 });
  }
  // Lamps along the deck (lit at night).
  for (let t = 6; t < L; t += lite ? 24 : 12) {
    for (const k of [1, -1]) {
      const p = A.clone().addScaledVector(dir, t).addScaledVector(across, k * (deckW * 0.5 - 0.3));
      parts.push(piece(new CylinderGeometry(0.1, 0.12, 3, 4), IRON, new Matrix4().makeTranslation(p.x, deckY + 2, p.z)));
      const lamp = piece(new SphereGeometry(0.42, 6, 4), night ? '#ffd98a' : '#e8e2c8', new Matrix4().makeTranslation(p.x, deckY + 3.6, p.z));
      (night ? glow : parts).push(lamp);
    }
  }
}

/** A steel arch bridge crossing the track square, from bank to bank, its deck on struts over the arch. */
function steelArch({ s, side, along, parts, spots, groundAt, trackTopNear, clear }) {
  const reach = 75;
  let top = -Infinity;
  for (let d = -reach; d <= reach; d += 6) {
    const p = s.pos.clone().addScaledVector(side, d);
    top = Math.max(top, trackTopNear(p.x, p.z, 12));
  }
  const deckY = top + SPAN_CLEAR + 4;
  const STEEL = '#b9b4a6';
  const ends = [-1, 1].map((k) => { const p = s.pos.clone().addScaledVector(side, k * reach); p.y = groundAt(p.x, p.z); return p; });
  const spring = Math.max(ends[0].y, ends[1].y, top + 2);
  // The deck.
  const m = new Matrix4().compose(new Vector3(s.pos.x, deckY, s.pos.z), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), side), new Vector3(1, 1, 1));
  parts.push(piece(new BoxGeometry(10, 1.4, reach * 2 + 10), '#7a766c', m));
  // Two arch ribs, each 24 beams on a parabola from bank to bank, just under the deck at the top.
  for (const k of [1, -1]) {
    let prev = null;
    for (let q = 0; q <= 24; q += 1) {
      const f = q / 24;
      const d = -reach + 2 * reach * f;
      const p = s.pos.clone().addScaledVector(side, d).addScaledVector(along, k * 4);
      p.y = spring + (deckY - 2 - spring) * (1 - (2 * f - 1) ** 2);
      if (prev) parts.push(beam(prev, p, 1.6, STEEL, 1.2));
      // Struts from the arch up to the deck.
      if (q % 3 === 0 && deckY - p.y > 2) parts.push(beam(p, p.clone().setY(deckY - 0.7), 0.5, STEEL));
      prev = p;
    }
  }
  // Abutments on the banks (only where clear of the track).
  for (const e of ends) {
    if (!clear(e.x, e.z, PIER_CLEAR + 4)) continue;
    pier(parts, groundAt, e, deckY - 0.7, 6, '#8a857a');
    spots.push({ x: e.x, z: e.z, r: 8 });
  }
}

/** A cable-stayed bridge crossing the track square: one tall pylon on the far side, fans of cables to the deck. */
function cableStayed({ s, side, along, parts, lines, spots, groundAt, lite, trackTopNear, clear }) {
  const reach = 110;
  let top = -Infinity;
  for (let d = -reach; d <= reach; d += 6) {
    const p = s.pos.clone().addScaledVector(side, d);
    top = Math.max(top, trackTopNear(p.x, p.z, 12));
  }
  const deckY = top + SPAN_CLEAR + 6;
  const m = new Matrix4().compose(new Vector3(s.pos.x, deckY, s.pos.z), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), side), new Vector3(1, 1, 1));
  parts.push(piece(new BoxGeometry(14, 1.6, reach * 2), '#8f8b82', m));
  // The pylon: where clear of every stretch, on one side or the other.
  let pylon = null;
  for (const d of [62, -62, 80, -80, 45, -45]) {
    const p = s.pos.clone().addScaledVector(side, d);
    if (clear(p.x, p.z, 20)) { pylon = { p, d }; break; }
  }
  if (!pylon) return;
  const H = 58;
  const { p } = pylon;
  for (const k of [1, -1]) {
    const leg = p.clone().addScaledVector(along, k * 9);
    const foot = leg.clone();
    foot.y = groundAt(foot.x, foot.z) - 1;
    const head = p.clone().setY(deckY + H);
    parts.push(beam(foot, head, 2.4, '#d2cdc2'));
  }
  parts.push(beam(p.clone().addScaledVector(along, -7).setY(deckY - 0.6), p.clone().addScaledVector(along, 7).setY(deckY - 0.6), 1.6, '#d2cdc2'));
  spots.push({ x: p.x, z: p.z, r: 14 });
  // Fans of cables from the pylon's head to the deck, both ways along it.
  const head = p.clone().setY(deckY + H - 3);
  const n = lite ? 5 : 10;
  for (const end of [-reach, reach]) {
    for (let q = 1; q <= n; q += 1) {
      const d = pylon.d + (end - pylon.d) * (q / n) * 0.95;
      for (const k of [1, -1]) {
        const at = s.pos.clone().addScaledVector(side, d).addScaledVector(along, k * 6);
        lines.push(head.x, head.y, head.z, at.x, deckY + 0.6, at.z);
      }
    }
  }
}
