/**
 * Landmarks for the Arcade Series: one builder each, origin on the ground, front facing +z,
 * chunky pixel scenery (cubes, not smooth models), merged into the still scenery. Every
 * cabinet, sign and character is our own design: no real games, logos or characters.
 */
import { BoxGeometry, Matrix4 } from 'three';
import { box, merge, piece } from './parts';

const NEON = ['#ff3fa8', '#3fd8ff', '#ffd23f', '#7dff6a', '#a86aff'];

/** One upright cabinet: a dark body, a coloured side, a lit screen and marquee, a little control panel. */
function cabinet(p, x, z, k, yaw = 0, s = 1) {
  const m = (dx, dy, dz) => new Matrix4().makeRotationY(yaw).premultiply(new Matrix4().makeTranslation(x, 0, z)).multiply(new Matrix4().makeTranslation(dx * s, dy * s, dz * s));
  const colour = NEON[k % NEON.length];
  p.push(piece(new BoxGeometry(3 * s, 7 * s, 3 * s), '#141018', m(0, 3.5, 0)));
  p.push(piece(new BoxGeometry(3.1 * s, 6.6 * s, 2.6 * s), colour, m(0, 3.6, -0.3)));
  p.push(piece(new BoxGeometry(2.4 * s, 2 * s, 0.2 * s), NEON[(k + 2) % NEON.length], m(0, 4.6, 1.52)));
  p.push(piece(new BoxGeometry(2.8 * s, 0.9 * s, 0.3 * s), '#fff2c4', m(0, 6.6, 1.4)));
  p.push(piece(new BoxGeometry(3 * s, 0.6 * s, 1.4 * s), '#2a2a34', m(0, 3.1, 2.1)));
}

// ── Joystick Spins ───────────────────────────────────────────────────────────

/** A giant 1980s arcade hall at night (the start): a long dark hall, its open front lit, rows of cabinets inside, a neon sign of our own. */
function arcadeHall() {
  const p = [box(60, 18, 30, 0, 9, -6, '#1a1030'), box(62, 1.4, 32, 0, 18.7, -6, '#2a1a4a')];
  for (let k = 0; k < 8; k += 1) cabinet(p, -24 + k * 7, 10, k, 0, 1.4);
  p.push(box(40, 6, 1.2, 0, 24, 9, '#0a0a12'));
  for (let k = 0; k < 10; k += 1) p.push(box(2.6, 3.4, 1.4, -15 + k * 3.4, 24, 9.4, NEON[k % NEON.length])); // the sign's lit blocks
  for (let k = 0; k < 16; k += 1) p.push(box(0.8, 0.8, 0.6, -28 + k * 3.7, 21.5, 9.6, '#fff2c4'));
  return merge(p);
}

/** A row of cabinets along the hall (beside a sweep): ten machines back to back, lit screens facing the track. */
function cabinetRow() {
  const p = [box(74, 0.6, 9, 0, 0.3, 0, '#2a1a4a')];
  for (let k = 0; k < 10; k += 1) cabinet(p, -33 + k * 7.3, 0, k + 1, 0, 1.6);
  return merge(p);
}

/** The prize counter (past the finish): a long glass counter, shelves of prizes in pixel blocks, ticket streamers. */
function prizeCounter() {
  const p = [box(40, 6, 6, 0, 3, 0, '#3fd8ff'), box(40.4, 0.6, 6.4, 0, 6.3, 0, '#c8ccd2'), box(42, 22, 2, 0, 11, -8, '#1a1030')];
  for (let r = 0; r < 3; r += 1) {
    p.push(box(40, 0.6, 3, 0, 9 + r * 5.5, -6.5, '#c8ccd2'));
    for (let k = 0; k < 9; k += 1) p.push(box(2.6, 2.6, 2.4, -16 + k * 4, 10.6 + r * 5.5, -6.5, NEON[(k + r) % NEON.length]));
  }
  for (let k = 0; k < 12; k += 1) p.push(box(0.8, 8 + (k % 3) * 3, 0.1, -18 + k * 3.3, 2 + (k % 3) * 1.5, 3.4, k % 2 ? '#ff7a1a' : '#ffd23f')); // the ticket streams
  return merge(p);
}

/** A giant claw machine for the middle of a spiral: a tall glass case on a pink base, a heap of prizes, the claw hanging inside. */
function clawTower() {
  const p = [box(10, 6, 10, 0, 3, 0, '#ff3fa8'), box(10.4, 0.6, 10.4, 0, 6.3, 0, '#c8ccd2'), box(9.6, 12, 9.6, 0, 12.6, 0, '#9ad8ff'), box(10.4, 2, 10.4, 0, 19.6, 0, '#ff3fa8')];
  for (let k = 0; k < 8; k += 1) p.push(box(2, 2, 2, -3 + (k % 4) * 2, 7.6 + Math.floor(k / 4) * 2, -1 + (k % 2) * 2, NEON[k % NEON.length]));
  p.push(box(0.3, 6, 0.3, 0, 15.6, 0, '#c8ccd8'), box(2.4, 0.6, 0.6, 0, 12.4, 0, '#c8ccd8'));
  return merge(p);
}

// ── Kill Screen ──────────────────────────────────────────────────────────────

/** A stretch of the huge neon maze beside the track: low glowing walls in a pattern of our own, rows of dots between them. */
function neonMaze() {
  const p = [];
  const walls = [[-30, -12, 24, 1], [-30, 12, 24, 1], [-6, 0, 1, 24], [6, -12, 1, 14], [6, 12, 1, 14], [18, 0, 24, 1], [30, -12, 1, 18], [-18, 0, 1, 12]];
  for (const [x, z, w, d] of walls) p.push(box(w + 0.8, 2.4, d + 0.8, x + w / 2, 1.2, z, '#3a2aff'), box(w, 2.6, d, x + w / 2, 1.3, z, '#ff3fd8'));
  for (let k = 0; k < 14; k += 1) p.push(box(0.9, 0.9, 0.9, -28 + k * 4.2, 0.6, 6, '#ffe9a8'));
  for (let k = 0; k < 10; k += 1) p.push(box(0.9, 0.9, 0.9, 10 + (k % 5) * 4, 0.6, -6 + Math.floor(k / 5) * 12, '#ffe9a8'));
  return merge(p);
}

/** A glitched column for the middle of a spiral: a stack of blocks slipping sideways, half of it scrambled into stray colours. */
function glitchTower() {
  const p = [];
  for (let k = 0; k < 12; k += 1) {
    const slip = k > 5 ? ((k * 7) % 5 - 2) * 0.8 : 0;
    const colour = k > 5 ? ['#0a0a12', '#ff3fa8', '#3fd8ff', '#7dff6a'][k % 4] : '#3a2aff';
    p.push(box(5, 2, 5, slip, 1 + k * 2, (k > 5 ? ((k * 3) % 3 - 1) * 0.6 : 0), colour));
  }
  return merge(p);
}

/** The level sign past the finish: a big dark board, LEVEL in blocks over a counter of three lit digits, the right half breaking into noise. */
function levelSign() {
  const p = [box(30, 16, 2, 0, 20, 0, '#0a0a12'), box(1.2, 14, 1.2, -10, 6, 0, '#2a2a34'), box(1.2, 14, 1.2, 10, 6, 0, '#2a2a34')];
  for (let k = 0; k < 3; k += 1) p.push(box(5, 7, 0.6, -8 + k * 6.5, 19, 1.2, '#ffd23f'));
  for (let k = 0; k < 18; k += 1) p.push(box(1.4, 1.4, 0.7, 3 + (k * 7) % 12, 13 + ((k * 5) % 14), 1.3, ['#ff3fa8', '#3fd8ff', '#7dff6a', '#ffffff'][k % 4])); // the noise
  return merge(p);
}

// ── Bullet Hell ──────────────────────────────────────────────────────────────

/** One alien of our own: a squat block body, a narrower head, two eyes and stubby antennae (no famous invader shapes). */
function alien(p, x, y, z, colour, s = 1) {
  p.push(box(3.2 * s, 1.6 * s, 1.6 * s, x, y, z, colour), box(2 * s, 1 * s, 1.4 * s, x, y + 1.3 * s, z, colour));
  for (const dx of [-0.5, 0.5]) p.push(box(0.5 * s, 0.5 * s, 0.3 * s, x + dx * s, y + 1.3 * s, z + 0.75 * s, '#0a0a24'), box(0.25 * s, 0.9 * s, 0.25 * s, x + dx * 1.3 * s, y + 2.2 * s, z, '#ff4fd8'));
}

/** The alien formation (the start, and over the planet): four rows of our own pixel aliens hovering high over a planet's curve. */
function alienFormation() {
  const p = [box(52, 3, 30, 0, -1, -8, '#1a3a8a'), box(44, 2, 24, 0, 1, -8, '#2a5ad8')]; // the planet's curve below
  const colours = ['#4affc8', '#7dff6a', '#ffd23f', '#ff4fd8'];
  for (let r = 0; r < 4; r += 1) for (let k = 0; k < 5; k += 1) alien(p, -17 + k * 8 + (r % 2) * 2, 16 + r * 5, -4 - r * 2, colours[r], 1.2);
  return merge(p);
}

/** The mothership (past the finish): a huge flat hull of stacked blocks, a lit dome, a row of glowing ports and engine glow underneath. */
function mothership() {
  const p = [box(46, 4, 22, 0, 26, 0, '#6a7488'), box(36, 3, 16, 0, 29.5, 0, '#8a94a8'), box(14, 4, 10, 0, 33, 0, '#4affc8'), box(54, 1.2, 8, 0, 24, 0, '#3a4258')];
  for (let k = 0; k < 10; k += 1) p.push(box(2, 1.2, 0.6, -20 + k * 4.4, 26, 11.2, k % 2 ? '#ff4fd8' : '#ffd23f'));
  for (let k = 0; k < 5; k += 1) p.push(box(3, 1, 3, -16 + k * 8, 23.4, 0, '#ff2a5a'));
  return merge(p);
}

/** A ringed planet for the middle of a spiral: a blocky globe and a flat ring round it. */
function ringedPlanet() {
  const p = [];
  for (let k = 0; k < 7; k += 1) { const w = [2.4, 3.6, 4.4, 4.8, 4.4, 3.6, 2.4][k]; p.push(box(w, 1.2, w, 0, 2 + k * 1.2, 0, k % 3 ? '#ff7a3a' : '#ffb04a')); }
  p.push(box(7.6, 0.4, 2, 0, 5.6, 0, '#ffd23f'), box(2, 0.4, 7.6, 0, 5.6, 0, '#ffd23f'), box(6, 0.4, 6, 0, 5.6, 0, '#e8c050'));
  return merge(p);
}

/** A laser turret for the middle of a spiral: a squat block base, a grey dome and twin barrels, a glowing band (kept low: the hairpin wraps round it). */
function laserTurret() {
  const p = [box(5, 3, 5, 0, 1.5, 0, '#3a4258'), box(5.4, 0.5, 5.4, 0, 3.2, 0, '#ff4fd8'), box(3.6, 2, 3.6, 0, 4.4, 0, '#6a7488')];
  for (const x of [-0.7, 0.7]) p.push(box(0.5, 0.5, 1.4, x, 4.6, 2.2, '#8a94a8'), box(0.6, 0.6, 0.3, x, 4.6, 3.0, '#ff2a5a'));
  return merge(p);
}

// ── Aturi Arcade ─────────────────────────────────────────────────────────────

/** Pixel hills (the start, and the first run): rounded steps of green hills, blocky white clouds above, a pixel sun. */
function pixelHills() {
  const p = [];
  for (const [x, w, h] of [[-26, 18, 8], [-10, 22, 14], [10, 16, 10], [26, 20, 6]]) for (let k = 0; k < h; k += 2) p.push(box(w - k * 1.4, 2, 8, x, k + 1, -6, k % 4 ? '#3ac84a' : '#2aa83a'));
  for (const [x, y] of [[-20, 24], [6, 28], [24, 22]]) p.push(box(8, 2, 3, x, y, -4, '#ffffff'), box(5, 2, 3, x, y + 2, -4, '#ffffff'));
  p.push(box(6, 6, 1, 30, 32, -8, '#ffd23f'));
  return merge(p);
}

/** Floating platforms beside the ledge: brown and gold slabs hanging in the air at different heights, coins over them. */
function floatingPlatforms() {
  const p = [];
  for (const [x, y, w] of [[-14, 6, 8], [-2, 10, 6], [10, 7, 9], [20, 13, 6]]) {
    p.push(box(w, 1.4, 4, x, y, 0, '#c86a2a'), box(w, 0.4, 4.1, x, y + 0.9, 0, '#ffd23f'));
    for (let k = 0; k < 2; k += 1) p.push(box(1, 1.4, 0.4, x - 1.5 + k * 3, y + 2.6, 0, '#ffc83a'));
  }
  return merge(p);
}

/** A pixel waterfall beside the second drop: a cliff of stepped blocks, a column of white and blue cubes pouring down it into a pool. */
function pixelWaterfall() {
  const p = [];
  for (let k = 0; k < 6; k += 1) p.push(box(16 - k * 1.6, 3, 8, 0, 1.5 + k * 3, -2 - k * 0.6, k % 2 ? '#8a5a32' : '#a86a3a'));
  for (let k = 0; k < 9; k += 1) p.push(box(3, 2, 1, (k % 2) * 0.6 - 0.3, 1 + k * 2, 2.2 - Math.min(k, 6) * 0.6, k % 3 ? '#7ad8ff' : '#ffffff'));
  p.push(box(12, 0.6, 6, 0, 0.3, 4, '#3a8aff'), box(4, 0.8, 1, -3, 0.6, 5, '#ffffff'), box(3, 0.8, 1, 3, 0.6, 3.5, '#ffffff'));
  return merge(p);
}

/** A big arrow sign on two posts: a dark board with a lit pixel arrow pointing `dir` (the cheat code along the route). */
function arrowSign(dir) {
  return () => {
    const p = [box(8, 8, 0.8, 0, 9, 0, '#1a1040'), box(0.8, 6, 0.8, -3, 3, 0, '#2a2a34'), box(0.8, 6, 0.8, 3, 3, 0, '#2a2a34')];
    // An up arrow in cells (x right, y up), turned for the other directions.
    const cells = [[0, 2], [-1, 1], [0, 1], [1, 1], [-2, 0], [0, 0], [2, 0], [0, -1], [0, -2]];
    const turn = { up: ([x, y]) => [x, y], down: ([x, y]) => [x, -y], left: ([x, y]) => [-y, x], right: ([x, y]) => [y, x] }[dir];
    for (const c of cells) { const [x, y] = turn(c); p.push(box(1.2, 1.2, 0.5, x * 1.3, 9 + y * 1.3, 0.6, '#ffd23f')); }
    return merge(p);
  };
}

/** The B and A buttons (past the finish): two giant round buttons on a control panel, a screen above flashing 30 LIVES. */
function baButtons() {
  const p = [box(30, 4, 10, 0, 2, 0, '#2a2a34'), box(30.4, 0.6, 10.4, 0, 4.3, 0, '#c8ccd2'), box(26, 12, 1.2, 0, 14, -4, '#04060a')];
  for (const x of [-6, 6]) {
    for (let k = 0; k < 4; k += 1) { const w = [6, 7, 7, 6][k]; p.push(box(w, 0.9, w, x, 4.9 + k * 0.9, 0, '#ff2a4a')); }
  }
  for (let k = 0; k < 6; k += 1) p.push(box(2.4, 3.6, 0.5, -8 + k * 3.2, 14, -3.2, k < 2 ? '#ffd23f' : '#7dff6a')); // 30 LIVES in lit blocks
  return merge(p);
}

// ── Final Round Spin ─────────────────────────────────────────────────────────

/** A neon rooftop stage in a rainy pixel city (the start): a flat roof with neon edges, towers of lit windows behind it, barriers and a crowd. */
function rooftopStage() {
  const p = [box(50, 2, 26, 0, 1, 0, '#2a2a34'), box(50.4, 0.4, 26.4, 0, 2.2, 0, '#ff3f3f')];
  for (let k = 0; k < 6; k += 1) {
    const h = 18 + ((k * 7) % 4) * 6;
    p.push(box(8, h, 8, -25 + k * 10, h / 2, -20, '#14141e'));
    for (let w = 0; w < h / 4 - 1; w += 1) p.push(box(5, 1, 0.4, -25 + k * 10, 3 + w * 4, -15.8, (k + w) % 3 ? '#ffd23f' : '#3fd8ff'));
  }
  for (let k = 0; k < 14; k += 1) p.push(box(1.2, 2 + (k % 3) * 0.3, 1, -18 + k * 2.8, 3.5, 10, ['#ff3f3f', '#3fd8ff', '#ffd23f', '#a86aff'][k % 4]));
  p.push(box(44, 1.2, 0.4, 0, 3, 11.5, '#c8ccd2'));
  return merge(p);
}

/** A pixel crowd behind barriers: rows of block spectators in bright shirts, arms up, a steel barrier in front. */
function pixelCrowd() {
  const p = [box(36, 1.4, 0.4, 0, 1.4, 4, '#c8ccd2'), box(36, 3, 10, 0, 1.5, -2, '#2a2a34')];
  const shirts = ['#ff3f3f', '#3fd8ff', '#ffd23f', '#a86aff', '#7dff6a'];
  for (let r = 0; r < 3; r += 1) for (let k = 0; k < 14; k += 1) {
    const x = -16 + k * 2.4 + (r % 2) * 1.2;
    const y = 3.4 + r * 1.6;
    p.push(box(1.2, 1.6, 0.8, x, y, 2 - r * 3, shirts[(k + r) % 5]), box(0.8, 0.8, 0.8, x, y + 1.2, 2 - r * 3, '#d8a070'));
    if ((k + r) % 3 === 0) p.push(box(0.3, 1.2, 0.3, x + 0.6, y + 1.6, 2 - r * 3, '#d8a070'));
  }
  return merge(p);
}

/** A rooftop water tower for the middle of a spiral: a blocky wooden tank on steel legs, a neon band round it. */
function waterTower() {
  const p = [];
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) p.push(box(0.6, 7, 0.6, x, 3.5, z, '#4a4a54'));
  p.push(box(6, 6, 6, 0, 10, 0, '#8a5a32'), box(6.2, 0.5, 6.2, 0, 9, 0, '#ff3f3f'), box(4, 1.6, 4, 0, 13.8, 0, '#6a4a2a'));
  return merge(p);
}

/** The health-bar gantry (past the finish): two long bars on a dark board, one full and one empty, ROUND 3 between them. */
function healthBars() {
  const p = [box(40, 10, 1.6, 0, 20, 0, '#0a0a12'), box(1.2, 16, 1.2, -18, 8, 0, '#2a2a34'), box(1.2, 16, 1.2, 18, 8, 0, '#2a2a34')];
  p.push(box(15, 2.4, 0.6, -10, 22, 1.0, '#ffd23f'), box(15, 2.4, 0.6, 10, 22, 1.0, '#3a0a0a'), box(2, 2.4, 0.6, 3.5, 22, 1.1, '#ff3f3f'));
  for (let k = 0; k < 4; k += 1) p.push(box(1.6, 2, 0.5, -2.4 + k * 1.6, 17.6, 1.0, '#ffffff'));
  return merge(p);
}

// ── Checkpoint Rush ──────────────────────────────────────────────────────────

/** The starting grid (the start): a gantry of lights over the road, five lamps lit green, grid boxes and palms either side. */
function startingGrid() {
  const p = [box(1.4, 14, 1.4, -14, 7, 0, '#2a2a34'), box(1.4, 14, 1.4, 14, 7, 0, '#2a2a34'), box(30, 3, 1.6, 0, 14, 0, '#14141e')];
  for (let k = 0; k < 5; k += 1) p.push(box(2, 2, 0.6, -8 + k * 4, 14, 1.0, '#7dff6a'));
  for (const x of [-22, 22]) { p.push(box(1, 12, 1, x, 6, -4, '#8a5a32')); for (let k = 0; k < 4; k += 1) p.push(box(6, 0.6, 1.4, x + Math.cos(k * 1.6) * 2.2, 12, -4 + Math.sin(k * 1.6) * 2.2, '#2aa83a')); }
  for (let k = 0; k < 6; k += 1) p.push(box(4, 0.2, 0.4, -10 + (k % 2) * 6, 0.1, -10 - k * 3, '#ffffff'));
  return merge(p);
}

/** A checkpoint gate beside the road: an orange pylon arch, CHECKPOINT! in lit blocks on its board, the time-extended lamp. */
function checkpointGate() {
  const p = [box(1.4, 12, 1.4, -9, 6, 0, '#ff7a1a'), box(1.4, 12, 1.4, 9, 6, 0, '#ff7a1a'), box(20, 3.6, 1.2, 0, 12.4, 0, '#14141e')];
  for (let k = 0; k < 10; k += 1) p.push(box(1.2, 1.8, 0.4, -8.1 + k * 1.8, 12.4, 0.7, k === 9 ? '#ff3fa8' : '#ffd23f'));
  p.push(box(2, 2, 2, 0, 15.6, 0, '#7dff6a'));
  return merge(p);
}

/** The signpost at the fork, for the middle of a splitter: a post with two arrow boards pointing either way, a palm beside it. */
function forkSignpost() {
  const p = [box(0.8, 9, 0.8, 0, 4.5, 0, '#c8ccd2'), box(3.6, 1.6, 0.4, 1.8, 7.6, 0, '#1a8a4a'), box(3.6, 1.6, 0.4, -1.8, 5.6, 0, '#1a8a4a'), box(1, 1, 0.5, 3.8, 7.6, 0, '#1a8a4a'), box(1, 1, 0.5, -3.8, 5.6, 0, '#1a8a4a')];
  p.push(box(0.7, 10, 0.7, 1.2, 5, -3, '#8a5a32'));
  for (let k = 0; k < 4; k += 1) p.push(box(3.4, 0.5, 1, 1.2 + Math.cos(k * 1.6) * 1.4, 10, -3 + Math.sin(k * 1.6) * 1.4, '#2aa83a'));
  return merge(p);
}

/** The GOAL banner (past the finish): a chequered banner over two posts, GOAL in lit blocks, a pixel trophy on a plinth. */
function goalBanner() {
  const p = [box(1.2, 16, 1.2, -14, 8, 0, '#2a2a34'), box(1.2, 16, 1.2, 14, 8, 0, '#2a2a34')];
  for (let x = 0; x < 14; x += 1) for (let y = 0; y < 3; y += 1) p.push(box(2, 1.6, 0.4, -13 + x * 2, 13.4 + y * 1.6, 0, (x + y) % 2 ? '#ffffff' : '#14141e'));
  for (let k = 0; k < 4; k += 1) p.push(box(2.4, 3, 0.5, -4.8 + k * 3.2, 19.8, 0.4, '#ffd23f'));
  p.push(box(4, 2, 4, 0, 1, 6, '#3a2a6a'), box(1, 2, 1, 0, 3, 6, '#ffc83a'), box(3, 2.6, 3, 0, 5.3, 6, '#ffc83a'), box(4.4, 0.6, 1, 0, 6, 6, '#ffc83a'));
  return merge(p);
}

// ── Arcade Spins ─────────────────────────────────────────────────────────────

/** The subway entrance (the start): stairs going down under a canopy, a lit sign on two posts, the street's shopfronts behind. */
function subwayEntrance() {
  const p = [box(14, 0.6, 8, 0, 6, 2, '#2a5a3a'), box(0.6, 6, 0.6, -6.6, 3, 5.6, '#2a5a3a'), box(0.6, 6, 0.6, 6.6, 3, 5.6, '#2a5a3a'), box(10, 2, 0.4, 0, 7.6, 6, '#3fd8ff')];
  for (let k = 0; k < 6; k += 1) p.push(box(10, 0.5, 1.2, 0, 2.6 - k * 0.5, 4 - k * 1.1, '#9a9ea4'));
  for (let k = 0; k < 5; k += 1) p.push(box(9, 16 + (k % 2) * 6, 6, -22 + k * 11, 8 + (k % 2) * 3, -12, ['#2a1a5a', '#3a1a2a', '#1a2a4a'][k % 3]), box(7, 3, 0.4, -22 + k * 11, 3, -8.8, ['#ff7a1a', '#3fd8ff', '#ff3fa8'][k % 3]));
  return merge(p);
}

/** Pixel storefronts along the street: a row of shops of our own, lit windows, awnings and neon signs in made-up glyphs. */
function storefronts() {
  const p = [];
  for (let k = 0; k < 6; k += 1) {
    const x = -27 + k * 11;
    const h = 12 + ((k * 5) % 3) * 4;
    p.push(box(10, h, 6, x, h / 2, 0, ['#2a1a5a', '#3a1a2a', '#1a2a4a'][k % 3]));
    p.push(box(8, 3.4, 0.4, x, 2.4, 3.2, '#ffd27a'), box(9, 0.6, 2, x, 4.6, 3.8, ['#ff3fa8', '#3fd8ff', '#ff7a1a'][k % 3]));
    for (let g = 0; g < 3; g += 1) p.push(box(1.4, 1.4, 0.4, x - 2 + g * 2, 7, 3.2, ['#ff3fa8', '#7dff6a', '#3fd8ff'][(k + g) % 3]));
  }
  return merge(p);
}

/** A giant GO arrow: GO in lit blocks over a flashing yellow arrow pointing down the road. */
function goArrow() {
  const p = [box(0.8, 8, 0.8, 0, 4, -1, '#2a2a34')];
  const cells = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [3, 1], [3, -1], [2, 2], [2, -2]];
  for (const [x, y] of cells) p.push(box(1.4, 1.4, 0.6, -2.8 + x * 1.4, 10 + y * 1.4, 0, '#ffd23f'));
  for (let k = 0; k < 2; k += 1) p.push(box(2.4, 3, 0.6, -1.4 + k * 2.8, 15.6, 0, '#ff7a1a'));
  return merge(p);
}

/** A neon plaza for the middle of a spiral: a low dark square, a glowing border and big tiles in made-up glyphs lying flat (low: the hairpin wraps round it). */
function neonPlaza() {
  const p = [box(9, 0.8, 9, 0, 0.4, 0, '#14141e')];
  for (const [w, d, x, z] of [[9.4, 0.4, 0, 4.5], [9.4, 0.4, 0, -4.5], [0.4, 9.4, 4.5, 0], [0.4, 9.4, -4.5, 0]]) p.push(box(w, 0.9, d, x, 0.45, z, '#3fd8ff'));
  for (let k = 0; k < 4; k += 1) p.push(box(2.6, 0.2, 2.6, (k % 2 ? 1.8 : -1.8), 0.9, (k < 2 ? 1.8 : -1.8), ['#ff3fa8', '#ff7a1a', '#7dff6a', '#ffd23f'][k]));
  return merge(p);
}

/** The CONTINUE? clock (past the finish): a big dark board, CONTINUE? in blocks, the countdown frozen at 9, YES lit under it. */
function continueClock() {
  const p = [box(30, 18, 2, 0, 20, 0, '#0a0a12'), box(1.2, 14, 1.2, -10, 6, 0, '#2a2a34'), box(1.2, 14, 1.2, 10, 6, 0, '#2a2a34')];
  for (let k = 0; k < 9; k += 1) p.push(box(2.2, 2.6, 0.6, -10.4 + k * 2.6, 26, 1.2, '#3fd8ff'));
  const nine = [[0, 2], [1, 2], [2, 2], [0, 1], [2, 1], [0, 0], [1, 0], [2, 0], [2, -1], [2, -2], [1, -2], [0, -2]];
  for (const [x, y] of nine) p.push(box(1.2, 1.2, 0.6, -1.3 + x * 1.3, 19 + y * 1.3, 1.2, '#ffd23f'));
  for (let k = 0; k < 3; k += 1) p.push(box(2, 2.4, 0.6, -2.6 + k * 2.6, 13, 1.2, '#7dff6a'));
  return merge(p);
}

export const ARCADE_LANDMARKS = {
  'arcade-hall': { build: arcadeHall, radius: 32 },
  'cabinet-row': { build: cabinetRow, radius: 38 },
  'prize-counter': { build: prizeCounter, radius: 22 },
  'claw-tower': { build: clawTower, radius: 6, fit: 6 },
  'neon-maze': { build: neonMaze, radius: 34 },
  'glitch-tower': { build: glitchTower, radius: 5, fit: 5 },
  'level-sign': { build: levelSign, radius: 16 },
  'alien-formation': { build: alienFormation, radius: 28 },
  mothership: { build: mothership, radius: 27 },
  'ringed-planet': { build: ringedPlanet, radius: 4, fit: 4 },
  'laser-turret': { build: laserTurret, radius: 4, fit: 4 },
  'pixel-hills': { build: pixelHills, radius: 36 },
  'floating-platforms': { build: floatingPlatforms, radius: 24 },
  'pixel-waterfall': { build: pixelWaterfall, radius: 10 },
  'arrow-up': { build: arrowSign('up'), radius: 5 },
  'arrow-down': { build: arrowSign('down'), radius: 5 },
  'arrow-left': { build: arrowSign('left'), radius: 5 },
  'arrow-right': { build: arrowSign('right'), radius: 5 },
  'ba-buttons': { build: baButtons, radius: 16 },
  'rooftop-stage': { build: rooftopStage, radius: 30 },
  'pixel-crowd': { build: pixelCrowd, radius: 19 },
  'water-tower': { build: waterTower, radius: 4, fit: 4 },
  'health-bars': { build: healthBars, radius: 20 },
  'starting-grid': { build: startingGrid, radius: 26 },
  'checkpoint-gate': { build: checkpointGate, radius: 10 },
  'fork-signpost': { build: forkSignpost, radius: 4.5, fit: 4.3 },
  'goal-banner': { build: goalBanner, radius: 15 },
  'subway-entrance': { build: subwayEntrance, radius: 30 },
  storefronts: { build: storefronts, radius: 34 },
  'go-arrow': { build: goArrow, radius: 5 },
  'neon-plaza': { build: neonPlaza, radius: 4.8, fit: 4.8 },
  'continue-clock': { build: continueClock, radius: 16 },
};
