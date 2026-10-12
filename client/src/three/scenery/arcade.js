/**
 * Arcade worlds (kit tracks of the arcade family): every track is a world inside the
 * machine. Looks only: the race is exactly the ice channel's.
 *
 *   buildArcade: a giant cabinet behind the gate (our own side art, a lit marquee with the
 *     track's name, the screen showing PLAYER 1 READY and then 3-2-1 GO on the race clock,
 *     a control panel with a joystick and buttons that the gate sits at the edge of), a
 *     high-score table past the finish where the winner's three initials go up at the top
 *     with the call-out (NEW HIGH SCORE!), and pixel bursts once the winner is home.
 *     All the pictures are one small canvas drawn in big square pixels (nearest-pixel
 *     filtering), so the whole thing is three draws: the cabinet, the pictures and the bursts.
 *
 * All art is original: no game's characters, logos, cabinet art or typefaces. The letters
 * are the browser's own monospace face, drawn small and blown up into pixels.
 */
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, PlaneGeometry, Points, PointsMaterial,
  Quaternion, SphereGeometry, SRGBColorSpace, Vector3,
} from 'three';
import { merge, piece } from './parts';

const UP = new Vector3(0, 1, 0);
export const CABINET = { back: 34, width: 46, height: 72, depth: 20 }; // metres: behind the gate, its size
const SCREEN = { width: 34, height: 25, y: 34 };    // the screen's size and the height of its middle
const MARQUEE = { width: 42, height: 9, y: 63 };
const BOARD = { width: 30, height: 26, lift: 12 };  // the high-score table past the finish
const BURSTS = 6;
const BURST_PIXELS = 48;
const BURST_GAP = 420;   // ms between bursts
const BURST_LIFE = 1300; // ms each lasts
const BURSTS_FOR = 9000; // ms of bursts after the winner is home

/** Each art style's colours (all original art): sky top and bottom, ink, glow, accent. */
export const ART = {
  maze: { sky: ['#05051a', '#1a0a4a'], ink: '#0a0a24', glow: '#3fd8ff', accent: '#ffd23f' },
  'coin-op': { sky: ['#140a2a', '#5a0a6a'], ink: '#0a0612', glow: '#ff3fa8', accent: '#ffd23f' },
  space: { sky: ['#02020c', '#0a1a4a'], ink: '#04040e', glow: '#7dff6a', accent: '#ff4fd8' },
  'side-scroller': { sky: ['#2a6aff', '#7ad8ff'], ink: '#1a2a5a', glow: '#ffd23f', accent: '#ff5a3a' },
  fighter: { sky: ['#0a0a1a', '#4a0a2a'], ink: '#06060a', glow: '#ff3f3f', accent: '#ffd23f' },
  highway: { sky: ['#2a0a4a', '#ff6a8a'], ink: '#1a0a2a', glow: '#ff3fa8', accent: '#3fd8ff' },
  downtown: { sky: ['#06061a', '#2a1a5a'], ink: '#04040c', glow: '#3fd8ff', accent: '#ff7a1a' },
};

// The picture: one small canvas, drawn in pixels. Regions (x, y, w, h) in its pixels.
const PX = { w: 256, h: 256 };
const R = {
  marquee: [0, 0, 256, 56],
  screen: [0, 56, 128, 96],
  board: [128, 56, 128, 112],
  side: [0, 152, 128, 104],
};

function text(g, s, x, y, size, colour, align = 'center') {
  g.font = `bold ${size}px monospace`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = colour;
  g.fillText(s, x, y);
}

/** The side art: the style's sky and a few big original shapes. */
function paintSide(g, art, c) {
  const [x0, y0, w, h] = R.side;
  g.save();
  g.translate(x0, y0);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, c.sky[0]);
  sky.addColorStop(1, c.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = c.glow;
  if (art === 'maze') {
    for (let k = 0; k < 6; k += 1) g.fillRect(8 + k * 19, 10, 3, 80 - (k % 3) * 18);
    g.fillRect(8, 88, 110, 3);
    g.fillStyle = c.accent;
    for (let k = 0; k < 10; k += 1) g.fillRect(16 + k * 10, 50, 3, 3);
  } else if (art === 'space') {
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 30; k += 1) g.fillRect((k * 37) % w, (k * 53) % h, 1, 1);
    g.fillStyle = c.glow;
    for (let r = 0; r < 3; r += 1) for (let k = 0; k < 5; k += 1) g.fillRect(14 + k * 22, 14 + r * 14, 10, 6);
    g.fillStyle = c.accent;
    g.fillRect(56, 84, 16, 6);
  } else if (art === 'highway') {
    g.fillStyle = c.accent;
    g.fillRect(0, 70, w, 2);
    for (let k = 0; k < 9; k += 1) g.fillRect(64 - 4 * (k - 4) * 3, 72, 1, h);
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.arc(64, 64, 22, Math.PI, 0); g.fill();
    g.fillStyle = c.sky[1];
    for (let k = 0; k < 4; k += 1) g.fillRect(40, 48 + k * 5, 48, 2);
  } else {
    g.fillStyle = c.glow;
    for (let k = 0; k < 7; k += 1) g.fillRect(6 + k * 17, 40 + ((k * 13) % 30), 12, h);
    g.fillStyle = c.accent;
    for (let k = 0; k < 12; k += 1) g.fillRect(10 + (k * 23) % 110, 50 + ((k * 17) % 40), 3, 4);
  }
  g.restore();
}

/** The marquee: the style's colours behind the track's name in big pixel letters, a frame of lights. */
function paintMarquee(g, c, title) {
  const [x0, y0, w, h] = R.marquee;
  g.save();
  g.translate(x0, y0);
  const sky = g.createLinearGradient(0, 0, w, 0);
  sky.addColorStop(0, c.sky[1]);
  sky.addColorStop(0.5, c.sky[0]);
  sky.addColorStop(1, c.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const size = Math.min(30, Math.floor((w * 0.92) / (Math.max(6, title.length) * 0.62)));
  text(g, title, w / 2 + 1, h / 2 + 2, size, c.ink);
  text(g, title, w / 2, h / 2, size, c.glow);
  g.fillStyle = c.accent;
  for (let k = 0; k < 32; k += 1) { g.fillRect(k * 8 + 2, 1, 3, 3); g.fillRect(k * 8 + 2, h - 4, 3, 3); }
  g.restore();
}

/** The screen at time t: PLAYER 1 READY, then 3, 2, 1 and GO!, then the track's name. */
function screenLabel(t, countdownMs) {
  if (t < -countdownMs) return { top: 'PLAYER 1', big: 'READY' };
  if (t < 0) return { top: 'PLAYER 1 READY', big: String(Math.min(3, Math.ceil(-t / (countdownMs / 3)))) };
  if (t < 2000) return { top: 'PLAYER 1 READY', big: 'GO!' };
  return { top: 'PLAYER 1', big: 'PLAY' };
}

function paintScreen(g, c, label) {
  const [x0, y0, w, h] = R.screen;
  g.save();
  g.translate(x0, y0);
  g.fillStyle = '#04060a';
  g.fillRect(0, 0, w, h);
  text(g, label.top, w / 2, h * 0.24, 11, c.accent);
  text(g, label.big, w / 2, h * 0.62, label.big.length > 3 ? 22 : 40, c.glow);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1); // the scanlines
  g.restore();
}

// The high-score table's other rows: initials of our own.
const HOUSE = [['ACE', '58.20'], ['MRB', '59.75'], ['ICE', '61.40'], ['RUN', '63.05']];

function paintBoard(g, c, winner, finish, blink) {
  const [x0, y0, w, h] = R.board;
  g.save();
  g.translate(x0, y0);
  g.fillStyle = '#04060a';
  g.fillRect(0, 0, w, h);
  text(g, 'HIGH SCORES', w / 2, 10, 11, c.accent);
  const rows = winner ? [[winner.initials, winner.time], ...HOUSE] : [['---', '--.--'], ...HOUSE];
  rows.forEach(([ini, time], k) => {
    const y = 28 + k * 15;
    const colour = k === 0 && winner ? (blink ? '#ffffff' : c.glow) : '#c8ccd8';
    text(g, `${['1ST', '2ND', '3RD', '4TH', '5TH'][k]} ${ini} ${time}`, w / 2, y, 10, colour);
  });
  if (winner && blink) text(g, finish, w / 2, h - 10, 10, c.glow);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
  g.restore();
}

/** Three initials from a marble's name: its first three letters, upper case (dots if it has fewer). */
export function initialsOf(name) {
  const letters = String(name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (letters + '...').slice(0, 3);
}

/** A quad of `w` by `h` (centred at x, y, z) showing region `r` of the picture. */
function quad(w, h, x, y, z, [rx, ry, rw, rh]) {
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  const u0 = rx / PX.w;
  const u1 = (rx + rw) / PX.w;
  const v1 = 1 - ry / PX.h;
  const v0 = 1 - (ry + rh) / PX.h;
  for (let k = 0; k < uv.count; k += 1) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
  g.translate(x, y, z);
  return g.toNonIndexed();
}

/**
 * The arcade machine round a kit track: { group, update(t, ctx), feet, dispose }.
 * groundAt(x, z): the land's height; pen: the catch area past the finish; countdownMs: the gate's countdown.
 */
export function buildArcade(centerline, channel, kit, { lite = false, groundAt, pen, countdownMs = 3000 }) {
  const ar = kit.arcade ?? {};
  const c = ART[ar.art] ?? ART['coin-op'];
  const { samples, segments } = centerline;
  const group = new Group();
  group.name = 'arcade';
  const feet = [];
  const owned = [];
  const lambert = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  owned.push(lambert);
  const solid = [];
  const quads = [];

  // ── The picture ──
  const canvas = document.createElement('canvas');
  canvas.width = PX.w;
  canvas.height = PX.h;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#000000';
  g.fillRect(0, 0, PX.w, PX.h);
  paintMarquee(g, c, ar.title ?? '');
  paintSide(g, ar.art, c);
  const picture = new CanvasTexture(canvas);
  picture.colorSpace = SRGBColorSpace;
  picture.magFilter = NearestFilter;
  picture.minFilter = NearestFilter;
  picture.generateMipmaps = false;
  const pictureMat = new MeshBasicMaterial({ map: picture, side: DoubleSide, fog: false });
  owned.push(picture, pictureMat);

  // ── The cabinet, behind the gate, facing down the track ──
  const s0 = samples[0];
  const back = new Vector3(-s0.tangent.x, 0, -s0.tangent.z).normalize();
  const foot = s0.pos.clone().addScaledVector(back, CABINET.back);
  foot.y = Math.min(groundAt(foot.x, foot.z), s0.pos.y - 20);
  const yaw = Math.atan2(-back.x, -back.z);
  const place = new Matrix4().compose(foot, new Quaternion().setFromAxisAngle(UP, yaw), new Vector3(1, 1, 1));
  const { width: W, height: H, depth: D } = CABINET;
  const at = (x, y, z) => new Matrix4().makeTranslation(x, y, z).premultiply(place);
  const box = (w, h, d, x, y, z, colour) => solid.push(piece(new BoxGeometry(w, h, d), colour, at(x, y, z)));
  box(W, H, D, 0, H / 2, -D / 2, '#141018'); // the body
  for (const x of [-W / 2 - 0.6, W / 2 + 0.6]) box(1.2, H + 1, D + 1, x, H / 2, -D / 2, c.sky[1]); // the side panels
  box(W + 2.4, 1.2, D + 2, 0, H + 0.6, -D / 2, '#c8ccd2');
  box(SCREEN.width + 3, SCREEN.height + 3, 1.4, 0, SCREEN.y, 0.2, '#08080c'); // the bezel
  box(MARQUEE.width + 2, MARQUEE.height + 2, 2, 0, MARQUEE.y, 0.4, '#08080c');
  // The control panel: a deck from the cabinet to just behind the gate, a little below it.
  const deckTop = s0.pos.y - 2.2 - foot.y;
  const deckLen = CABINET.back - 4;
  box(W, 2, deckLen, 0, deckTop - 1, deckLen / 2, '#1a1a24');
  box(W, 0.4, deckLen, 0, deckTop + 0.2, deckLen / 2, c.ink);
  for (const x of [-W / 2, W / 2]) box(0.8, 0.8, deckLen, x, deckTop + 0.4, deckLen / 2, c.glow);
  box(W, deckTop, 2, 0, deckTop / 2, deckLen, '#141018'); // its front, down to the ground
  // A joystick on one side, a row of big buttons on the other (clear of the gate's bowl).
  const stickX = -W / 2 + 7;
  solid.push(piece(new CylinderGeometry(3.4, 3.8, 0.8, 16), '#08080c', at(stickX, deckTop + 0.6, deckLen * 0.45)));
  solid.push(piece(new CylinderGeometry(0.7, 0.7, 7, 10), '#c8ccd2', at(stickX, deckTop + 4, deckLen * 0.45)));
  solid.push(piece(new SphereGeometry(2.4, 14, 10), c.accent, at(stickX, deckTop + 8.2, deckLen * 0.45)));
  const buttons = [c.glow, c.accent, '#3fd8ff', '#7dff6a'];
  buttons.forEach((colour, k) => {
    const x = W / 2 - 6 - (k % 2) * 6;
    const z = deckLen * (0.3 + Math.floor(k / 2) * 0.3);
    solid.push(piece(new CylinderGeometry(2.4, 2.4, 0.6, 16), '#08080c', at(x, deckTop + 0.5, z)));
    solid.push(piece(new CylinderGeometry(2, 2, 1.4, 16), colour, at(x, deckTop + 1.2, z)));
  });
  // The pictures on the cabinet: the marquee, the screen and both side panels.
  const facePlace = (m) => { m.applyMatrix4(place); return m; };
  quads.push(facePlace(quad(MARQUEE.width, MARQUEE.height, 0, MARQUEE.y, 1.5, R.marquee)));
  quads.push(facePlace(quad(SCREEN.width, SCREEN.height, 0, SCREEN.y, 1.0, R.screen)));
  for (const sign of [-1, 1]) {
    const q = quad(D * 0.9, H * 0.7, 0, 0, 0, R.side);
    q.applyMatrix4(new Matrix4().makeRotationY(sign * Math.PI / 2));
    q.applyMatrix4(new Matrix4().makeTranslation(sign * (W / 2 + 1.25), H * 0.45, -D / 2));
    quads.push(facePlace(q));
  }
  feet.push({ x: foot.x, z: foot.z, r: W / 2 + 10 });
  feet.push({ x: foot.x - back.x * deckLen * 0.5, z: foot.z - back.z * deckLen * 0.5, r: W / 2 + 4 });

  // ── The high-score table past the finish, facing back up the track ──
  const end = samples[segments];
  const along = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const side = new Vector3(end.side.x, 0, end.side.z).normalize();
  const len = pen?.length ?? 30;
  const boardAt = end.pos.clone().addScaledVector(along, len + 24);
  boardAt.y = Math.max(groundAt(boardAt.x, boardAt.z), end.pos.y - len * 0.08) + BOARD.lift + BOARD.height / 2;
  const boardQ = new Quaternion().setFromAxisAngle(UP, Math.atan2(-along.x, -along.z));
  const boardPlace = new Matrix4().compose(boardAt, boardQ, new Vector3(1, 1, 1));
  const bq = quad(BOARD.width, BOARD.height, 0, 0, 0.6, R.board);
  bq.applyMatrix4(boardPlace);
  quads.push(bq);
  solid.push(piece(new BoxGeometry(BOARD.width + 3, BOARD.height + 3, 1.6), '#08080c', boardPlace.clone()));
  solid.push(piece(new BoxGeometry(BOARD.width + 4, 2.4, 2.2), c.glow, new Matrix4().makeTranslation(0, BOARD.height / 2 + 2.6, 0).premultiply(boardPlace)));
  for (const x of [-1, 1]) {
    solid.push(piece(new BoxGeometry(1, BOARD.lift + BOARD.height / 2 + 8, 1), '#2a2a30', new Matrix4().makeTranslation(x * BOARD.width * 0.4, -(BOARD.lift + BOARD.height / 2 + 8) / 2, -0.6).premultiply(boardPlace)));
  }
  feet.push({ x: boardAt.x, z: boardAt.z, r: BOARD.width * 0.6 });

  const cabinet = new Mesh(merge(solid), lambert);
  cabinet.name = 'arcade: cabinet';
  group.add(cabinet);
  const pictures = new Mesh(merge(quads), pictureMat);
  pictures.name = 'arcade: pictures';
  group.add(pictures);

  // ── Pixel bursts once the winner is home: square pixels flying out along eight directions ──
  const fwPos = new Float32Array(BURSTS * BURST_PIXELS * 3);
  const fwCol = new Float32Array(BURSTS * BURST_PIXELS * 3);
  const fwGeo = new BufferGeometry();
  fwGeo.setAttribute('position', new Float32BufferAttribute(fwPos, 3));
  fwGeo.setAttribute('color', new Float32BufferAttribute(fwCol, 3));
  const burstMat = new PointsMaterial({ size: lite ? 1.6 : 1.2, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  owned.push(fwGeo, burstMat);
  const bursts = new Points(fwGeo, burstMat);
  bursts.name = 'arcade: pixel bursts';
  bursts.frustumCulled = false;
  bursts.visible = false;
  group.add(bursts);
  const palette = [c.glow, c.accent, '#3fd8ff', '#7dff6a', '#ffffff'].map((x) => new Color(x));
  const dirs = Array.from({ length: BURST_PIXELS }, (_, k) => {
    const a = (Math.floor(k / 6) / 8) * Math.PI * 2;
    const ring = (k % 6) / 6;
    return { x: Math.cos(a), y: Math.sin(a), ring };
  });
  const burstCentre = (b, cycle) => {
    const h = Math.abs(Math.sin((b + 1) * 12.9898 + cycle * 78.233) * 43758.5453) % 1;
    const h2 = Math.abs(Math.sin((b + 1) * 39.346 + cycle * 11.135) * 24634.6345) % 1;
    return boardAt.clone().addScaledVector(side, (h - 0.5) * 50).addScaledVector(along, -6 - h2 * 10).add(new Vector3(0, 6 + h2 * 14, 0));
  };
  const fire = (age) => {
    bursts.visible = age >= 0 && age < BURSTS_FOR + BURST_LIFE;
    if (!bursts.visible) return;
    const right = side;
    for (let b = 0; b < BURSTS; b += 1) {
      const cycle = Math.floor((age - b * BURST_GAP) / (BURSTS * BURST_GAP));
      const k = (age - b * BURST_GAP - cycle * BURSTS * BURST_GAP) / BURST_LIFE;
      const live = cycle >= 0 && k >= 0 && k < 1 && age - b * BURST_GAP < BURSTS_FOR;
      const centre = burstCentre(b, cycle);
      const colour = palette[(b + cycle) % palette.length];
      const fade = live ? (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) : 0;
      // Snapped to a 1.2 m grid as they fly out: the burst moves in pixel steps.
      const reach = Math.round((1 - Math.exp(-3 * k)) * 7) * 1.2;
      for (let n = 0; n < BURST_PIXELS; n += 1) {
        const d = dirs[n];
        const r = reach * (0.4 + d.ring);
        const j = (b * BURST_PIXELS + n) * 3;
        fwPos[j] = centre.x + right.x * d.x * r;
        fwPos[j + 1] = centre.y + d.y * r;
        fwPos[j + 2] = centre.z + right.z * d.x * r;
        fwCol[j] = colour.r * fade;
        fwCol[j + 1] = colour.g * fade;
        fwCol[j + 2] = colour.b * fade;
      }
    }
    fwGeo.getAttribute('position').needsUpdate = true;
    fwGeo.getAttribute('color').needsUpdate = true;
  };

  // ── On the race clock ──
  let shownScreen = null;
  let shownBoard = null;
  let winner = null; // { index, initials, time, at }
  const update = (t, ctx = {}) => {
    const p = ctx.frame?.p ?? [];
    // The winner: the first marble home (a replay rewound past that moment takes them off again).
    if (winner && t < winner.at) winner = null;
    if (!winner) {
      let best = -1;
      p.forEach((x, k) => { if (x >= 1 && (best < 0 || x > p[best])) best = k; });
      if (best >= 0) winner = { index: best, initials: initialsOf(ctx.names?.[best]), time: (t / 1000).toFixed(2), at: t };
    }
    const label = screenLabel(t, countdownMs);
    const screenKey = `${label.top}|${label.big}`;
    const blink = winner ? Math.floor((t - winner.at) / 400) % 2 === 0 : false;
    const boardKey = winner ? `${winner.initials}|${winner.time}|${blink}` : '-';
    if (screenKey !== shownScreen || boardKey !== shownBoard) {
      if (screenKey !== shownScreen) paintScreen(g, c, label);
      if (boardKey !== shownBoard) paintBoard(g, c, winner, ar.finish ?? 'NEW HIGH SCORE!', blink);
      shownScreen = screenKey;
      shownBoard = boardKey;
      picture.needsUpdate = true;
    }
    fire(winner ? t - winner.at : -1);
  };
  update(-countdownMs - 1);
  const dispose = () => owned.forEach((o) => o.dispose?.());
  return { group, update, feet, dispose, cabinet: { foot, back } };
}
