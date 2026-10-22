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
 *   bascule-bridge:      a raised bascule bridge crossing the track square: two stone towers either side of
 *                        the track (the field races between them), its two leaves raised upright beside them,
 *                        high walkways joining the towers' tops, chains slung out to the banks.
 *   river-suspension-bridge: a long deck crossing the track square, two tall towers well clear of the
 *                        track, the main cables sagging between them, hangers down to the deck.
 *   stone-arch-bridges:  five stone arch bridges crossing the section one after another, the track under one
 *                        arch of each, that arch's middle on alternating sides of the track.
 *   loading-gantry:      a port's gantry crane straddling the track: a leg frame either side, the girder high
 *                        across and out over the river, a trolley and a container hanging over the water.
 *   multi-span-bridge:   a long bridge of many girder spans on slim piers, across the river beside the
 *                        section (laid along it, clear of every stretch), level with the track.
 */
import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshLambertMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { merge, piece } from './parts';

const SPAN_CLEAR = 18; // metres over the track's rim, at the lowest
const PIER_CLEAR = 9;  // metres from any stretch's middle to a pier's side
export const RIVER_SPAN_KINDS = ['chain-bridge', 'steel-arch-bridge', 'cable-stayed-bridge', 'bascule-bridge', 'river-suspension-bridge', 'stone-arch-bridges', 'loading-gantry', 'multi-span-bridge'];

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
      const square = (i) => {
        const s = samples[i];
        return { s, side: new Vector3(s.side.x, 0, s.side.z).normalize(), along: new Vector3(s.tangent.x, 0, s.tangent.z).normalize() };
      };
      if (kind === 'chain-bridge') chainBridge({ ...ctx, a: samples[i0].pos, b: samples[i1].pos });
      else if (kind === 'multi-span-bridge') multiSpan({ ...ctx, samples, i0, i1 });
      else if (kind === 'stone-arch-bridges') {
        // (Five, evenly along the section, each crossing it square; the arch over the track alternately to its left and right.)
        for (let k = 0; k < 5; k += 1) stoneArches({ ...ctx, ...square(Math.round(i0 + (i1 - i0) * (0.1 + 0.2 * k))), shift: k % 2 ? -2.5 : 2.5 });
      } else {
        const build = { 'steel-arch-bridge': steelArch, 'cable-stayed-bridge': cableStayed, 'bascule-bridge': bascule, 'river-suspension-bridge': suspension, 'loading-gantry': gantry }[kind];
        build({ ...ctx, ...square(im) });
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

/** The highest rim within `reach` metres either side of s along `dir` (12 m round each point). */
function topAcross(s, dir, reach, trackTopNear) {
  let top = -Infinity;
  for (let d = -reach; d <= reach; d += 6) {
    const p = s.pos.clone().addScaledVector(dir, d);
    top = Math.max(top, trackTopNear(p.x, p.z, 12));
  }
  return top;
}
/** A box `w` long across the track (along `side`), `h` high, `d` deep (along the track), its middle at c. */
function sbox(parts, w, h, d, c, side, colour) {
  const yaw = Math.atan2(side.x, side.z);
  parts.push(piece(new BoxGeometry(d, h, w), colour, new Matrix4().makeRotationY(yaw).setPosition(c)));
}

/** A raised bascule bridge: two stone towers either side of the track, its leaves raised, walkways high between them. */
function bascule({ s, side, along, parts, lines, spots, groundAt, lite, night, glow, trackTopNear, clear }) {
  const STONE = '#d6ccb4';
  const STEEL = '#5f7f96';
  const off = 15; // metres from the track's middle to each tower's middle
  const W = 9;
  const top = topAcross(s, side, 40, trackTopNear);
  const hingeY = top - 1; // (the road's level: about the rims')
  const walkY = top + SPAN_CLEAR + 6;
  const towerTop = walkY + 6;
  for (const k of [1, -1]) {
    const c = s.pos.clone().addScaledVector(side, k * off);
    if (!clear(c.x, c.z, W / 2 + 6)) continue;
    const y0 = groundAt(c.x, c.z) - 2;
    sbox(parts, W, towerTop - y0, W, new Vector3(c.x, (towerTop + y0) / 2, c.z), side, STONE);
    sbox(parts, W + 1.4, 3, W + 1.4, new Vector3(c.x, y0 + 1.5, c.z), side, '#a89c84'); // the pier's foot
    // Tall windows, corner turrets, a steep pointed roof.
    for (let y = hingeY + 4; y < towerTop - 3; y += lite ? 10 : 5) for (const a of [-2, 2]) sbox(parts, 1, 2.8, W + 0.1, new Vector3(c.x, y, c.z).addScaledVector(side, a), side, '#3a4250');
    for (const [i, j] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      const t = c.clone().addScaledVector(side, i * (W / 2 - 0.7)).addScaledVector(along, j * (W / 2 - 0.7));
      sbox(parts, 1.6, 6, 1.6, new Vector3(t.x, towerTop + 3, t.z), side, STONE);
      parts.push(piece(new ConeGeometry(1.2, 3.6, 4), '#46586a', new Matrix4().makeTranslation(t.x, towerTop + 7.8, t.z)));
    }
    parts.push(piece(new ConeGeometry(W * 0.62, 10, 4), '#46586a', new Matrix4().makeRotationY(Math.atan2(side.x, side.z) + Math.PI / 4).setPosition(c.x, towerTop + 5, c.z)));
    // The leaf, raised almost upright from its hinge at the tower's inner face (never over the track).
    const hinge = s.pos.clone().addScaledVector(side, k * (off - W / 2 - 0.4));
    const lean = 0.12; // (out of the upright, towards the track)
    const L = 11;
    const tip = hinge.clone().addScaledVector(side, -k * L * Math.sin(lean)).setY(hingeY + L * Math.cos(lean));
    parts.push(beam(hinge.clone().setY(hingeY), tip, 1, STEEL, 8));
    for (const j of [-3.6, 3.6]) parts.push(beam(hinge.clone().setY(hingeY).addScaledVector(along, j), tip.clone().addScaledVector(along, j), 0.5, '#e8e0c8'));
    // The fixed span out to the bank, on the tower's far side, hung from chains off the tower top.
    const out = s.pos.clone().addScaledVector(side, k * (off + W / 2));
    const bank = s.pos.clone().addScaledVector(side, k * (off + 60));
    let fine = true;
    for (let d = 0; d <= 56; d += 8) { const p = out.clone().addScaledVector(side, k * d); if (!clear(p.x, p.z, 10)) fine = false; }
    if (fine) {
      parts.push(beam(out.clone().setY(hingeY), bank.clone().setY(hingeY), 1.2, '#7a7466', 11));
      const n = lite ? 6 : 12;
      let prev = null;
      for (let q = 0; q <= n; q += 1) {
        const f = q / n;
        const p = out.clone().lerp(bank, f).setY(hingeY + 2 + (towerTop - 6 - hingeY) * (1 - f) ** 2);
        if (prev) parts.push(beam(prev, p, 0.6, STEEL));
        if (q && q < n) lines.push(p.x, p.y, p.z, p.x, hingeY + 0.6, p.z);
        prev = p;
      }
      spots.push({ x: bank.x, z: bank.z, r: 8 });
    }
    spots.push({ x: c.x, z: c.z, r: W });
    if (night) for (const a of [-3, 3]) glow.push(piece(new SphereGeometry(0.5, 6, 4), '#ffd98a', new Matrix4().makeTranslation(c.x + along.x * a, walkY + 2.2, c.z + along.z * a)));
  }
  // The two high walkways between the towers' tops.
  for (const j of [-2.6, 2.6]) {
    const a = s.pos.clone().addScaledVector(side, off).addScaledVector(along, j).setY(walkY);
    const b = s.pos.clone().addScaledVector(side, -off).addScaledVector(along, j).setY(walkY);
    parts.push(beam(a, b, 2.4, STEEL, 3.2));
    parts.push(beam(a.clone().setY(walkY + 2.2), b.clone().setY(walkY + 2.2), 0.4, '#e8e0c8'));
  }
}

/** A suspension bridge across the track: two towers well clear of it, the main cables sagging to the deck. */
function suspension({ s, side, along, parts, lines, spots, groundAt, lite, trackTopNear, clear }) {
  const reach = 120;
  const top = topAcross(s, side, reach, trackTopNear);
  const deckY = top + SPAN_CLEAR + 3;
  sbox(parts, reach * 2, 1.8, 14, new Vector3(s.pos.x, deckY, s.pos.z), side, '#8a9a8a');
  sbox(parts, reach * 2, 0.5, 14.4, new Vector3(s.pos.x, deckY + 1.1, s.pos.z), side, '#5a6a5a');
  // The towers: at the first spots either side clear of every stretch.
  const at = [];
  for (const k of [1, -1]) {
    for (const d of [42, 55, 70, 88]) {
      const p = s.pos.clone().addScaledVector(side, k * d);
      if (clear(p.x, p.z, 16)) { at.push({ p, d: k * d }); break; }
    }
  }
  const H = 34;
  for (const { p } of at) {
    for (const j of [-6, 6]) {
      const leg = p.clone().addScaledVector(along, j);
      parts.push(beam(leg.clone().setY(groundAt(leg.x, leg.z) - 1), leg.clone().setY(deckY + H), 2.4, '#6a7a6c'));
    }
    for (const y of [deckY + H - 1, deckY + 12]) parts.push(beam(p.clone().addScaledVector(along, -6).setY(y), p.clone().addScaledVector(along, 6).setY(y), 1.6, '#6a7a6c'));
    spots.push({ x: p.x, z: p.z, r: 12 });
  }
  if (at.length < 2) return;
  // The main cables, one each side of the deck, sagging from tower top to tower top, and on out to the anchorages.
  const [A, B] = at[0].d < at[1].d ? [at[0], at[1]] : [at[1], at[0]];
  for (const j of [-6, 6]) {
    const n = lite ? 10 : 20;
    let prev = null;
    for (let q = 0; q <= n; q += 1) {
      const f = q / n;
      const d = A.d + (B.d - A.d) * f;
      const p = s.pos.clone().addScaledVector(side, d).addScaledVector(along, j).setY(deckY + 2 + (H - 3) * (2 * f - 1) ** 2);
      if (prev) parts.push(beam(prev, p, 0.7, '#3a4a3c'));
      if (q && q < n) lines.push(p.x, p.y, p.z, p.x, deckY + 0.9, p.z);
      prev = p;
    }
    for (const [T, end] of [[A, -reach], [B, reach]]) {
      const head = s.pos.clone().addScaledVector(side, T.d).addScaledVector(along, j).setY(deckY + H - 1);
      parts.push(beam(head, s.pos.clone().addScaledVector(side, end).addScaledVector(along, j).setY(deckY + 1), 0.7, '#3a4a3c'));
    }
  }
}

/** One stone arch bridge across the track: a row of round arches on piers, the track under the one at `shift` from its middle. */
function stoneArches({ s, side, along, parts, spots, groundAt, lite, trackTopNear, clear, shift }) {
  const STONE = '#d8cdb2';
  const SHADE = '#bfb196';
  const span = 26;
  const R = span / 2;
  const top = topAcross(s, side, 50, trackTopNear);
  const deckY = top + SPAN_CLEAR + 4;
  const spring = deckY - 2.2 - R;
  const depth = 11;
  const segs = lite ? 6 : 10;
  for (let k = -2; k <= 2; k += 1) {
    const c = shift + k * span; // the arch's middle, across the track
    // The arch ring and the spandrel walls over it, up to the deck.
    for (let q = 0; q < segs; q += 1) {
      const a0 = Math.PI * (q / segs);
      const a1 = Math.PI * ((q + 1) / segs);
      const x0 = c + R * Math.cos(a0);
      const x1 = c + R * Math.cos(a1);
      const y0 = spring + R * Math.sin(a0);
      const y1 = spring + R * Math.sin(a1);
      parts.push(beam(s.pos.clone().addScaledVector(side, x0).setY(y0), s.pos.clone().addScaledVector(side, x1).setY(y1), 1.6, SHADE, depth));
      const low = Math.max(y0, y1) + 0.6;
      if (deckY - low > 0.4) sbox(parts, Math.abs(x1 - x0) + 0.05, deckY - low, depth - 0.4, s.pos.clone().addScaledVector(side, (x0 + x1) / 2).setY((deckY + low) / 2), side, STONE);
    }
    // The pier between this arch and the next (from the river bed or the land), never in any stretch.
    if (k < 2) {
      const p = s.pos.clone().addScaledVector(side, c + R);
      if (clear(p.x, p.z, PIER_CLEAR + 1)) {
        const y0 = groundAt(p.x, p.z) - 1;
        sbox(parts, 3.2, spring + 0.6 - y0, depth + 1.2, new Vector3(p.x, (spring + 0.6 + y0) / 2, p.z), side, SHADE);
        parts.push(piece(new ConeGeometry(2.2, 3, 4), STONE, new Matrix4().makeTranslation(p.x, spring + 2, p.z)));
        spots.push({ x: p.x, z: p.z, r: 5 });
      }
    }
  }
  // The deck, its parapets and a row of lamps.
  const L = span * 5;
  sbox(parts, L, 1.2, depth + 1, s.pos.clone().addScaledVector(side, shift).setY(deckY - 0.4), side, '#a89c84');
  for (const j of [-1, 1]) sbox(parts, L, 1, 0.6, s.pos.clone().addScaledVector(side, shift).addScaledVector(along, j * (depth / 2 + 0.2)).setY(deckY + 0.6), side, STONE);
  for (let x = -L / 2 + 6; x < L / 2; x += lite ? 26 : 13) {
    for (const j of [-1, 1]) {
      const p = s.pos.clone().addScaledVector(side, shift + x).addScaledVector(along, j * (depth / 2 + 0.2));
      parts.push(piece(new CylinderGeometry(0.12, 0.16, 3.4, 4), '#2a3a30', new Matrix4().makeTranslation(p.x, deckY + 2.2, p.z)));
      parts.push(piece(new SphereGeometry(0.4, 6, 4), '#e8e2c8', new Matrix4().makeTranslation(p.x, deckY + 4, p.z)));
    }
  }
  for (const j of [-1, 1]) { const e = s.pos.clone().addScaledVector(side, shift + j * L / 2); spots.push({ x: e.x, z: e.z, r: 8 }); }
}

/** A port's gantry crane straddling the track: two leg frames, the girder high across and out over the river. */
function gantry({ s, side, along, parts, lines, spots, groundAt, trackTopNear, clear }) {
  const CRANE = '#f2b01e';
  const top = topAcross(s, side, 30, trackTopNear);
  const girderY = top + SPAN_CLEAR + 5;
  // (Out over the lower side: the river's.)
  const k = groundAt(s.pos.x + side.x * 40, s.pos.z + side.z * 40) <= groundAt(s.pos.x - side.x * 40, s.pos.z - side.z * 40) ? 1 : -1;
  let legs = 0;
  for (const sg of [1, -1]) {
    const c = s.pos.clone().addScaledVector(side, sg * 16);
    if (!clear(c.x, c.z, 10)) continue;
    legs += 1;
    for (const j of [-7, 7]) {
      const f = c.clone().addScaledVector(along, j);
      parts.push(beam(f.clone().setY(groundAt(f.x, f.z) - 0.5), f.clone().setY(girderY), 1.4, CRANE));
    }
    parts.push(beam(c.clone().addScaledVector(along, -7).setY(girderY - 6), c.clone().addScaledVector(along, 7).setY(girderY - 6), 0.9, CRANE));
    parts.push(piece(new BoxGeometry(3, 1.2, 16), '#3a3d44', new Matrix4().makeRotationY(Math.atan2(along.x, along.z)).setPosition(c.x, groundAt(c.x, c.z) + 0.6, c.z))); // the bogies on their rail
    spots.push({ x: c.x, z: c.z, r: 9 });
  }
  if (!legs) return;
  // The girder, out over the river on its side and back a little behind the other leg.
  const a = s.pos.clone().addScaledVector(side, -k * 24).setY(girderY);
  const b = s.pos.clone().addScaledVector(side, k * 52).setY(girderY);
  for (const j of [-2.4, 2.4]) parts.push(beam(a.clone().addScaledVector(along, j), b.clone().addScaledVector(along, j), 2, CRANE, 2.6));
  sbox(parts, 4, 3, 4, s.pos.clone().addScaledVector(side, k * 16).setY(girderY + 2.6), side, '#f2efe6'); // the cab
  // The trolley out over the water, a container hanging from it.
  const t = s.pos.clone().addScaledVector(side, k * 40);
  sbox(parts, 5, 1.6, 6, t.clone().setY(girderY + 1.4), side, '#3a3d44');
  for (const j of [-1.2, 1.2]) lines.push(t.x + along.x * j, girderY, t.z + along.z * j, t.x + along.x * j, girderY - 8, t.z + along.z * j);
  sbox(parts, 12, 2.6, 2.6, t.clone().setY(girderY - 9.4), side, '#2f6fa8');
}

/** A long bridge of many girder spans across the river beside a section: laid along it, clear of every stretch, level with it. */
function multiSpan({ samples, i0, i1, parts, spots, groundAt, lite, clear }) {
  const a = samples[i0].pos;
  const b = samples[i1].pos;
  const dir = new Vector3(b.x - a.x, 0, b.z - a.z);
  const len = dir.length();
  dir.normalize();
  const across = new Vector3(-dir.z, 0, dir.x);
  const ext = 70;
  const L = len + ext * 2;
  // (Beside the section, at the first offset where the whole bridge stays 14 m clear of every stretch.)
  let off = null;
  for (const o of [30, -30, 40, -40, 52, -52, 66, -66, 80, -80]) {
    let ok = true;
    for (let t = 0; t <= L && ok; t += 8) {
      const p = new Vector3(a.x, 0, a.z).addScaledVector(dir, t - ext).addScaledVector(across, o);
      if (!clear(p.x, p.z, 14)) ok = false;
    }
    if (ok) { off = o; break; }
  }
  if (off === null) return;
  const deckY = Math.max(a.y, b.y) + 2;
  const start = new Vector3(a.x, 0, a.z).addScaledVector(dir, -ext).addScaledVector(across, off);
  const spanL = 24;
  const n = Math.ceil(L / spanL);
  for (let q = 0; q <= n; q += 1) {
    const p0 = start.clone().addScaledVector(dir, Math.min(L, q * spanL)).setY(deckY);
    // A slim pier at each joint, from the river bed or the land.
    const y0 = groundAt(p0.x, p0.z) - 1;
    if (deckY - y0 > 2) {
      parts.push(beam(p0.clone().setY(y0), p0.clone().setY(deckY - 1), 2.4, '#c8c4bc', 7));
      parts.push(beam(p0.clone().setY(y0 + 0.4), p0.clone().setY(y0 + 2.4), 3.4, '#a8a49c', 8));
    }
    spots.push({ x: p0.x, z: p0.z, r: 5 });
    if (q === n) break;
    const p1 = start.clone().addScaledVector(dir, Math.min(L, (q + 1) * spanL)).setY(deckY);
    parts.push(beam(p0, p1, 9, '#9a2a24', 2.2)); // the girder (red), the deck on it
    parts.push(beam(p0.clone().setY(deckY + 1.3), p1.clone().setY(deckY + 1.3), 10, '#d8d4c8', 0.5));
    if (!lite) for (const j of [-1, 1]) parts.push(beam(p0.clone().addScaledVector(across, j * 4.6).setY(deckY + 2.2), p1.clone().addScaledVector(across, j * 4.6).setY(deckY + 2.2), 0.2, '#3a3d44'));
  }
}
