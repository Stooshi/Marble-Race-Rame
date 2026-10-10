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
};

/** What a splitter's divider carries in place of a landmark too big for it. */
export const DIVIDER_PIECES = {
  'museum-of-the-future': { build: museumOnDivider, fit: 2.9 },
  'opera-house': { build: operaOnDivider, fit: 2.9 },
  'tulip-garden': { build: () => tulipGarden(24, 5.4), fit: 2.8 },
  acacia: { build: () => bigAcacia(0.75), fit: 2.9 },
};
