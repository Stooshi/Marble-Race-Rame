/**
 * Landmarks for the Holiday Season 2026 tracks: one builder each, origin on the
 * ground, front facing +z, cartoon low-poly from a few simple shapes, merged into
 * the still scenery. Generic impressions of each place's architecture and
 * traditions (no named buildings' details, no religious figures, no flags or
 * emblems, no brands), as the season's respect rules ask.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const turned = (x, y, z, yaw) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(1, 1, 1));
const tilted = (x, y, z, pitch) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(X, pitch), new Vector3(1, 1, 1));
const box = (w, h, d, x, y, z, colour) => piece(new BoxGeometry(w, h, d), colour, M(x, y, z));
/** A four-sided steep roof (a pyramid) of width w and height h, its base at y. */
const spire = (w, h, x, y, z, colour) => piece(new ConeGeometry(w * 0.72, h, 4), colour, turned(x, y + h / 2, z, Math.PI / 4));
const WARM = '#ffd27a';

/** Lit windows in rows on a front face (+z) of width w, from y0 up, at depth z. */
function windows(w, rows, y0, z, { x = 0, every = 2.6, gap = 2.4 } = {}) {
  const out = [];
  const n = Math.max(1, Math.floor(w / every));
  for (let r = 0; r < rows; r += 1) {
    for (let k = 0; k < n; k += 1) out.push(box(0.9, 1.3, 0.2, x - w / 2 + (k + 0.5) * (w / n), y0 + r * gap, z, WARM));
  }
  return out;
}

// ── Québec Old Town Spins ────────────────────────────────────────────────────

const BRICK = '#8a4a36';
const COPPER = '#5fa58c';
const CLIFF = '#6b625a';

/**
 * A castle-like grand hotel on its cliff above the river (generic: brick walls,
 * steep green copper roofs, a tall central tower and corner turrets, lit windows).
 */
function chateauHotel() {
  const p = [];
  p.push(box(64, 14, 30, 0, 7, -4, CLIFF)); // the cliff it stands on
  p.push(box(66, 1.2, 32, 0, 14.4, -4, '#eef2f6')); // snow on the cliff top
  const top = 15;
  // The wings: a long body each side of the tower.
  for (const x of [-17, 17]) {
    p.push(box(22, 13, 12, x, top + 6.5, 0, BRICK));
    p.push(spire(16, 9, x, top + 13, 0, COPPER));
    p.push(...windows(20, 3, top + 2.5, 6.05, { x }));
  }
  // The central tower.
  p.push(box(12, 30, 12, 0, top + 15, 0, BRICK));
  p.push(spire(13, 14, 0, top + 30, 0, COPPER));
  p.push(...windows(10, 8, top + 3, 6.05));
  // Corner turrets with pointed roofs.
  for (const [x, z] of [[-28, 6], [28, 6], [-28, -6], [28, -6], [-6, 6.5], [6, 6.5]]) {
    const h = Math.abs(x) > 10 ? 17 : 24;
    p.push(piece(new CylinderGeometry(2.2, 2.2, h, 10), BRICK, M(x, top + h / 2, z)));
    p.push(piece(new ConeGeometry(2.8, 6, 10), COPPER, M(x, top + h + 3, z)));
  }
  // The boardwalk terrace along the cliff top, with its lamp posts.
  p.push(box(60, 0.6, 5, 0, top + 0.3, 11, '#7a5a3a'));
  for (let k = 0; k < 7; k += 1) {
    const x = -27 + k * 9;
    p.push(piece(new CylinderGeometry(0.15, 0.15, 3, 6), '#2a2a30', M(x, top + 1.8, 13)));
    p.push(piece(new SphereGeometry(0.45, 8, 6), WARM, M(x, top + 3.4, 13)));
  }
  return merge(p);
}

/**
 * The winter toboggan slide beside the terrace: three wooden chutes running down
 * from a start hut on trestles, lanterns along it, a toboggan on its way down.
 */
function tobogganSlide() {
  const p = [];
  const len = 56;
  const rise = 16;
  const pitch = Math.atan2(rise, len);
  const run = Math.hypot(len, rise);
  // The three chutes (front low at +z, the start hut high at -z).
  for (const x of [-3.2, 0, 3.2]) {
    p.push(piece(new BoxGeometry(2.6, 0.4, run), '#eef3f8', tilted(x, rise / 2 + 0.6, 0, pitch)));
    for (const s of [-1.4, 1.4]) p.push(piece(new BoxGeometry(0.3, 0.8, run), '#9a6a3c', tilted(x + s, rise / 2 + 1, 0, pitch)));
  }
  // Trestles under it.
  for (let k = 1; k < 7; k += 1) {
    const z = len / 2 - (k * len) / 7;
    const h = rise * (k / 7) + 0.4;
    for (const x of [-5, 5]) p.push(box(0.5, h, 0.5, x, h / 2, z, '#7a5230'));
    p.push(box(10.5, 0.4, 0.5, 0, h, z, '#7a5230'));
  }
  // The start hut at the top, lit.
  p.push(box(11, 4, 5, 0, rise + 2.6, -len / 2 - 2, '#a0643a'));
  p.push(spire(12, 3, 0, rise + 4.6, -len / 2 - 2, '#eef2f6'));
  p.push(box(3, 1.4, 0.2, 0, rise + 2.4, -len / 2 + 0.55, WARM));
  // Lanterns along the side, and a toboggan half way down.
  for (let k = 0; k < 6; k += 1) {
    const z = len / 2 - 4 - k * 9;
    const y = rise * ((len / 2 - z) / len) + 1;
    p.push(piece(new CylinderGeometry(0.12, 0.12, 2.6, 6), '#2a2a30', M(5.8, y + 1.3, z)));
    p.push(piece(new SphereGeometry(0.4, 8, 6), WARM, M(5.8, y + 2.7, z)));
  }
  p.push(piece(new BoxGeometry(1.4, 0.5, 3.4), '#b8432a', tilted(0, rise / 2 + 1.3, 0, pitch)));
  return merge(p);
}


// ── Cape Town Summer Christmas ───────────────────────────────────────────────

/** A table-shaped mountain far behind: steep grey cliffs, a long flat top, a cloth of cloud on it. */
function flatTopMountain() {
  const p = [];
  p.push(piece(new CylinderGeometry(150, 190, 70, 9, 1), '#7c7a72', new Matrix4().compose(new Vector3(0, 35, 0), new Quaternion(), new Vector3(1.6, 1, 0.5))));
  p.push(piece(new CylinderGeometry(190, 240, 30, 9, 1), '#6f8a4e', new Matrix4().compose(new Vector3(0, 12, 20), new Quaternion(), new Vector3(1.6, 1, 0.55))));
  p.push(piece(new CylinderGeometry(156, 156, 6, 9, 1), '#f4f6f8', new Matrix4().compose(new Vector3(0, 72, 0), new Quaternion(), new Vector3(1.6, 1, 0.5)))); // the tablecloth cloud
  // The two peaks either side.
  p.push(piece(new ConeGeometry(70, 95, 7), '#7c7a72', M(-300, 47, 10)));
  p.push(piece(new ConeGeometry(55, 70, 7), '#7c7a72', M(290, 35, 10)));
  return merge(p);
}

/** The beachfront promenade dressed for Christmas: lamp posts with strings of coloured lights and stars, palms between. */
function promenadeLights() {
  const p = [];
  const colours = ['#ff4a4a', '#ffd23f', '#4ad66d', '#4aa8ff', '#ff8adf'];
  for (let k = 0; k < 9; k += 1) {
    const x = -48 + k * 12;
    p.push(piece(new CylinderGeometry(0.2, 0.25, 6, 6), '#f2f2ee', M(x, 3, 0)));
    p.push(piece(new ConeGeometry(0.9, 1.4, 5), '#ffd23f', M(x, 6.8, 0))); // a star on top
    if (k < 8) for (let j = 1; j < 6; j += 1) {
      const sag = Math.sin((j / 6) * Math.PI) * 1.2;
      p.push(piece(new SphereGeometry(0.28, 6, 5), colours[(k + j) % colours.length], M(x + j * 2, 5.6 - sag, 0)));
    }
    if (k % 2) {
      p.push(piece(new CylinderGeometry(0.25, 0.35, 7, 6), '#8a6a42', M(x + 6, 3.5, -3)));
      p.push(piece(new ConeGeometry(3, 1.6, 7), '#3f8a3a', M(x + 6, 7.4, -3)));
    }
  }
  p.push(box(110, 0.3, 6, 0, 0.15, -1, '#e8dcc0')); // the promenade's paving
  return merge(p);
}

/** Braai fires on the grass by the beach: grills on legs, glowing coals and a puff of smoke over each. */
function braaiFires() {
  const p = [];
  for (const [x, z] of [[-14, 2], [-4, -4], [8, 3], [16, -3]]) {
    p.push(piece(new CylinderGeometry(1.1, 1.1, 0.5, 12), '#2a2a2e', M(x, 1.1, z)));
    p.push(piece(new CylinderGeometry(0.9, 0.9, 0.12, 12), '#ff7a2a', M(x, 1.4, z)));
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [0, 0.8]]) p.push(piece(new CylinderGeometry(0.08, 0.08, 1, 5), '#2a2a2e', M(x + dx, 0.5, z + dz)));
    for (let j = 0; j < 3; j += 1) p.push(piece(new SphereGeometry(0.8 + j * 0.35, 7, 5), '#d8d8d4', M(x + j * 0.5, 3 + j * 1.6, z - j * 0.3)));
    p.push(box(2.4, 0.5, 0.9, x + 2.6, 0.25, z + 1.2, '#3a6aa8')); // a cool box
  }
  return merge(p);
}


// ── Outback Christmas Burst ──────────────────────────────────────────────────

/** A lone homestead in the red desert: a tin-roofed house with a deep veranda hung with Christmas lights, a water tank and a windmill. */
function outbackHomestead() {
  const p = [];
  p.push(box(16, 4, 10, 0, 2, 0, '#d8cbb0'));
  p.push(piece(new ConeGeometry(11.5, 3, 4), '#9aa4ac', new Matrix4().compose(new Vector3(0, 5.5, 0), new Quaternion().setFromAxisAngle(Y, Math.PI / 4), new Vector3(1.05, 1, 0.68))));
  p.push(box(18, 0.25, 4, 0, 3.4, 7, '#9aa4ac')); // the veranda roof
  for (const x of [-8.5, -3, 3, 8.5]) p.push(box(0.25, 3.4, 0.25, x, 1.7, 8.8, '#8a6a42'));
  const colours = ['#ff4a4a', '#ffd23f', '#4ad66d', '#4aa8ff'];
  for (let k = 0; k < 18; k += 1) p.push(piece(new SphereGeometry(0.2, 6, 5), colours[k % 4], M(-8.5 + k, 3.1 - Math.sin((k % 6) / 6 * Math.PI) * 0.3, 9)));
  p.push(...windows(14, 1, 1.8, 5.05));
  // The water tank and the windmill.
  p.push(piece(new CylinderGeometry(2, 2, 3, 12), '#b8bec4', M(12, 4.5, -3)));
  p.push(box(3.6, 3, 3.6, 12, 1.5, -3, '#7a5230'));
  p.push(piece(new CylinderGeometry(0.2, 0.5, 12, 4), '#8a8a8a', M(-14, 6, -4)));
  for (let k = 0; k < 8; k += 1) p.push(piece(new BoxGeometry(0.3, 2.4, 0.08), '#c8c8c8', new Matrix4().compose(new Vector3(-14, 12, -3.6), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (k / 8) * Math.PI * 2), new Vector3(1, 1, 1)).multiply(M(0, 1.2, 0))));
  return merge(p);
}

/** A mob of kangaroos on the gorge floor beside the track, some upright, some grazing. */
function kangarooMob() {
  const p = [];
  const fur = '#a0643a';
  for (const [x, z, yaw, up] of [[-8, 0, 0.4, 1], [-3, 3, -0.3, 0], [2, -1, 0.9, 1], [7, 2, 0.1, 1], [11, -2, -0.6, 0]]) {
    const at = (dx, dy, dz) => turned(x, 0, z, yaw).multiply(M(dx, dy, dz));
    if (up) {
      p.push(piece(new SphereGeometry(0.9, 8, 6), fur, at(0, 1.4, 0).multiply(new Matrix4().makeScale(0.8, 1.4, 0.9))));
      p.push(piece(new SphereGeometry(0.42, 8, 6), fur, at(0, 2.9, 0.25)));
      for (const sx of [-0.15, 0.15]) p.push(piece(new ConeGeometry(0.12, 0.5, 5), fur, at(sx, 3.4, 0.2)));
      p.push(piece(new ConeGeometry(0.28, 1.8, 6), fur, at(0, 0.5, -1).multiply(new Matrix4().makeRotationX(-1.2))));
    } else {
      p.push(piece(new SphereGeometry(0.9, 8, 6), fur, at(0, 0.9, 0).multiply(new Matrix4().makeScale(0.8, 0.8, 1.3))));
      p.push(piece(new SphereGeometry(0.38, 8, 6), fur, at(0, 0.5, 1.2)));
      p.push(piece(new ConeGeometry(0.28, 1.8, 6), fur, at(0, 0.5, -1.4).multiply(new Matrix4().makeRotationX(-1.4))));
    }
  }
  return merge(p);
}


// ── Medellín Lights ──────────────────────────────────────────────────────────

const BULBS = ['#ff3b5c', '#ffd23f', '#3bff8a', '#3bc8ff', '#ff7ae0', '#ffffff'];

/** A row of lit figures along the river bank: big flowers and birds made of lights on thin dark frames (frames lit, bulbs glowing). */
function lightFiguresFrame() {
  const p = [];
  for (let k = 0; k < 5; k += 1) p.push(piece(new CylinderGeometry(0.12, 0.12, 5, 5), '#2a2a30', M(-24 + k * 12, 2.5, 0)));
  p.push(box(56, 0.4, 3, 0, 0.2, 0, '#3a3a40'));
  return merge(p);
}
function lightFiguresGlow() {
  const p = [];
  for (let k = 0; k < 5; k += 1) {
    const x = -24 + k * 12;
    if (k % 2 === 0) {
      // A flower: petals round a centre, on its stem.
      for (let j = 0; j < 6; j += 1) {
        const a = (j / 6) * Math.PI * 2;
        p.push(piece(new SphereGeometry(1.1, 8, 6), BULBS[(k + j) % 5], new Matrix4().compose(new Vector3(x + Math.cos(a) * 1.8, 6.5 + Math.sin(a) * 1.8, 0), new Quaternion(), new Vector3(1, 1, 0.4))));
      }
      p.push(piece(new SphereGeometry(0.9, 8, 6), '#ffd23f', M(x, 6.5, 0.2)));
    } else {
      // A bird: an oval body, a head, two raised wings, all of light.
      p.push(piece(new SphereGeometry(1.4, 8, 6), BULBS[k % 5], new Matrix4().compose(new Vector3(x, 6, 0), new Quaternion(), new Vector3(1.6, 0.8, 0.4))));
      p.push(piece(new SphereGeometry(0.7, 8, 6), BULBS[(k + 2) % 5], M(x + 2.4, 6.8, 0)));
      for (const s of [-1, 1]) p.push(piece(new SphereGeometry(1, 8, 6), BULBS[(k + 3) % 5], new Matrix4().compose(new Vector3(x - 0.4, 7.6, s * 0.3), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.7 * s), new Vector3(1.8, 0.4, 0.3))));
    }
  }
  return merge(p);
}

/** Arches of Christmas lights over the river, one after another, the river below lit by them. */
function lightArchesFrame() {
  const p = [box(16, 0.3, 60, 0, 0.15, 0, '#1e3a4a')]; // the river
  for (let k = 0; k < 6; k += 1) for (const x of [-7, 7]) p.push(box(0.4, 0.6, 0.4, x, 0.3, -25 + k * 10, '#2a2a30'));
  return merge(p);
}
function lightArchesGlow() {
  const p = [];
  for (let k = 0; k < 6; k += 1) {
    const z = -25 + k * 10;
    p.push(piece(new TorusGeometry(7, 0.22, 6, 24, Math.PI), BULBS[k % BULBS.length], M(0, 0.4, z)));
    p.push(piece(new TorusGeometry(6.2, 0.14, 6, 24, Math.PI), BULBS[(k + 3) % BULBS.length], M(0, 0.4, z)));
  }
  return merge(p);
}


// ── Nuremberg Christmas Market Run ───────────────────────────────────────────

const SANDSTONE = '#b06a52';

/** A Gothic church front of red sandstone: two tall towers with pointed spires, a rose window, a great portal. */
function gothicChurchFront() {
  const p = [];
  p.push(box(18, 22, 12, 0, 11, -4, SANDSTONE));
  for (const x of [-11, 11]) {
    p.push(box(8, 34, 8, x, 17, -2, SANDSTONE));
    p.push(piece(new ConeGeometry(5, 16, 8), '#6a4a40', M(x, 42, -2)));
    p.push(...windows(5, 4, 8, 2.05, { x, every: 2.5, gap: 6 }));
  }
  p.push(piece(new ConeGeometry(10, 8, 3), SANDSTONE, turned(0, 26, -4, 0)));
  p.push(piece(new CylinderGeometry(3, 3, 0.4, 16), '#e6c46a', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(0, 15, 2.1))));
  p.push(box(5, 8, 0.4, 0, 4, 2.1, '#3a2a24'));
  p.push(piece(new ConeGeometry(2.8, 3, 3), '#8a4a3a', M(0, 9.4, 2.2)));
  return merge(p);
}

/** Market stalls of the Christmas market selling gingerbread: red-and-white striped roofs, lit counters, hearts hung under the eaves. */
function gingerbreadStands() {
  const p = [];
  for (let k = 0; k < 5; k += 1) {
    const x = -20 + k * 10;
    p.push(box(7, 2.6, 4, x, 1.3, 0, '#7a4a2a'));
    p.push(box(7, 0.2, 1.2, x, 1.4, 2.4, WARM));
    for (let j = 0; j < 6; j += 1) p.push(box(7.6 / 6, 0.3, 5, x - 3.8 + (j + 0.5) * (7.6 / 6), 3.4 + 0.02 * j, 0.4, j % 2 ? '#f4f2ee' : '#c8202a'));
    for (let j = 0; j < 4; j += 1) p.push(piece(new SphereGeometry(0.35, 6, 5), '#9a5a2a', new Matrix4().compose(new Vector3(x - 2.4 + j * 1.6, 2.6, 2.2), new Quaternion(), new Vector3(1, 1, 0.3))));
  }
  return merge(p);
}


// ── Oaxaca Posadas Run ───────────────────────────────────────────────────────

const PICADO = ['#ff3b8a', '#ffb000', '#3bc8ff', '#7ad63b', '#b05aff', '#ff5a3b'];

/** Strings of papel picado (cut paper banners) between tall poles beside the street. */
function papelPicado() {
  const p = [];
  for (let k = 0; k < 5; k += 1) p.push(piece(new CylinderGeometry(0.15, 0.18, 8, 6), '#5a3a2a', M(-24 + k * 12, 4, 0)));
  for (let k = 0; k < 4; k += 1) {
    for (let j = 0; j < 10; j += 1) {
      const x = -24 + k * 12 + 0.6 + j * 1.1;
      const sag = Math.sin(((j + 0.5) / 10) * Math.PI) * 1;
      for (const [y, o] of [[7.4, 0], [5.6, 3]]) p.push(box(0.9, 1.1, 0.04, x, y - sag, 0, PICADO[(j + k + o) % PICADO.length]));
    }
  }
  return merge(p);
}

/** A posada procession: people walking two by two, each with a candle, a lantern carried on a pole at the front. */
function posadaProcession() {
  const p = [];
  const coats = ['#6a2a3a', '#2a3a6a', '#3a5a3a', '#7a5a2a', '#4a2a5a', '#8a3a2a'];
  for (let k = 0; k < 12; k += 1) {
    const x = (k % 2 ? 0.9 : -0.9);
    const z = 10 - Math.floor(k / 2) * 2.4;
    p.push(piece(new CylinderGeometry(0.35, 0.45, 1.5, 7), coats[k % coats.length], M(x, 0.75, z)));
    p.push(piece(new SphereGeometry(0.3, 7, 6), '#c08a5a', M(x, 1.75, z)));
    p.push(piece(new CylinderGeometry(0.05, 0.05, 0.3, 5), '#f4f0e0', M(x + 0.35, 1.3, z + 0.2)));
    p.push(piece(new SphereGeometry(0.1, 5, 4), WARM, M(x + 0.35, 1.5, z + 0.2)));
  }
  p.push(piece(new CylinderGeometry(0.07, 0.07, 3.2, 5), '#5a3a2a', M(0, 1.6, 12.5)));
  p.push(piece(new SphereGeometry(0.5, 8, 6), WARM, M(0, 3.4, 12.5)));
  return merge(p);
}

/** Star piñatas hung from a line between two posts over a little plaza. */
function pinataLine() {
  const p = [];
  for (const x of [-9, 9]) p.push(piece(new CylinderGeometry(0.15, 0.18, 6, 6), '#5a3a2a', M(x, 3, 0)));
  p.push(box(18, 0.06, 0.06, 0, 5.8, 0, '#2a2a2a'));
  for (const [x, c] of [[-5, '#ff3b8a'], [0, '#ffb000'], [5, '#3bc8ff']]) {
    p.push(piece(new SphereGeometry(0.9, 8, 6), c, M(x, 4.4, 0)));
    for (let j = 0; j < 7; j += 1) {
      const a = (j / 7) * Math.PI * 2;
      p.push(piece(new ConeGeometry(0.35, 1.6, 6), PICADO[(j + 1) % PICADO.length], new Matrix4().compose(new Vector3(x + Math.cos(a) * 1.4, 4.4 + Math.sin(a) * 1.4, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), a - Math.PI / 2), new Vector3(1, 1, 1))));
    }
  }
  return merge(p);
}


// ── Belgrade Badnjak Run ─────────────────────────────────────────────────────

/** Christmas Eve bonfires of oak logs (badnjak) in a churchyard, people standing round; logs lit, flames glowing. */
function badnjakFiresFrame() {
  const p = [];
  for (const [x, z] of [[-8, 0], [8, 2]]) {
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2;
      p.push(piece(new CylinderGeometry(0.3, 0.35, 3.4, 6), '#5a3a22', new Matrix4().compose(new Vector3(x + Math.cos(a) * 0.6, 1.2, z + Math.sin(a) * 0.6), new Quaternion().setFromAxisAngle(new Vector3(-Math.sin(a), 0, Math.cos(a)), 0.45), new Vector3(1, 1, 1))));
    }
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      p.push(piece(new CylinderGeometry(0.35, 0.45, 1.5, 7), ['#3a2a2a', '#2a3a5a', '#5a2a2a', '#3a4a3a'][k % 4], M(x + Math.cos(a) * 4, 0.75, z + Math.sin(a) * 4)));
      p.push(piece(new SphereGeometry(0.3, 7, 6), '#c8a07a', M(x + Math.cos(a) * 4, 1.75, z + Math.sin(a) * 4)));
    }
  }
  return merge(p);
}
function badnjakFiresGlow() {
  const p = [];
  for (const [x, z] of [[-8, 0], [8, 2]]) {
    p.push(piece(new ConeGeometry(1.4, 3.6, 7), '#ff7a1a', M(x, 3, z)));
    p.push(piece(new ConeGeometry(0.8, 2.6, 7), '#ffd23f', M(x, 3.4, z)));
    for (let k = 0; k < 6; k += 1) p.push(piece(new SphereGeometry(0.12, 5, 4), '#ffb03f', M(x + Math.sin(k * 2.3) * 1.2, 5.5 + k * 0.9, z + Math.cos(k * 1.7) * 1.2)));
  }
  return merge(p);
}

/** A fortress on its ridge over the meeting of two rivers: long stone walls with square towers and a gate, the rivers below. */
function fortressWalls() {
  const p = [];
  p.push(box(120, 0.3, 40, 0, 0.15, 24, '#3a5a6a')); // the rivers below the ridge
  p.push(box(90, 10, 16, 0, 5, -6, '#6a6a5a')); // the ridge
  const stone = '#a89a82';
  p.push(box(80, 9, 3, 0, 14.5, -2, stone));
  for (let k = 0; k < 20; k += 1) p.push(box(1.6, 1.4, 3, -38 + k * 4, 19.7, -2, stone)); // the battlements
  for (const x of [-40, -20, 0, 20, 40]) {
    p.push(box(7, 15, 7, x, 17.5, -2, '#9a8c74'));
    p.push(spire(8, 4, x, 25, -2, '#7a4a3a'));
  }
  p.push(box(5, 6, 0.4, 0, 13, 1.75, '#2a2420')); // the gate
  return merge(p);
}


// ── Coptic Cairo Lights ──────────────────────────────────────────────────────

/** Coloured metal-and-glass lanterns hung on lines across a lane of old houses (the frames dark, the glass glowing). */
function hangingLanternsFrame() {
  const p = [];
  for (const x of [-16, 16]) p.push(box(6, 9, 30, x, 4.5, 0, '#c8b08a')); // the houses either side
  for (let k = 0; k < 5; k += 1) p.push(box(26, 0.05, 0.05, 0, 8.6, -12 + k * 6, '#2a2a2a'));
  return merge(p);
}
function hangingLanternsGlow() {
  const p = [];
  const glass = ['#ffb03f', '#ff5a3b', '#3bc8ff', '#7ad63b', '#ff7ae0'];
  for (let k = 0; k < 5; k += 1) {
    for (let j = 0; j < 6; j += 1) {
      const x = -11 + j * 4.4;
      const z = -12 + k * 6;
      p.push(piece(new CylinderGeometry(0.35, 0.5, 1, 6), glass[(j + k) % glass.length], M(x, 7.6, z)));
      p.push(piece(new ConeGeometry(0.4, 0.5, 6), glass[(j + k + 2) % glass.length], M(x, 8.3, z)));
    }
  }
  return merge(p);
}

/** An old church and its courtyard in the old quarter (architecture only): pale walls, low domes, two square bell towers, palms. */
function oldChurchCourtyard() {
  const p = [];
  const wall = '#e2d4b4';
  p.push(box(26, 9, 16, 0, 4.5, -4, wall));
  for (const x of [-7, 0, 7]) p.push(piece(new SphereGeometry(3.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#d8c8a4', M(x, 9, -4)));
  for (const x of [-15, 15]) {
    p.push(box(5, 16, 5, x, 8, 2, wall));
    p.push(box(5.6, 1, 5.6, x, 16.5, 2, '#c8b48a'));
    p.push(box(2, 2.6, 0.2, x, 13, 4.55, '#3a2a20'));
  }
  p.push(box(34, 2.4, 0.6, 0, 1.2, 9, wall)); // the courtyard wall
  for (const x of [-10, 10]) {
    p.push(piece(new CylinderGeometry(0.3, 0.45, 9, 6), '#8a6a42', M(x, 4.5, 6)));
    p.push(piece(new ConeGeometry(3.4, 1.8, 7), '#3f8a3a', M(x, 9.4, 6)));
  }
  p.push(...windows(22, 1, 4, 4.05));
  return merge(p);
}


// ── Veliky Ustyug Frost Run ──────────────────────────────────────────────────

const LOG = '#9a6a3a';
const CARVED = '#f2ece0';

/** A carved wooden residence with tall towers and steep roofs, white fretwork round its windows, snow on every roof. */
function woodenResidence() {
  const p = [];
  p.push(box(26, 9, 12, 0, 4.5, 0, LOG));
  p.push(spire(20, 7, 0, 9, 0, '#2f6a8a'));
  for (const x of [-14, 14]) {
    p.push(box(7, 16, 7, x, 8, 1, LOG));
    p.push(piece(new ConeGeometry(5.4, 9, 8), '#2f6a8a', M(x, 20.5, 1)));
    p.push(piece(new ConeGeometry(5.6, 1.4, 8), '#f4f7fa', M(x, 17, 1)));
  }
  p.push(box(8, 20, 8, 0, 10, 2, LOG));
  p.push(piece(new ConeGeometry(6, 12, 8), '#b8323a', M(0, 26, 2)));
  for (const [w, x, y, z] of [[22, 0, 3, 6.05], [6, -14, 11, 4.55], [6, 14, 11, 4.55], [6, 0, 14, 6.05]]) {
    p.push(...windows(w, 1, y, z, { x }));
    p.push(box(w + 0.6, 0.3, 0.15, x, y + 1, z + 0.05, CARVED));
  }
  return merge(p);
}

/** A troika: three horses abreast pulling a painted sleigh, standing in the snow. */
function troika() {
  const p = [];
  for (const [x, c] of [[-1.6, '#4a2e1e'], [0, '#ece4d4'], [1.6, '#2a2220']]) {
    p.push(piece(new BoxGeometry(0.9, 1.1, 2.4), c, M(x, 1.6, 2.2)));
    p.push(piece(new BoxGeometry(0.6, 1.1, 0.7), c, new Matrix4().compose(new Vector3(x, 2.5, 3.5), new Quaternion().setFromAxisAngle(X, 0.5), new Vector3(1, 1, 1))));
    for (const [dx, dz] of [[-0.3, 1.3], [0.3, 1.3], [-0.3, 3.1], [0.3, 3.1]]) p.push(box(0.2, 1.1, 0.2, x + dx, 0.55, dz, c));
  }
  p.push(piece(new TorusGeometry(1.2, 0.12, 6, 16, Math.PI), '#d8302a', M(0, 2.6, 3.3)));
  p.push(box(2.6, 1, 3, 0, 0.8, -1, '#c8202a'));
  p.push(box(2.6, 1.4, 0.3, 0, 1.6, -2.4, '#e6b43c'));
  for (const x of [-1.2, 1.2]) p.push(box(0.15, 0.15, 4.4, x, 0.15, -0.6, '#3a2a20'));
  return merge(p);
}

/** A white church with onion domes (architecture only): a whitewashed body, a bell tower, five domes. */
function onionDomeChurch() {
  const p = [];
  p.push(box(16, 12, 14, 0, 6, 0, '#f4f2ec'));
  for (const [x, z, r, y] of [[0, 0, 3.4, 18], [-5, -4, 2, 15], [5, -4, 2, 15], [-5, 4, 2, 15], [5, 4, 2, 15]]) {
    p.push(piece(new CylinderGeometry(r * 0.75, r * 0.75, 4, 10), '#f4f2ec', M(x, y - 4, z)));
    p.push(piece(new SphereGeometry(r, 12, 9), x === 0 ? '#d8a830' : '#2f6a8a', new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(1, 1.2, 1))));
    p.push(piece(new ConeGeometry(r * 0.3, r * 1.2, 8), x === 0 ? '#d8a830' : '#2f6a8a', M(x, y + r * 1.5, z)));
  }
  p.push(box(5, 22, 5, 0, 11, 10, '#f4f2ec'));
  p.push(piece(new ConeGeometry(3.2, 7, 8), '#2f6a8a', M(0, 25.5, 10)));
  return merge(p);
}


// ── New York Winter Run ──────────────────────────────────────────────────────

/** A sunken ice rink in a plaza between towers, a giant decorated tree above it (frame lit; its lights glow). */
function iceRinkTreeFrame() {
  const p = [];
  p.push(box(30, 0.3, 18, 0, -1.6, 0, '#dfeef6')); // the ice, sunk below the plaza
  for (const [w, d, x, z] of [[34, 2, 0, -10], [34, 2, 0, 10], [2, 18, -17, 0], [2, 18, 17, 0]]) p.push(box(w, 0.4, d, x, -0.2, z, '#b8b4ac'));
  // Skaters.
  for (const [x, z, c] of [[-8, 2, '#c8202a'], [-2, -3, '#2a4a8a'], [5, 4, '#3a6a3a'], [9, -2, '#8a5a2a']]) {
    p.push(piece(new CylinderGeometry(0.3, 0.4, 1.3, 7), c, M(x, -0.85, z)));
    p.push(piece(new SphereGeometry(0.26, 7, 6), '#d8b08a', M(x, 0.05, z)));
  }
  // The tree on the plaza behind the rink.
  p.push(piece(new CylinderGeometry(0.8, 1, 3, 8), '#4a3020', M(0, 1.5, -15)));
  for (let k = 0; k < 4; k += 1) p.push(piece(new ConeGeometry(9 - k * 2, 9, 9), '#1f5a2e', M(0, 6 + k * 5.5, -15)));
  return merge(p);
}
function iceRinkTreeGlow() {
  const p = [];
  for (let k = 0; k < 60; k += 1) {
    const h = 4 + (k / 60) * 24;
    const r = 8.6 * (1 - (h - 3) / 30);
    const a = k * 2.4;
    p.push(piece(new SphereGeometry(0.32, 6, 5), BULBS[k % 5], M(Math.cos(a) * r, h, -15 + Math.sin(a) * r)));
  }
  p.push(piece(new ConeGeometry(1.4, 2.2, 5), '#ffe066', M(0, 30.5, -15)));
  return merge(p);
}


// ── Accra December Beats ─────────────────────────────────────────────────────

/** A ring of drummers and dancers outside the stadium: tall drums, drummers in kente colours, dancers mid-step. */
function drumCircle() {
  const p = [];
  const kente = ['#e2a91c', '#2a7a3a', '#b8302a', '#1f2a5a'];
  for (let k = 0; k < 10; k += 1) {
    const a = (k / 10) * Math.PI * 2;
    const x = Math.cos(a) * 6;
    const z = Math.sin(a) * 6;
    p.push(piece(new CylinderGeometry(0.45, 0.35, 1.3, 8), '#7a4a2a', M(x * 1.15, 0.65, z * 1.15)));
    p.push(piece(new CylinderGeometry(0.46, 0.46, 0.08, 8), '#e8dcc0', M(x * 1.15, 1.32, z * 1.15)));
    p.push(piece(new CylinderGeometry(0.32, 0.4, 1.4, 7), kente[k % 4], M(x, 0.7, z)));
    p.push(piece(new SphereGeometry(0.28, 7, 6), '#5a3a2a', M(x, 1.65, z)));
  }
  for (let k = 0; k < 5; k += 1) {
    const a = (k / 5) * Math.PI * 2 + 0.4;
    const x = Math.cos(a) * 2.6;
    const z = Math.sin(a) * 2.6;
    p.push(piece(new ConeGeometry(0.6, 1.4, 7), kente[(k + 1) % 4], M(x, 0.7, z)));
    p.push(piece(new CylinderGeometry(0.2, 0.25, 0.7, 6), kente[(k + 2) % 4], M(x, 1.65, z)));
    p.push(piece(new SphereGeometry(0.26, 7, 6), '#5a3a2a', M(x, 2.2, z)));
    for (const s of [-1, 1]) p.push(piece(new CylinderGeometry(0.07, 0.07, 0.9, 5), '#5a3a2a', new Matrix4().compose(new Vector3(x + s * 0.4, 2.1, z), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), s * 0.9), new Vector3(1, 1, 1))));
  }
  return merge(p);
}


// ── Sapporo Snow Sculptures ──────────────────────────────────────────────────

const SNOW = '#f2f6fa';
const SNOW_SHADE = '#d8e2ec';

/** Giant snow sculptures along a long park: a castle, a great owl, a bear, a whale's tail (generic shapes, carved snow). */
function snowSculptures() {
  const p = [];
  // A castle.
  p.push(box(16, 8, 10, -30, 4, 0, SNOW));
  for (const x of [-37, -23]) {
    p.push(piece(new CylinderGeometry(2.4, 2.6, 14, 10), SNOW, M(x, 7, 0)));
    p.push(piece(new ConeGeometry(3, 5, 10), SNOW_SHADE, M(x, 16.5, 0)));
  }
  p.push(box(6, 12, 6, -30, 10, 0, SNOW));
  p.push(spire(7, 5, -30, 16, 0, SNOW_SHADE));
  // A great owl.
  p.push(piece(new SphereGeometry(5, 12, 9), SNOW, new Matrix4().compose(new Vector3(-8, 6, 0), new Quaternion(), new Vector3(1, 1.3, 0.9))));
  p.push(piece(new SphereGeometry(3.6, 12, 9), SNOW, M(-8, 13, 0.4)));
  for (const x of [-9.4, -6.6]) p.push(piece(new SphereGeometry(1, 8, 6), SNOW_SHADE, M(x, 13.6, 3.6)));
  for (const x of [-10.6, -5.4]) p.push(piece(new ConeGeometry(0.9, 2.2, 6), SNOW, M(x, 16.6, 0.2)));
  // A bear on all fours.
  p.push(piece(new SphereGeometry(4, 12, 9), SNOW, new Matrix4().compose(new Vector3(12, 4.2, 0), new Quaternion(), new Vector3(1.6, 1, 1))));
  p.push(piece(new SphereGeometry(2.4, 10, 8), SNOW, M(18, 5.6, 0)));
  for (const [x, z] of [[8, -2], [8, 2], [15, -2], [15, 2]]) p.push(piece(new CylinderGeometry(1, 1.1, 3, 8), SNOW, M(x, 1.5, z)));
  // A whale's tail rising from the snow.
  p.push(piece(new CylinderGeometry(1.2, 2.4, 8, 10), SNOW, M(32, 4, 0)));
  for (const sign of [-1, 1]) p.push(piece(new BoxGeometry(6, 1.2, 3), SNOW, new Matrix4().compose(new Vector3(32 + sign * 3, 9, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), sign * 0.35), new Vector3(1, 1, 1))));
  p.push(box(80, 0.6, 14, 0, 0.3, 0, SNOW_SHADE)); // the trampled snow round them
  return merge(p);
}

/** A tall lattice TV tower with a clock band and an observation deck (generic). */
function tvTower() {
  const p = [];
  const steel = '#c8442a';
  for (const [x, z] of [[-4, -4], [4, -4], [4, 4], [-4, 4]]) {
    p.push(piece(new CylinderGeometry(0.4, 0.7, 60, 6), steel, new Matrix4().compose(new Vector3(x * 0.6, 30, z * 0.6), new Quaternion().setFromAxisAngle(new Vector3(z, 0, -x).normalize(), 0.06), new Vector3(1, 1, 1))));
  }
  for (let k = 1; k < 6; k += 1) p.push(box(8 - k * 0.8, 0.4, 8 - k * 0.8, 0, k * 10, 0, steel));
  p.push(box(7, 4, 7, 0, 46, 0, '#e8e4dc'));
  p.push(box(7.2, 1.6, 0.2, 0, 42, 3.6, '#2a2a2a'));
  p.push(box(4.4, 1, 0.22, 0, 42, 3.65, WARM));
  p.push(piece(new CylinderGeometry(0.2, 0.4, 24, 6), steel, M(0, 72, 0)));
  return merge(p);
}

/** Little snow lanterns along a path: hollowed snow mounds, candles glowing inside (glow). */
function snowLanternsFrame() {
  const p = [];
  for (let k = 0; k < 12; k += 1) p.push(piece(new SphereGeometry(0.9, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), SNOW, M(-22 + k * 4, 0, (k % 2) * 2)));
  return merge(p);
}
function snowLanternsGlow() {
  const p = [];
  for (let k = 0; k < 12; k += 1) p.push(piece(new SphereGeometry(0.3, 6, 5), '#ffcf6a', M(-22 + k * 4, 0.35, (k % 2) * 2 + 0.75)));
  return merge(p);
}


// ── Harbin Ice City ──────────────────────────────────────────────────────────

const ICE_GLOW = ['#5ab8ff', '#ff4a5a', '#4aff9a', '#ffcf4a', '#b07aff'];

/** Castles of ice blocks lit from within in colours: halls, towers with pointed tops, a gate (the ice glows). */
function iceCastlesFrame() {
  return merge([box(70, 0.4, 30, 0, 0.2, 0, '#dfeaf2')]);
}
function iceCastlesGlow() {
  const p = [];
  const castle = (cx, cz, s, c0) => {
    p.push(box(14 * s, 9 * s, 8 * s, cx, 4.5 * s, cz, ICE_GLOW[c0 % 5]));
    for (const dx of [-6, 6]) {
      p.push(piece(new CylinderGeometry(2 * s, 2.2 * s, 15 * s, 8), ICE_GLOW[(c0 + 1) % 5], M(cx + dx * s, 7.5 * s, cz)));
      p.push(piece(new ConeGeometry(2.6 * s, 6 * s, 8), ICE_GLOW[(c0 + 2) % 5], M(cx + dx * s, 18 * s, cz)));
    }
    p.push(box(5 * s, 18 * s, 5 * s, cx, 9 * s, cz, ICE_GLOW[(c0 + 3) % 5]));
    p.push(spire(6 * s, 8 * s, cx, 18 * s, cz, ICE_GLOW[(c0 + 4) % 5]));
  };
  castle(-20, 0, 1.2, 0);
  castle(8, -4, 1, 2);
  castle(28, 3, 0.8, 4);
  return merge(p);
}


// ── Queenstown Pōhutukawa Run ────────────────────────────────────────────────

/** Pōhutukawa trees on the lake shore: gnarled spreading trunks, dark green crowns covered in red flowers. */
function pohutukawaTrees() {
  const p = [];
  for (const [x, z, s] of [[-12, 0, 1.2], [0, 4, 1], [11, -2, 1.3], [22, 3, 0.9]]) {
    for (const [dx, dz, lean] of [[-1, 0, 0.5], [1, 0.5, -0.4], [0, -1, 0.2]]) {
      p.push(piece(new CylinderGeometry(0.35 * s, 0.6 * s, 6 * s, 6), '#6a4a34', new Matrix4().compose(new Vector3(x + dx * s, 2.6 * s, z + dz * s), new Quaternion().setFromAxisAngle(new Vector3(dz, 0, -dx).normalize(), lean), new Vector3(1, 1, 1))));
    }
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2;
      const r = k ? 3.4 * s : 0;
      p.push(piece(new SphereGeometry(2.6 * s, 8, 6), '#2f5a32', new Matrix4().compose(new Vector3(x + Math.cos(a) * r, 6.6 * s, z + Math.sin(a) * r), new Quaternion(), new Vector3(1, 0.55, 1))));
      p.push(piece(new SphereGeometry(1.9 * s, 7, 5), '#d42a2a', new Matrix4().compose(new Vector3(x + Math.cos(a + 0.4) * r * 0.9, 7.6 * s, z + Math.sin(a + 0.4) * r * 0.9), new Quaternion(), new Vector3(1, 0.45, 1))));
    }
  }
  return merge(p);
}


// ── Sydney Harbour New Year ──────────────────────────────────────────────────

/** A great steel arch bridge across the harbour (generic): the arch over the deck, granite pylons at each end, the water below. */
function harbourArchBridge() {
  const p = [];
  const steel = '#7a8088';
  p.push(box(260, 0.3, 60, 0, 0.15, 0, '#2a4a6a')); // the harbour
  const span = 150;
  const rise = 46;
  const N = 24;
  for (const z of [-5, 5]) {
    for (let k = 0; k < N; k += 1) {
      const u0 = k / N;
      const u1 = (k + 1) / N;
      const x0 = -span / 2 + u0 * span;
      const x1 = -span / 2 + u1 * span;
      const y0 = 10 + rise * 4 * u0 * (1 - u0);
      const y1 = 10 + rise * 4 * u1 * (1 - u1);
      const len = Math.hypot(x1 - x0, y1 - y0);
      p.push(piece(new BoxGeometry(len, 2.4, 1.6), steel, new Matrix4().compose(new Vector3((x0 + x1) / 2, (y0 + y1) / 2, z), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.atan2(y1 - y0, x1 - x0)), new Vector3(1, 1, 1))));
      if (k % 2 === 0 && y0 > 22) p.push(box(0.5, y0 - 22, 0.5, x0, 22 + (y0 - 22) / 2, z, steel)); // hangers down to the deck
    }
  }
  p.push(box(span + 60, 1.6, 14, 0, 22, 0, '#5a6068')); // the deck
  for (const x of [-span / 2 - 6, span / 2 + 6]) {
    p.push(box(12, 34, 16, x, 17, 0, '#c8bca4'));
    p.push(box(13, 2, 17, x, 35, 0, '#b8ac94'));
  }
  return merge(p);
}


// ── Edinburgh Hogmanay Grand Prix ────────────────────────────────────────────

/** A castle on its crag of dark volcanic rock above the old town (generic): curtain walls, a keep, round towers, lit windows. */
function castleRock() {
  const p = [];
  const rock = '#4a4a4e';
  p.push(piece(new CylinderGeometry(26, 36, 36, 9), rock, new Matrix4().compose(new Vector3(0, 18, 0), new Quaternion(), new Vector3(1.2, 1, 0.8))));
  p.push(piece(new CylinderGeometry(24, 26, 10, 9), '#3f3f44', new Matrix4().compose(new Vector3(0, 41, -2), new Quaternion(), new Vector3(1.2, 1, 0.8))));
  const stone = '#9a9284';
  const y = 46;
  p.push(box(56, 8, 2, 0, y + 4, 14, stone));
  for (let k = 0; k < 14; k += 1) p.push(box(2, 1.4, 2.2, -26 + k * 4, y + 8.7, 14, stone));
  p.push(box(20, 18, 14, -8, y + 9, 0, stone));
  p.push(...windows(18, 3, y + 5, 7.05, { x: -8 }));
  p.push(spire(14, 6, -8, y + 18, 0, '#5a5a62'));
  for (const [x, z, h] of [[-28, 14, 14], [28, 14, 14], [16, 2, 22]]) {
    p.push(piece(new CylinderGeometry(3.4, 3.6, h, 10), stone, M(x, y + h / 2, z)));
    p.push(piece(new CylinderGeometry(3.9, 3.9, 1.2, 10), '#8a8274', M(x, y + h + 0.6, z)));
  }
  p.push(box(14, 10, 10, 16, y + 5, -8, stone));
  p.push(...windows(12, 2, y + 3, -2.95, { x: 16 }));
  return merge(p);
}

/** Landmarks by name: builder and footprint radius. */
export const HOLIDAY_LANDMARKS = {
  'chateau-hotel': { build: chateauHotel, radius: 34 },
  'toboggan-slide': { build: tobogganSlide, radius: 30 },
  'flat-top-mountain': { build: flatTopMountain, radius: 60 },
  'promenade-lights': { build: promenadeLights, radius: 20 },
  'braai-fires': { build: braaiFires, radius: 16 },
  'outback-homestead': { build: outbackHomestead, radius: 18 },
  'kangaroo-mob': { build: kangarooMob, radius: 13 },
  'light-figures': { build: lightFiguresFrame, glow: lightFiguresGlow, radius: 30 },
  'light-arches': { build: lightArchesFrame, glow: lightArchesGlow, radius: 32 },
  'gothic-church-front': { build: gothicChurchFront, radius: 18 },
  'gingerbread-stands': { build: gingerbreadStands, radius: 26 },
  'papel-picado': { build: papelPicado, radius: 26 },
  'posada-procession': { build: posadaProcession, radius: 9 },
  'pinata-line': { build: pinataLine, radius: 10 },
  'badnjak-fires': { build: badnjakFiresFrame, glow: badnjakFiresGlow, radius: 14 },
  'fortress-walls': { build: fortressWalls, radius: 50 },
  'hanging-lanterns': { build: hangingLanternsFrame, glow: hangingLanternsGlow, radius: 20 },
  'old-church-courtyard': { build: oldChurchCourtyard, radius: 20 },
  'wooden-residence': { build: woodenResidence, radius: 20 },
  troika: { build: troika, radius: 5 },
  'onion-dome-church': { build: onionDomeChurch, radius: 16 },
  'ice-rink-tree': { build: iceRinkTreeFrame, glow: iceRinkTreeGlow, radius: 20 },
  'drum-circle': { build: drumCircle, radius: 9 },
  'snow-sculptures': { build: snowSculptures, radius: 42 },
  'tv-tower': { build: tvTower, radius: 8 },
  'snow-lanterns': { build: snowLanternsFrame, glow: snowLanternsGlow, radius: 24 },
  'ice-castles': { build: iceCastlesFrame, glow: iceCastlesGlow, radius: 38 },
  'pohutukawa-trees': { build: pohutukawaTrees, radius: 28 },
  'harbour-arch-bridge': { build: harbourArchBridge, radius: 90 },
  'castle-rock': { build: castleRock, radius: 44 },
};
