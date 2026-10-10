/**
 * Landmarks for the Marble Grand Prix tracks: one builder each, origin on the
 * ground, front facing +z, cartoon low-poly from a few simple shapes, merged
 * into the still scenery (a moving part, as `moving`, turned on the race
 * clock). Stylised impressions of each city, never detailed reproductions,
 * and our own fantasy worlds' landmarks.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { beam, box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const V = (x, y, z) => new Vector3(x, y, z);
const WATER = '#3f7fa8';

/** A flat pool of water (a disc), just above the ground. */
const pool = (r, colour = WATER, x = 0, z = 0) => piece(new CylinderGeometry(r, r, 0.3, 24), colour, M(x, 0.15, z));

/** A small motor yacht: white hull, a dark cabin band, a sun deck. */
function yacht(x, z, yaw = 0, s = 1) {
  return [
    piece(new BoxGeometry(3.2 * s, 1.4 * s, 11 * s), '#f4f4f2', turned(x, 0.7 * s, z, yaw)),
    piece(new ConeGeometry(1.6 * s, 3 * s, 4), '#f4f4f2', new Matrix4().makeRotationX(Math.PI / 2).premultiply(turned(x, 0.7 * s, z, yaw)).multiply(M(0, -6.5 * s, 0))),
    piece(new BoxGeometry(2.6 * s, 1.2 * s, 6 * s), '#e8e8e4', turned(x, 2 * s, z, yaw).multiply(M(0, 0, -1 * s))),
    piece(new BoxGeometry(2.7 * s, 0.5 * s, 5 * s), '#2c3440', turned(x, 2.1 * s, z, yaw).multiply(M(0, 0, -0.8 * s))),
  ];
}

// ── Dubai Marble Grand Prix ─────────────────────────────────────────────────

/** The Dubai Fountain: a long lake below the towers; its jets (the moving part) sweep to and fro. */
function dubaiFountain() {
  return merge([
    piece(new CylinderGeometry(26, 26, 0.3, 28), WATER, S(0, 0.15, 0, 1, 1, 0.45)),
    piece(new CylinderGeometry(26.6, 26.6, 0.6, 28, 1, true), '#d8d4cc', S(0, 0.3, 0, 1, 1, 0.46)),
  ]);
}
function fountainJets() {
  const parts = [];
  for (let k = 0; k < 11; k += 1) {
    const x = -18 + k * 3.6;
    const h = 8 + 9 * Math.sin((k / 10) * Math.PI);
    parts.push(piece(new CylinderGeometry(0.25, 0.6, h, 6), '#e8f6ff', M(x, h / 2, 0)));
    parts.push(piece(new IcosahedronGeometry(0.9, 0), '#f4fbff', M(x, h, 0)));
  }
  return merge(parts);
}

/** Dubai Marina: a basin of water with yachts moored along a quay, two slim towers behind. */
function marina() {
  const parts = [
    piece(new BoxGeometry(46, 0.3, 30), WATER, M(0, 0.15, 0)),
    box(48, 0.8, 3, 0, 0.4, -16.5, '#d8d4cc'),
    box(48, 0.8, 3, 0, 0.4, 16.5, '#d8d4cc'),
  ];
  for (let k = 0; k < 5; k += 1) parts.push(...yacht(-18 + k * 9, -6 + (k % 2) * 10, Math.PI / 2 * (k % 2 ? 1 : -1) * 0.1, 0.9));
  for (const [x, h, c] of [[-14, 70, '#9cc0d8'], [12, 85, '#7fb3d0']]) {
    for (let f = 0; f < 10; f += 1) parts.push(piece(new BoxGeometry(9, h / 10, 9), c, turned(x, (h / 10) * (f + 0.5), -26, f * 0.09)));
  }
  return merge(parts);
}

/** The Museum of the Future on a splitter's divider: its silver ring, upright along the track (no garden mound). */
function museumOnDivider() {
  const ring = new CylinderGeometry(7, 7, 5.6, 20, 1, true);
  ring.rotateX(Math.PI / 2); // (its hole faces across the divider; the ring runs along the track)
  ring.scale(1.25, 1.35, 1);
  const inner = new CylinderGeometry(4, 4, 5.62, 20, 1, true);
  inner.rotateX(Math.PI / 2);
  inner.scale(1.3, 1.6, 1);
  return merge([
    piece(ring, '#c9ccd1', M(0, 10, 0)),
    piece(inner, '#7a828c', M(0, 10, 0)),
    box(17, 0.6, 5.6, 0, 0.3, 0, '#c9ccd1'),
    box(1.2, 3.6, 1.2, 6, 1.8, 0, '#c9ccd1'),
    box(1.2, 3.6, 1.2, -6, 1.8, 0, '#c9ccd1'),
  ]);
}

// ── Sydney Marble Grand Prix ────────────────────────────────────────────────

/** A harbour ferry: a green hull, a cream two-deck cabin, a yellow funnel band. */
function ferry(x, z, yaw = 0) {
  return [
    piece(new BoxGeometry(5, 1.6, 16), '#2f6e3a', turned(x, 0.8, z, yaw)),
    piece(new BoxGeometry(4.4, 2.2, 11), '#efe6c8', turned(x, 2.7, z, yaw)),
    piece(new BoxGeometry(4.6, 0.3, 11.4), '#2f6e3a', turned(x, 3.9, z, yaw)),
    piece(new CylinderGeometry(0.5, 0.5, 2, 8), '#e8b62a', turned(x, 5, z, yaw)),
  ];
}
/** A small sailing boat: white hull, a mast and a triangle of sail. */
function sailboat(x, z, yaw = 0) {
  const sail = new ConeGeometry(2.2, 8, 3);
  sail.scale(0.15, 1, 1);
  return [
    piece(new BoxGeometry(1.8, 0.9, 6), '#f4f4f2', turned(x, 0.45, z, yaw)),
    piece(new CylinderGeometry(0.08, 0.08, 9, 5), '#c9ccd1', turned(x, 5, z, yaw)),
    piece(sail, '#f8f8f4', turned(x, 5.3, z, yaw).multiply(M(0, 0, -1.2))),
  ];
}

/** A stretch of harbour: open water with a ferry and a few sailing boats. */
function harbour() {
  return merge([
    piece(new BoxGeometry(70, 0.3, 44), WATER, M(0, 0.15, 0)),
    ...ferry(-14, 2, 0.3),
    ...sailboat(10, -10, 1.2), ...sailboat(20, 8, 0.6), ...sailboat(-26, -12, 2.2),
  ]);
}

/** The Opera House, stylised: white shell sails in three pairs on a sandstone podium. */
function operaHouse(scale = 1) {
  const parts = [box(48, 4, 26, 0, 2, 0, '#c9a77a'), box(20, 4, 10, 0, 2, 17, '#b8956a')];
  const shell = (r, x, z, lean, flip) => {
    const g = new SphereGeometry(r, 10, 6, 0, Math.PI, 0, Math.PI / 2);
    g.scale(0.55, 1.25, 1);
    g.rotateY(flip ? Math.PI : 0);
    g.rotateZ(lean);
    return piece(g, '#f6f4ee', M(x, 4, z));
  };
  for (const [k, r] of [[0, 15], [1, 12], [2, 9]].values()) {
    const x = -14 + k * 13;
    parts.push(shell(r, x, -3, 0.25, false), shell(r * 0.8, x + 3, 5, -0.25, true));
  }
  const g = merge(parts);
  if (scale !== 1) g.scale(scale, scale, scale);
  return g;
}
/** The Opera House's sails on a splitter's divider: the three tallest shells only, running along it. */
function operaOnDivider() {
  const parts = [box(26, 1.2, 5.6, 0, 0.6, 0, '#c9a77a')];
  for (const [k, r] of [[0, 9], [1, 7.5], [2, 6]].values()) {
    const g = new SphereGeometry(r, 10, 6, 0, Math.PI, 0, Math.PI / 2);
    g.scale(1, 1.25, 0.3);
    parts.push(piece(g, '#f6f4ee', M(-8 + k * 8, 1.2, 0)));
  }
  return merge(parts);
}

// ── Istanbul Marble Grand Prix ──────────────────────────────────────────────

/** A minaret: a slim white shaft with a balcony or two and a pencil-sharp lead cap. */
function minaret(x, z, h = 36) {
  return [
    piece(new CylinderGeometry(0.9, 1.1, h, 8), '#efe8dc', M(x, h / 2, z)),
    piece(new CylinderGeometry(1.5, 1.5, 0.6, 8), '#e0d6c4', M(x, h * 0.62, z)),
    piece(new CylinderGeometry(1.4, 1.4, 0.6, 8), '#e0d6c4', M(x, h * 0.85, z)),
    piece(new ConeGeometry(1.1, 6, 8), '#6f7a86', M(x, h + 3, z)),
  ];
}
/** A dome (half a sphere) of lead grey on a drum. */
function dome(r, x, y, z, colour = '#7d8794') {
  return [
    piece(new CylinderGeometry(r * 1.02, r * 1.05, r * 0.35, 16), '#e8dcc6', M(x, y + r * 0.17, z)),
    piece(new SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), colour, M(x, y + r * 0.35, z)),
  ];
}

/** The Galata Tower: a round stone tower with a ring of arched windows and a tall conical cap. */
function galataTower() {
  return merge([
    piece(new CylinderGeometry(6, 6.6, 34, 14), '#c9b89a', M(0, 17, 0)),
    piece(new CylinderGeometry(6.3, 6.3, 3, 14), '#2c3440', M(0, 30, 0)),
    piece(new CylinderGeometry(6.8, 6.8, 0.6, 14), '#a89a80', M(0, 31.8, 0)),
    piece(new ConeGeometry(6.6, 14, 14), '#4a5a6a', M(0, 39, 0)),
    piece(new CylinderGeometry(0.15, 0.15, 3, 5), '#d8c27a', M(0, 47.5, 0)),
  ]);
}

/** Hagia Sophia, stylised: a broad pinkish block, its great shallow dome, half-domes, four minarets. */
function hagiaSophia() {
  return merge([
    box(44, 16, 40, 0, 8, 0, '#d8a890'),
    ...dome(13, 0, 16, 0),
    ...dome(8, 0, 12, 15),
    ...dome(8, 0, 12, -15),
    ...minaret(-24, -22, 40), ...minaret(24, -22, 40), ...minaret(-24, 22, 40), ...minaret(24, 22, 40),
  ]);
}

/** The Blue Mosque, stylised: domes cascading down from a central dome, six minarets. */
function blueMosque() {
  return merge([
    box(46, 12, 46, 0, 6, 0, '#d9d4c8'),
    ...dome(12, 0, 12, 0, '#6f7f95'),
    ...[[-14, 0], [14, 0], [0, -14], [0, 14]].flatMap(([x, z]) => dome(6, x, 10, z, '#6f7f95')),
    ...[[-14, -14], [14, -14], [-14, 14], [14, 14]].flatMap(([x, z]) => dome(4, x, 9, z, '#6f7f95')),
    ...minaret(-26, -26, 42), ...minaret(26, -26, 42), ...minaret(-26, 26, 42), ...minaret(26, 26, 42),
    ...minaret(-26, 0, 34), ...minaret(26, 0, 34),
  ]);
}

/** The Bosphorus Bridge, stylised: two tall towers, a deck over the water, its main cables sagging between. */
function bosphorusBridge() {
  const parts = [piece(new BoxGeometry(220, 0.3, 40), WATER, M(0, 0.15, 0))];
  parts.push(box(260, 2, 10, 0, 22, 0, '#c9ccd1'));
  for (const x of [-70, 70]) for (const z of [-4.5, 4.5]) parts.push(box(3, 60, 3, x, 30, z, '#c9ccd1'));
  for (const x of [-70, 70]) parts.push(box(3, 3, 12, x, 58, 0, '#c9ccd1'));
  for (const z of [-4.5, 4.5]) {
    const pts = [];
    for (let k = 0; k <= 14; k += 1) {
      const x = -70 + (140 * k) / 14;
      pts.push(V(x, 58 - 32 * (1 - ((x / 70) ** 2)), z));
    }
    for (let k = 0; k < pts.length - 1; k += 1) parts.push(beam(pts[k], pts[k + 1], 0.6, '#9aa1aa'));
    parts.push(beam(V(-70, 58, z), V(-130, 23, z), 0.6, '#9aa1aa'), beam(V(70, 58, z), V(130, 23, z), 0.6, '#9aa1aa'));
  }
  return merge(parts);
}

/** A tulip garden: beds of red, yellow, pink and white tulips in rows, a low hedge round them. */
function tulipGarden(w = 30, d = 14) {
  const parts = [box(w, 0.4, d, 0, 0.2, 0, '#5a8a3a')];
  const colours = ['#d8231f', '#f2c230', '#e86aa0', '#f4f4f2', '#7a3fb0'];
  for (let r = 0; r < Math.floor(d / 1.6); r += 1) {
    for (let c = 0; c < Math.floor(w / 1.4); c += 1) {
      const x = -w / 2 + 0.7 + c * 1.4;
      const z = -d / 2 + 0.8 + r * 1.6;
      parts.push(piece(new ConeGeometry(0.28, 0.5, 5), colours[(r + Math.floor(c / 4)) % colours.length], new Matrix4().makeRotationX(Math.PI).premultiply(M(x, 0.9, z))));
    }
  }
  for (const z of [-d / 2, d / 2]) parts.push(box(w, 0.7, 0.5, 0, 0.35, z, '#3f6e2c'));
  return merge(parts);
}

// ── Lagos Marble Grand Prix ─────────────────────────────────────────────────

/** Lagos Island's skyline: a cluster of office towers of different heights. */
function lagosSkyline() {
  const parts = [];
  const towers = [[-30, 0, 10, 60, '#9cb4c8'], [-14, -10, 12, 85, '#c9ccd1'], [2, 4, 9, 50, '#7fa3c0'], [16, -8, 11, 72, '#b0c0cc'], [30, 6, 8, 40, '#d8d4cc']];
  for (const [x, z, w, h, c] of towers) {
    parts.push(box(w, h, w, x, h / 2, z, c));
    for (let y = 6; y < h - 2; y += 6) parts.push(box(w + 0.1, 1.4, w + 0.1, x, y, z, '#4a5a6a'));
  }
  return merge(parts);
}

/** The National Theatre, stylised: a low wide drum ringed by a folded roof edge, like a crown of pleats. */
function nationalTheatre() {
  const parts = [piece(new CylinderGeometry(26, 28, 12, 24), '#e8e4da', M(0, 6, 0)), piece(new CylinderGeometry(27, 26, 1.5, 24), '#c9c6bf', M(0, 12.6, 0))];
  for (let k = 0; k < 16; k += 1) {
    const a = (k / 16) * Math.PI * 2;
    const g = new BoxGeometry(10, 1, 4);
    g.rotateZ(k % 2 ? 0.35 : -0.35);
    parts.push(piece(g, '#9aa1aa', new Matrix4().makeRotationY(-a).premultiply(M(Math.cos(a) * 24, 14.5, Math.sin(a) * 24))));
  }
  parts.push(piece(new CylinderGeometry(14, 16, 4, 20), '#c9c6bf', M(0, 15, 0)));
  return merge(parts);
}

/** A roundabout's monument: a stepped plinth, a tall column and a figure-like crown in bronze. */
function roundaboutMonument() {
  return merge([
    piece(new CylinderGeometry(2.6, 2.8, 1, 12), '#c9c6bf', M(0, 0.5, 0)),
    piece(new CylinderGeometry(1.8, 2, 1.2, 12), '#b8b4aa', M(0, 1.6, 0)),
    piece(new CylinderGeometry(0.6, 0.8, 10, 10), '#e8e4da', M(0, 7.2, 0)),
    piece(new IcosahedronGeometry(1.1, 1), '#a8742a', M(0, 13, 0)),
    piece(new ConeGeometry(0.9, 2.4, 8), '#a8742a', M(0, 14.8, 0)),
  ]);
}

// ── Nairobi Marble Grand Prix ───────────────────────────────────────────────

/** The KICC tower, stylised: a round terracotta-ribbed tower with a saucer crown, a cone-roofed hall beside it. */
function kiccTower() {
  const parts = [piece(new CylinderGeometry(7, 7.5, 80, 14), '#c9a07a', M(0, 40, 0))];
  for (let y = 4; y < 78; y += 4) parts.push(piece(new CylinderGeometry(7.6, 7.6, 0.6, 14), '#9a6a4a', M(0, y, 0)));
  parts.push(piece(new CylinderGeometry(11, 8, 4, 16), '#e8e4da', M(0, 82, 0)));
  parts.push(piece(new CylinderGeometry(0.5, 0.5, 8, 6), '#c9ccd1', M(0, 88, 0)));
  parts.push(piece(new CylinderGeometry(12, 13, 8, 16), '#d8c6a8', M(26, 4, 10)), piece(new ConeGeometry(15, 10, 16), '#9a6a4a', M(26, 13, 10)));
  return merge(parts);
}

/** A big umbrella acacia (a splitter's centrepiece on the savannah). */
function bigAcacia(s = 1) {
  return merge([
    piece(new CylinderGeometry(0.5 * s, 0.8 * s, 9 * s, 7), '#6b5a44', M(0, 4.5 * s, 0)),
    beam(V(0, 7 * s, 0), V(2.5 * s, 9.5 * s, 0), 0.4 * s, '#6b5a44'),
    beam(V(0, 7 * s, 0), V(-2.5 * s, 9.6 * s, 0.5 * s), 0.4 * s, '#6b5a44'),
    piece(new CylinderGeometry(8 * s, 6 * s, 2 * s, 9), '#6f8a3a', M(0, 10.5 * s, 0)),
  ]);
}

/** A safari truck: an open-sided khaki truck, spectators sitting on its roof. */
function safariTruck() {
  const parts = [
    box(2.6, 1.6, 6, 0, 1.4, 0, '#b8a272'),
    box(2.6, 0.15, 6, 0, 3.1, 0, '#8a7a52'),
    ...[-1.2, 1.2].flatMap((x) => [-2.8, 2.8].map((z) => box(0.12, 1.2, 0.12, x, 2.5, z, '#5a4a32'))),
    ...[-0.9, 0.9].flatMap((x) => [-2, 2].map((z) => piece(new CylinderGeometry(0.5, 0.5, 0.35, 10), '#1c1d21', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(x * 1.4, 0.5, z))))),
  ];
  const shirts = ['#d8322b', '#2556b8', '#f2b81c', '#2f9a4a', '#f2f2ee'];
  for (let k = 0; k < 5; k += 1) {
    parts.push(box(0.45, 0.6, 0.3, -0.8 + (k % 2) * 1.6, 3.5, -2.2 + k * 1.1, shirts[k]));
    parts.push(box(0.25, 0.25, 0.25, -0.8 + (k % 2) * 1.6, 3.95, -2.2 + k * 1.1, '#6e4a30'));
  }
  return merge(parts);
}

/** The national park's fence: a long run of posts and wire along the track (the skyline on one side, the plains on the other). */
function parkFence() {
  const parts = [];
  for (let k = 0; k <= 30; k += 1) parts.push(box(0.15, 1.6, 0.15, -60 + k * 4, 0.8, 0, '#6b5a44'));
  for (const y of [0.6, 1.1, 1.5]) parts.push(box(120, 0.05, 0.05, 0, y, 0, '#8a8d93'));
  return merge(parts);
}

// ── Stockholm Marble Grand Prix ─────────────────────────────────────────────

/** The Royal Palace, stylised: a long square-built palace in sand-yellow, rows of windows, a flat parapet. */
function royalPalace() {
  const parts = [box(60, 18, 40, 0, 9, 0, '#d8c08a'), box(62, 1.4, 42, 0, 18.7, 0, '#b8a070'), box(30, 18, 2, 0, 9, 20.2, '#d0b680')];
  for (let r = 0; r < 3; r += 1) parts.push(box(56, 1.6, 0.2, 0, 4 + r * 5, 20.3, '#4a4a52'));
  return merge(parts);
}

/** Stockholm City Hall, stylised: a long red-brick hall and its tall square tower with a gold crown on top. */
function cityHall() {
  const parts = [box(46, 14, 30, -12, 7, 0, '#a8452f'), piece(new ConeGeometry(28, 4, 4), '#3f6e5a', turned(-12, 16, 0, Math.PI / 4, 1.1, 1, 0.75))];
  parts.push(box(10, 92, 10, 18, 46, 0, '#a8452f'), box(11, 2, 11, 18, 92, 0, '#8a3a26'));
  parts.push(piece(new CylinderGeometry(3.5, 4.5, 10, 8), '#3f6e5a', M(18, 98, 0)), piece(new ConeGeometry(1.2, 4, 6), '#e0b43c', M(18, 105, 0)));
  for (const x of [-1.6, 0, 1.6]) parts.push(piece(new ConeGeometry(0.6, 1.4, 5), '#e0b43c', M(18 + x, 108, 0)));
  return merge(parts);
}

/** The Vasa museum: a dark building with the old warship's three masts rising out of its roof. */
function vasaMuseum() {
  const parts = [box(40, 16, 26, 0, 8, 0, '#4a5a52'), piece(new ConeGeometry(26, 8, 4), '#3a4a44', turned(0, 20, 0, Math.PI / 4, 1.1, 1, 0.7))];
  for (const [x, h] of [[-10, 46], [2, 52], [12, 40]]) {
    parts.push(piece(new CylinderGeometry(0.5, 0.7, h, 6), '#6b4a2f', M(x, h / 2, 0)));
    for (const y of [h * 0.55, h * 0.8]) parts.push(box(8, 0.4, 0.4, x, y, 0, '#6b4a2f'));
  }
  return merge(parts);
}

/** Old steamboats moored along the quay (Strandvägen): white hulls, black funnels, the water behind the line. */
function steamboats() {
  const parts = [piece(new BoxGeometry(80, 0.3, 30), WATER, M(0, 0.15, 0)), box(82, 1, 4, 0, 0.5, -17, '#a49c8f')];
  for (const x of [-26, 0, 26]) {
    parts.push(piece(new BoxGeometry(6, 2.2, 20), '#f4f4f2', M(x, 1.1, -8)));
    parts.push(piece(new BoxGeometry(4.6, 2, 11), '#e8e2d2', M(x, 3.2, -8)));
    parts.push(piece(new CylinderGeometry(0.7, 0.8, 4, 10), '#1c1d21', M(x, 5.8, -6)));
    parts.push(piece(new CylinderGeometry(0.72, 0.72, 0.6, 10), '#d8b23a', M(x, 7.5, -6)));
  }
  return merge(parts);
}

// ── Delhi Red Fort Marble Grand Prix ────────────────────────────────────────

const RED = '#b0452f';
const RED_DARK = '#8a3424';
/** A chhatri: a small domed pavilion on four posts, on a wall's top. */
function chhatri(x, y, z, s = 1) {
  return [
    ...[-1, 1].flatMap((a) => [-1, 1].map((b) => box(0.4 * s, 3 * s, 0.4 * s, x + a * 1.4 * s, y + 1.5 * s, z + b * 1.4 * s, '#e8dcc6'))),
    piece(new SphereGeometry(2 * s, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#f2ece0', M(x, y + 3 * s, z)),
  ];
}
/** The Red Fort: long red sandstone walls with crenellations and corner towers topped with pavilions. */
function redFort() {
  const parts = [box(120, 18, 8, 0, 9, 0, RED)];
  for (let k = 0; k < 30; k += 1) parts.push(box(2, 1.6, 8.2, -58 + k * 4, 18.8, 0, RED_DARK));
  for (const x of [-60, 60]) {
    parts.push(piece(new CylinderGeometry(6, 7, 22, 12), RED, M(x, 11, 0)));
    parts.push(...chhatri(x, 22, 0, 1.4));
  }
  parts.push(...chhatri(-20, 19.6, 0, 1), ...chhatri(20, 19.6, 0, 1));
  return merge(parts);
}
/** The fort's great gateway, straddling the track: two towers, a pointed arch high above the channel. */
function redFortGate() {
  const parts = [];
  for (const x of [-11, 11]) {
    parts.push(box(8, 24, 10, x, 12, 0, RED), box(8.6, 1.4, 10.6, x, 24.7, 0, RED_DARK));
    parts.push(...chhatri(x, 25.4, 0, 1.2));
  }
  parts.push(box(14, 6, 10, 0, 21, 0, RED));
  parts.push(box(14.4, 1.2, 10.6, 0, 24.6, 0, RED_DARK));
  for (const x of [-4, 0, 4]) parts.push(...chhatri(x, 25.2, 0, 0.6));
  return merge(parts);
}
/** Jama Masjid, stylised: three white-and-black striped domes on a red sandstone prayer hall, two tall minarets. */
function jamaMasjid() {
  const parts = [box(60, 14, 22, 0, 7, 0, RED), box(16, 22, 3, 0, 11, 11.5, RED)];
  for (const [x, r] of [[-16, 7], [0, 10], [16, 7]]) {
    parts.push(piece(new CylinderGeometry(r, r, 3, 14), '#f2ece0', M(x, 15.5, 0)));
    parts.push(piece(new SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), '#f2ece0', S(x, 17, 0, 1, 1.3, 1)));
    for (let k = 0; k < 3; k += 1) parts.push(piece(new CylinderGeometry(r * (0.95 - k * 0.25), r * (0.95 - k * 0.25), 0.4, 14), '#2c2f36', M(x, 18.5 + k * r * 0.35, 0)));
  }
  for (const x of [-33, 33]) parts.push(piece(new CylinderGeometry(1.8, 2.2, 42, 10), RED, M(x, 21, 8)), ...chhatri(x, 42, 8, 0.9));
  return merge(parts);
}
/** India Gate, stylised: a tall sandstone arch with a stepped attic and a shallow dome on top. */
function indiaGate() {
  return merge([
    box(8, 34, 10, -11, 17, 0, '#c9a77a'), box(8, 34, 10, 11, 17, 0, '#c9a77a'),
    box(30, 10, 10, 0, 37, 0, '#c9a77a'), box(26, 3, 9, 0, 43.5, 0, '#b8956a'), box(20, 3, 8, 0, 46.5, 0, '#c9a77a'),
    piece(new SphereGeometry(5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#b8956a', M(0, 48, 0)),
    box(34, 1, 14, 0, 0.5, 0, '#a49c8f'),
  ]);
}
/** A Mughal garden fountain on a divider: a long stone water channel with a row of little jets. */
function mughalFountain(len = 26, wide = 5.2) {
  const parts = [box(len, 0.6, wide, 0, 0.3, 0, '#d8ccb4'), box(len - 1, 0.1, wide - 1.6, 0, 0.65, 0, WATER)];
  for (let k = 0; k < 7; k += 1) parts.push(piece(new CylinderGeometry(0.08, 0.2, 1.4, 5), '#e8f6ff', M(-len / 2 + 2 + k * ((len - 4) / 6), 1.3, 0)));
  for (const x of [-len / 2, len / 2]) parts.push(...chhatri(x, 0.6, 0, 0.5));
  return merge(parts);
}

// ── Sahara Marble Grand Prix ────────────────────────────────────────────────

const MUD = '#c98a52';
const MUD_DARK = '#a86e3e';
/** An earthen tower: tapering mud-brick walls, crenellated corners. */
function earthTower(x, z, h, w) {
  const g = new CylinderGeometry(w * 0.55, w * 0.75, h, 4);
  g.rotateY(Math.PI / 4);
  const parts = [piece(g, MUD, M(x, h / 2, z))];
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(box(w * 0.18, 2, w * 0.18, x + a * w * 0.33, h + 1, z + b * w * 0.33, MUD_DARK));
  return parts;
}
/** A kasbah: earthen towers joined by high walls, the gate set between them. */
function kasbah() {
  return merge([
    box(50, 12, 26, 0, 6, 0, MUD),
    ...earthTower(-25, -13, 22, 9), ...earthTower(25, -13, 22, 9), ...earthTower(-25, 13, 20, 8), ...earthTower(25, 13, 20, 8),
    ...earthTower(0, -8, 26, 10),
    box(8, 7, 1, 0, 3.5, 13.3, '#5a3a24'),
  ]);
}
/** A great mud-brick mosque in the Timbuktu style: buttressed walls, cone-topped towers, wooden beams sticking out. */
function mudMosque() {
  const parts = [box(56, 12, 34, 0, 6, 0, MUD)];
  for (const [x, h] of [[-20, 26], [0, 32], [20, 26]]) {
    const g = new CylinderGeometry(2.5, 6.5, h, 4);
    g.rotateY(Math.PI / 4);
    parts.push(piece(g, MUD, M(x, h / 2, 14)));
    for (let y = 4; y < h - 2; y += 3) parts.push(box(0.35, 0.35, 15, x, y, 14, '#6b4a2f'));
  }
  for (let k = 0; k < 12; k += 1) parts.push(piece(new ConeGeometry(1.2, 4, 5), MUD_DARK, M(-27 + k * 4.9, 14, -17)));
  return merge(parts);
}
/** A camel caravan on the horizon: a line of camels and riders crossing the dunes. */
function caravan() {
  const parts = [];
  for (let k = 0; k < 7; k += 1) {
    const x = -24 + k * 8;
    parts.push(box(1, 1.3, 2.6, x, 2.4, 0, '#c9a06a'), piece(new IcosahedronGeometry(0.7, 0), '#b8905a', M(x, 3.4, 0)));
    for (const z of [-0.9, 0.9]) for (const dx of [-0.35, 0.35]) parts.push(box(0.25, 1.8, 0.25, x + dx, 0.9, z, '#b8905a'));
    parts.push(box(0.35, 1.4, 0.35, x, 3.2, 1.5, '#b8905a'), box(0.45, 0.5, 0.8, x, 3.8, 1.9, '#b8905a'));
    if (k % 2 === 0) parts.push(box(0.5, 0.9, 0.5, x, 3.5, -0.4, ['#2556b8', '#d8322b', '#f2f2ee'][k % 3]));
  }
  return merge(parts);
}

// ── Elderglade (our own world) ──────────────────────────────────────────────

/** An ancient giant tree: a vast trunk on spreading roots, a crown of glowing green leaves, lanterns hanging from it. */
function giantTree(platform = false) {
  const parts = [piece(new CylinderGeometry(6, 9, 60, 12), '#6b4a2f', M(0, 30, 0))];
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    parts.push(beam(V(Math.cos(a) * 6, 6, Math.sin(a) * 6), V(Math.cos(a) * 14, 0, Math.sin(a) * 14), 2.2, '#5a3f2a'));
  }
  for (const [x, y, z, r] of [[0, 66, 0, 18], [-12, 58, 6, 11], [12, 60, -6, 12], [4, 74, 4, 10]]) parts.push(piece(new IcosahedronGeometry(r, 1), '#5fae4a', M(x, y, z)));
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    parts.push(piece(new IcosahedronGeometry(0.7, 0), '#ffe27a', M(Math.cos(a) * 15, 48, Math.sin(a) * 15)));
  }
  if (platform) {
    parts.push(piece(new CylinderGeometry(13, 13, 1, 16), '#8a6a45', M(0, 30, 0)));
    for (let k = 0; k < 16; k += 1) {
      const a = (k / 16) * Math.PI * 2;
      parts.push(box(0.25, 1.4, 0.25, Math.cos(a) * 12.6, 31.2, Math.sin(a) * 12.6, '#5a3f2a'));
    }
  }
  return merge(parts);
}

/** A ring of glowing flowers round a forest clearing (the finish). */
function glowFlowers() {
  const parts = [];
  const c = ['#ffe27a', '#bfff8a', '#ff9ad8', '#9fe8ff'];
  for (let k = 0; k < 40; k += 1) {
    const a = (k / 40) * Math.PI * 2;
    const r = 22 + (k % 3) * 2;
    parts.push(piece(new CylinderGeometry(0.06, 0.06, 1.4, 4), '#3f8f3a', M(Math.cos(a) * r, 0.7, Math.sin(a) * r)));
    parts.push(piece(new IcosahedronGeometry(0.45, 0), c[k % 4], M(Math.cos(a) * r, 1.5, Math.sin(a) * r)));
  }
  return merge(parts);
}

// ── Frostmere (our own world) ───────────────────────────────────────────────

/** A snowy fairy-tale castle: white walls, round towers with tall blue cone roofs, banners. */
function snowCastle() {
  const parts = [box(50, 16, 20, 0, 8, 0, '#e8eef5')];
  for (const [x, z, h] of [[-25, -10, 30], [25, -10, 30], [-25, 10, 26], [25, 10, 26], [0, -6, 40]]) {
    parts.push(piece(new CylinderGeometry(4.5, 5, h, 12), '#f4f7fa', M(x, h / 2, z)));
    parts.push(piece(new ConeGeometry(5.8, 12, 12), '#3a6ab8', M(x, h + 6, z)));
    parts.push(box(0.15, 4, 0.15, x, h + 14, z, '#c9ccd1'), box(2.2, 1.2, 0.05, x + 1.1, h + 15.2, z, '#d8322b'));
  }
  for (let k = 0; k < 12; k += 1) parts.push(box(2, 1.6, 20.4, -22 + k * 4, 16.8, 0, '#dbe6f0'));
  return merge(parts);
}

/** A small snowy island in a frozen lake, a few pines on it (a splitter's divider). */
function snowIsland(len = 24, wide = 5.6) {
  const parts = [piece(new CylinderGeometry(1, 1, 0.6, 10), '#f4f8fc', S(0, 0.3, 0, len / 2, 1, wide / 2))];
  for (const x of [-len / 4, 0, len / 4]) {
    parts.push(piece(new CylinderGeometry(0.2, 0.25, 1.4, 5), '#5a4a3a', M(x, 1.2, 0)));
    for (let k = 0; k < 3; k += 1) parts.push(piece(new ConeGeometry(1.6 - k * 0.45, 1.8, 7), k ? '#e8eef5' : '#2f5a3a', M(x, 2.2 + k * 1.1, 0)));
  }
  return merge(parts);
}

/** The ice palace: clear blue-white towers of ice and spires, glittering. */
function icePalace() {
  const parts = [box(46, 14, 26, 0, 7, 0, '#cdeefc')];
  for (const [x, z, h, r] of [[-20, -8, 34, 4], [20, -8, 34, 4], [0, -10, 50, 6], [-10, 8, 24, 3], [10, 8, 24, 3]]) {
    const g = new CylinderGeometry(r * 0.7, r, h, 6);
    parts.push(piece(g, '#bfe8f8', M(x, h / 2, z)), piece(new ConeGeometry(r * 0.8, 14, 6), '#e8f8ff', M(x, h + 7, z)));
  }
  for (let k = 0; k < 9; k += 1) parts.push(piece(new ConeGeometry(0.6, 3, 5), '#ffffff', new Matrix4().makeRotationX(Math.PI).premultiply(M(-20 + k * 5, 12.5, 13.2)))); // icicles along the eaves
  return merge(parts);
}

// ── Wyrmwood Hollow (our own world) ─────────────────────────────────────────

const RUIN = '#9a958a';
const RUIN_DARK = '#7a756a';
/** A ruined castle wall: broken towers and gapped battlements, ivy creeping up. */
function ruinedCastle() {
  const parts = [box(60, 14, 6, 0, 7, 0, RUIN)];
  for (let k = 0; k < 14; k += 1) if (k % 5 !== 2) parts.push(box(2, 1.6 + (k % 3) * 0.6, 6.2, -26 + k * 4, 14.8, 0, RUIN_DARK));
  for (const [x, h] of [[-30, 22], [30, 16]]) parts.push(piece(new CylinderGeometry(5, 5.6, h, 10), RUIN, M(x, h / 2, 0)));
  for (const [x, y] of [[-20, 8], [10, 5], [24, 10]]) parts.push(box(4, 5, 0.3, x, y, 3.2, '#3f6e2c')); // ivy
  return merge(parts);
}

/** The sleeping dragon curled on a heap of treasure (one eye opening: its eyelid lifts on the race clock). */
function sleepingDragon() {
  const parts = [piece(new SphereGeometry(16, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#d8a93a', S(0, 0, 0, 1, 0.35, 1))];
  for (let k = 0; k < 14; k += 1) {
    const a = (k / 14) * Math.PI * 1.7;
    parts.push(piece(new IcosahedronGeometry(4 - k * 0.12, 1), k % 2 ? '#8a2a24' : '#a8342a', M(Math.cos(a) * 9, 5 + Math.sin(k) * 0.6, Math.sin(a) * 9)));
    parts.push(piece(new ConeGeometry(0.7, 2.2, 4), '#e0b43c', M(Math.cos(a) * 9, 9.4, Math.sin(a) * 9)));
  }
  parts.push(piece(new IcosahedronGeometry(3.6, 1), '#8a2a24', S(10, 5, 4, 1.4, 0.9, 1)));             // the head, resting
  parts.push(piece(new IcosahedronGeometry(0.9, 0), '#ffd21f', M(12.8, 6.4, 6.4)));                    // the eye
  for (const z of [2.5, 5.5]) parts.push(piece(new ConeGeometry(0.5, 3, 5), '#e9dcc0', new Matrix4().makeRotationZ(-1.1).premultiply(M(9, 8.6, z))));
  for (let k = 0; k < 20; k += 1) parts.push(piece(new CylinderGeometry(0.5, 0.5, 0.15, 8), '#f2c21c', M(-12 + (k % 5) * 6, 5.4 + Math.floor(k / 5) * 0.2, -12 + Math.floor(k / 5) * 2)));
  return merge(parts);
}
function dragonEyelid() {
  return merge([piece(new SphereGeometry(1.0, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#8a2a24', new Matrix4().makeRotationZ(Math.PI / 2))]);
}

/** A fallen statue of a knight, lying along the divider, its sword beside it. */
function fallenStatue() {
  return merge([
    box(4.8, 1, 18, 0, 0.5, 0, RUIN_DARK),
    box(2.4, 1.6, 7, 0, 1.8, -1, RUIN), box(2, 1.4, 6, 0, 1.7, 5.5, RUIN),
    piece(new IcosahedronGeometry(1.2, 0), RUIN, M(0, 2, -6)),
    box(0.4, 0.3, 9, 1.6, 1.2, 1, '#8d939b'), box(1.4, 0.3, 0.4, 1.6, 1.2, -3.2, '#8d939b'),
  ]);
}

/** A ruined amphitheatre: tiers of stone in a half ring, broken arches behind. */
function amphitheatre() {
  const parts = [];
  for (let t = 0; t < 6; t += 1) {
    const g = new CylinderGeometry(20 + t * 2.2, 20 + t * 2.2, 1.2, 20, 1, false, 0, Math.PI);
    parts.push(piece(g, t % 2 ? RUIN : RUIN_DARK, M(0, 0.6 + t * 1.1, 0)));
  }
  for (let k = 0; k < 9; k += 1) {
    const a = (k / 8) * Math.PI;
    if (k % 3 === 1) continue;
    parts.push(box(2, 12, 2, Math.sin(a) * 34, 6, Math.cos(a) * 34, RUIN));
  }
  return merge(parts);
}

/** The dragon's mountain: a dark peak with a glowing cave mouth, far off. */
function dragonMountain() {
  return merge([
    piece(new ConeGeometry(90, 140, 8), '#4a4540', M(0, 70, 0)),
    piece(new ConeGeometry(30, 40, 6), '#3a3530', M(30, 20, 40)),
    piece(new IcosahedronGeometry(8, 0), '#ff7a2a', S(0, 30, 70, 1, 0.8, 0.3)),
  ]);
}

/**
 * Grand Prix landmarks by name: builder, footprint radius, and (`fit`) the
 * half-width that has to fit a splitter's divider or a bend; `divider`: what
 * stands on a splitter's divider instead (when the landmark itself is too big).
 */
export const GP_LANDMARKS = {
  'dubai-fountain': { build: dubaiFountain, radius: 26, moving: { build: fountainJets, pivot: [0, 0, 0], axis: [0, 1, 0], swing: 0.5, period: 6 } },
  marina: { build: marina, radius: 28 },
  harbour: { build: harbour, radius: 36 },
  'opera-house': { build: () => operaHouse(), radius: 26 },
  'galata-tower': { build: galataTower, radius: 8 },
  'hagia-sophia': { build: hagiaSophia, radius: 30 },
  'blue-mosque': { build: blueMosque, radius: 32 },
  'bosphorus-bridge': { build: bosphorusBridge, radius: 60 },
  'tulip-garden': { build: () => tulipGarden(), radius: 16 },
  'lagos-skyline': { build: lagosSkyline, radius: 40 },
  'national-theatre': { build: nationalTheatre, radius: 30 },
  'roundabout-monument': { build: roundaboutMonument, radius: 3, fit: 2.8 },
  'kicc-tower': { build: kiccTower, radius: 30 },
  acacia: { build: () => bigAcacia(), radius: 8 },
  'safari-truck': { build: safariTruck, radius: 4 },
  'park-fence': { build: parkFence, radius: 4 },
  'royal-palace': { build: royalPalace, radius: 36 },
  'city-hall': { build: cityHall, radius: 26 },
  'vasa-museum': { build: vasaMuseum, radius: 24 },
  steamboats: { build: steamboats, radius: 42 },
  'red-fort': { build: redFort, radius: 62 },
  'red-fort-gate': { build: redFortGate, radius: 15 },
  'jama-masjid': { build: jamaMasjid, radius: 36 },
  'india-gate': { build: indiaGate, radius: 18 },
  'mughal-fountain': { build: () => mughalFountain(30, 12), radius: 16 },
  kasbah: { build: kasbah, radius: 30 },
  'mud-mosque': { build: mudMosque, radius: 32 },
  caravan: { build: caravan, radius: 30 },
  'giant-tree': { build: () => giantTree(false), radius: 16 },
  'tree-platform': { build: () => giantTree(true), radius: 16 },
  'glow-flowers': { build: glowFlowers, radius: 26 },
  'snow-castle': { build: snowCastle, radius: 30 },
  'snow-island': { build: () => snowIsland(), radius: 13 },
  'ice-palace': { build: icePalace, radius: 30 },
  'ruined-castle': { build: ruinedCastle, radius: 34 },
  'sleeping-dragon': { build: sleepingDragon, radius: 18, moving: { build: dragonEyelid, pivot: [12.8, 6.4, 6.4], axis: [0, 0, 1], swing: 0.6, period: 7 } },
  'fallen-statue': { build: fallenStatue, radius: 9, fit: 2.4 },
  amphitheatre: { build: amphitheatre, radius: 36 },
  'dragon-mountain': { build: dragonMountain, radius: 90 },
};

/** What a splitter's divider carries in place of a landmark too big for it. */
export const DIVIDER_PIECES = {
  'museum-of-the-future': { build: museumOnDivider, fit: 2.9 },
  'opera-house': { build: operaOnDivider, fit: 2.9 },
  'tulip-garden': { build: () => tulipGarden(24, 5.4), fit: 2.8 },
  acacia: { build: () => bigAcacia(0.75), fit: 2.9 },
  'mughal-fountain': { build: () => mughalFountain(26, 5.2), fit: 2.8 },
  'snow-island': { build: () => snowIsland(24, 5.4), fit: 2.8 },
};
