/**
 * Billboards beside kit tracks (track kit, step 5). Every board is the same
 * 6 m by 3 m panel taking a 2:1 image (1024 x 512), so one artwork fits every
 * track; a themed frame (plain, wood, led, column, crates) is a costume for it.
 * The kit places them (physics.kit.billboards: slot, at, side, frame); here
 * they stand on the bank just outside the rim, angled toward the follow camera.
 *
 * All the panels share one picture (an atlas, one cell per slot) and all the
 * frames one mesh: two draw calls however many boards. Each cell starts with a
 * built-in promotion of our own and is painted over when the server's image
 * for that slot loads (setImages); an image that fails leaves the promotion,
 * so a board is never blank. Drawing only: the race never sees them.
 */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Matrix4, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, Quaternion, SphereGeometry, SRGBColorSpace, Vector3,
} from 'three';
import { channelLipAt, channelRadiusAt } from './iceChannel';
import { merge, piece } from './scenery/parts';

export const PANEL = { width: 6, height: 3 }; // metres: a 2:1 image
const RIM_WIDTH = 0.45;
const OUT = 2.6;      // metres from the rim's outer edge to the board's middle
const LIFT = 1.1;     // metres from the rim top to the panel's bottom edge
const TOWARD = 0.42;  // radians the board turns from facing straight up the track toward the track
const COLS = 2;
const UP = new Vector3(0, 1, 0);

/** Our own promotions, shown until (or unless) the server hands a slot an image. */
export const PROMOTIONS = [
  { title: 'MARBLE RACE', line: 'Pick your marble. Join the next race.', bg: ['#1d4ed8', '#0b1f5c'], ink: '#ffffff', accent: '#ffd21f' },
  { title: 'NEW MARBLES', line: 'Fresh colours and finishes every season', bg: ['#e23b3b', '#7a1020'], ink: '#ffffff', accent: '#ffe7a8' },
  { title: 'CLIMB THE LADDER', line: 'Every race counts toward your ranking', bg: ['#0f9d8a', '#05453d'], ink: '#ffffff', accent: '#b6f5e8' },
  { title: 'LIMITED EDITIONS', line: 'Collect them before they roll away', bg: ['#7a3fd0', '#2b0f5c'], ink: '#ffffff', accent: '#ffd21f' },
  { title: 'RACE YOUR FRIENDS', line: 'Share the link, meet them at the gate', bg: ['#f2a23a', '#a3460c'], ink: '#1b1b1b', accent: '#ffffff' },
  { title: 'WATCH THE REPLAY', line: 'Every race, every overtake, any angle', bg: ['#2c3e66', '#0d1426'], ink: '#ffffff', accent: '#7fd3ff' },
];

/** Paints a promotion into the cell at (x, y, w, h) of a 2D canvas context. */
export function paintPromotion(g, promo, x, y, w, h) {
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, promo.bg[0]);
  grad.addColorStop(1, promo.bg[1]);
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
  // A row of marbles rolling along the bottom.
  const r = h * 0.075;
  const colours = ['#e23b3b', '#ffd21f', '#2fb3a0', '#3f7fd8', '#ffffff', '#f2a23a'];
  for (let k = 0; k < 6; k += 1) {
    const cx = x + w * (0.62 + k * 0.065);
    const cy = y + h * 0.8;
    g.fillStyle = colours[k];
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = promo.accent;
  g.fillRect(x + w * 0.06, y + h * 0.17, w * 0.1, h * 0.035);
  g.fillStyle = promo.ink;
  g.textBaseline = 'alphabetic';
  g.font = `900 ${Math.round(h * 0.2)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.fillText(promo.title, x + w * 0.06, y + h * 0.43, w * 0.88);
  g.font = `600 ${Math.round(h * 0.085)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.fillText(promo.line, x + w * 0.06, y + h * 0.6, w * 0.88);
}

// ── Frames: costumes for the panel. Origin at the foot, panel facing +z. ────
// Each returns coloured pieces; `bottom` is the panel's bottom edge above the foot.
const W = PANEL.width;
const H = PANEL.height;
const at = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const box = (w, h, d, x, y, z, c) => piece(new BoxGeometry(w, h, d), c, at(x, y, z));
const border = (bottom, t, d, c) => [
  box(W + 2 * t, t, d, 0, bottom - t / 2, 0, c),
  box(W + 2 * t, t, d, 0, bottom + H + t / 2, 0, c),
  box(t, H, d, -W / 2 - t / 2, bottom + H / 2, 0, c),
  box(t, H, d, W / 2 + t / 2, bottom + H / 2, 0, c),
];
const back = (bottom, c) => box(W, H, 0.12, 0, bottom + H / 2, -0.1, c);
const BURY = 9; // legs reach this far below the foot, so they meet the ground however it falls away

export const FRAMES = {
  plain: (bottom) => [
    ...border(bottom, 0.16, 0.3, '#3b4048'),
    back(bottom, '#2a2e35'),
    ...[-1.8, 1.8].map((x) => box(0.22, bottom + BURY, 0.22, x, (bottom - BURY) / 2, -0.25, '#59606b')),
  ],
  wood: (bottom) => [
    ...border(bottom, 0.3, 0.35, '#7a5230'),
    back(bottom, '#5e3d22'),
    box(W + 1.2, 0.18, 0.9, 0, bottom + H + 0.45, 0.1, '#4f8a3a'), // a little roof of leaves
    ...[-2.6, 2.6].map((x) => piece(new CylinderGeometry(0.2, 0.26, bottom + BURY + H + 0.5, 6), '#6b4a2f', at(x, (bottom + H + 0.5 - BURY) / 2, -0.2))),
  ],
  led: (bottom) => [
    ...border(bottom, 0.22, 0.45, '#0d0f12'),
    back(bottom, '#0d0f12'),
    box(W + 0.44, 0.08, 0.5, 0, bottom - 0.3, 0.02, '#2fb3ff'), // a lit strip under the screen
    box(0.7, bottom + BURY, 0.5, 0, (bottom - BURY) / 2, -0.25, '#1b1f25'),
  ],
  column: (bottom) => [
    ...border(bottom, 0.2, 0.32, '#1f4d3a'),
    back(bottom, '#173a2c'),
    // Paris style: green cast iron, a gilt trim, a small dome on top.
    box(W + 0.4, 0.06, 0.36, 0, bottom + H + 0.23, 0, '#c9a33a'),
    piece(new SphereGeometry(0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#1f4d3a', at(0, bottom + H + 0.25, 0)),
    piece(new SphereGeometry(0.16, 8, 6), '#c9a33a', at(0, bottom + H + 1.0, 0)),
    ...[-2.4, 2.4].map((x) => piece(new CylinderGeometry(0.16, 0.24, bottom + BURY, 8), '#1f4d3a', at(x, (bottom - BURY) / 2, -0.2))),
  ],
  crates: (bottom) => {
    // Expedition supply crates stacked under each end.
    const crate = (x, y, s, c) => [box(s, s, s, x, y, -0.3, c), box(s + 0.04, 0.08, s + 0.04, x, y, -0.3, '#3c2a18')];
    return [
      ...border(bottom, 0.14, 0.3, '#3c2a18'),
      back(bottom, '#4a3520'),
      ...[-2.3, 2.3].flatMap((x) => [
        ...crate(x, -BURY / 2 + 0.2, 1.1, '#8a6a45'),
        box(1.1, BURY - 1.6, 1.1, x, -BURY / 2 - 0.2, -0.3, '#7b5d3c'),
        ...crate(x, bottom - 0.55, 1.1, x < 0 ? '#a07a4c' : '#c43c2a'),
      ]),
    ];
  },
  // Our fantasy worlds: a cloth banner hung from a pole between two staves, tassels at its foot.
  banner: (bottom) => [
    ...border(bottom, 0.12, 0.2, '#8a2a24'),
    back(bottom, '#6b1f1a'),
    box(W + 1.4, 0.22, 0.22, 0, bottom + H + 0.35, 0, '#6b4a2f'),
    ...[-W / 2 - 0.55, W / 2 + 0.55].map((x) => piece(new CylinderGeometry(0.13, 0.17, bottom + BURY + H + 1.2, 6), '#5a3f2a', at(x, (bottom + H + 1.2 - BURY) / 2, 0))),
    ...[-W / 2 - 0.55, W / 2 + 0.55].map((x) => piece(new ConeGeometry(0.28, 0.6, 6), '#e0b43c', at(x, bottom + H + 1.5, 0))),
    ...[-1.5, 0, 1.5].map((x) => box(0.18, 0.5, 0.05, x, bottom - 0.3, 0.05, '#e0b43c')),
  ],
};

/** Where board `b` stands and which way it faces: { foot, quaternion }. */
export function boardPose(centerline, channel, b) {
  const { samples, segments } = centerline;
  const i = Math.min(segments, Math.max(0, Math.round(b.at * segments)));
  const s = samples[i];
  const sArc = (i / segments) * channel.arc;
  const R = channelRadiusAt(channel, sArc);
  const lip = channelLipAt(channel, sArc);
  const side = new Vector3(s.side.x, 0, s.side.z).normalize().multiplyScalar(b.side);
  const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
  const foot = s.pos.clone().addScaledVector(side, R * Math.sin(lip) + RIM_WIDTH + OUT);
  foot.y = s.pos.y + R * (1 - Math.cos(lip));
  // Facing back up the track, turned a little toward it.
  const facing = along.clone().negate().multiplyScalar(Math.cos(TOWARD)).addScaledVector(side, -Math.sin(TOWARD)).normalize();
  const quaternion = new Quaternion().setFromAxisAngle(UP, Math.atan2(facing.x, facing.z));
  return { foot, quaternion, facing };
}

/**
 * The billboards for a kit track: { group, setImages(list), slots, dispose } or
 * null when it has none. `lite`: a smaller picture (phones).
 */
export function buildBillboards(centerline, channel, kit, { lite = false } = {}) {
  const boards = kit?.billboards ?? [];
  if (!channel || !boards.length) return null;
  const cell = lite ? { w: 512, h: 256 } : { w: 1024, h: 512 };
  const rows = Math.ceil(boards.length / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = cell.w * COLS;
  canvas.height = cell.h * rows;
  const g = canvas.getContext('2d');
  const cellOf = (k) => ({ x: (k % COLS) * cell.w, y: Math.floor(k / COLS) * cell.h });
  boards.forEach((b, k) => {
    const { x, y } = cellOf(k);
    paintPromotion(g, PROMOTIONS[(b.slot - 1) % PROMOTIONS.length], x, y, cell.w, cell.h);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = lite ? 1 : 4;

  const framePieces = [];
  const panel = { pos: [], uv: [] };
  boards.forEach((b, k) => {
    const { foot, quaternion } = boardPose(centerline, channel, b);
    const m = new Matrix4().compose(foot, quaternion, new Vector3(1, 1, 1));
    for (const p of (FRAMES[b.frame] ?? FRAMES.plain)(LIFT)) framePieces.push(p.applyMatrix4(m));
    // The panel: one quad, its cell of the picture.
    const corners = [[-W / 2, LIFT], [W / 2, LIFT], [W / 2, LIFT + H], [-W / 2, LIFT + H]].map(([x, y]) => new Vector3(x, y, 0.02).applyMatrix4(m));
    const { x, y } = cellOf(k);
    const u0 = x / canvas.width;
    const u1 = (x + cell.w) / canvas.width;
    const vTop = 1 - y / canvas.height;
    const vBottom = 1 - (y + cell.h) / canvas.height;
    const uvs = [[u0, vBottom], [u1, vBottom], [u1, vTop], [u0, vTop]];
    for (const n of [0, 1, 2, 0, 2, 3]) {
      panel.pos.push(corners[n].x, corners[n].y, corners[n].z);
      panel.uv.push(...uvs[n]);
    }
  });
  const group = new Group();
  group.name = 'billboards';
  const frames = new Mesh(merge(framePieces.map((p) => {
    if (!p.getAttribute('normal')) p.computeVertexNormals();
    return p;
  })), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  frames.name = 'billboard frames';
  group.add(frames);
  const pg = new BufferGeometry();
  pg.setAttribute('position', new Float32BufferAttribute(panel.pos, 3));
  pg.setAttribute('uv', new Float32BufferAttribute(panel.uv, 2));
  pg.computeVertexNormals();
  // Unlit, so the artwork shows its own colours (the frame around it is lit like the rest).
  const panels = new Mesh(pg, new MeshBasicMaterial({ map: texture }));
  panels.name = 'billboard panels';
  group.add(panels);

  let generation = 0;
  /**
   * Puts the server's images on their slots ([{ slot, image_url }]); any slot not
   * listed, or whose image fails to load, keeps its built-in promotion.
   */
  const setImages = (list = []) => {
    generation += 1;
    const mine = generation;
    for (const { slot, image_url: url } of list) {
      const k = boards.findIndex((b) => b.slot === slot);
      if (k < 0 || typeof url !== 'string' || !/^https:\/\//.test(url) || typeof Image === 'undefined') continue;
      const img = new Image();
      img.crossOrigin = 'anonymous'; // (painted into the shared picture: the image must allow it)
      img.decoding = 'async';
      img.onload = () => {
        if (mine !== generation) return;
        const { x, y } = cellOf(k);
        try {
          g.drawImage(img, x, y, cell.w, cell.h);
          texture.needsUpdate = true;
        } catch {
          // A picture that may not be painted keeps the promotion.
        }
      };
      img.src = url;
    }
  };
  const dispose = () => {
    generation += 1;
    texture.dispose();
  };
  return { group, setImages, slots: boards.map((b) => b.slot), dispose };
}
