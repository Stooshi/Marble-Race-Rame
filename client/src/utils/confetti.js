/**
 * Confetti and gold glitter for the finish ceremony, worked out from the show's
 * clock alone (no running state): every piece's place at a moment comes from a
 * formula, so a replay scrubbed back and forth shows exactly the same shower,
 * live and replayed alike.
 *
 * A shower is { bursts: [{ at, kind }], streams: [{ from, to, rate }] } in ms
 * of race time: bursts fire a cloud of pieces at once (from cannons at the
 * bottom corners and a pop in the middle), streams keep pieces drifting down
 * from the top (rate = share of the full flow). `quality` (0.3–1) thins it
 * out on weaker devices: fewer pieces, never a different look.
 */

const GOLDS = [['#fff1b8', '#c99a2e'], ['#f7d774', '#9c7418'], ['#ffe08a', '#b8862a'], ['#fff8e1', '#d9b45a']];
const ACCENTS = [['#ffffff', '#c9ccd6'], ['#e23a5b', '#8c1630'], ['#3f7fe8', '#1c3f86'], ['#f2c6d8', '#b0708c']];

/** A repeatable pseudo-random number in [0, 1) for piece n, property p. */
function rnd(n, p) {
  const x = Math.sin(n * 127.1 + p * 311.7 + 0.5) * 43758.5453;
  return x - Math.floor(x);
}

const BURSTS = {
  // Two cannons at the bottom corners and a pop around the banner.
  winner: [{ x: 0.06, y: 1.02, angle: -62, spread: 18, n: 90 }, { x: 0.94, y: 1.02, angle: -118, spread: 18, n: 90 }, { x: 0.5, y: 0.3, angle: -90, spread: 180, n: 70, pop: true }],
  // A fountain over the top step as first place lands, plus the cannons again.
  podium: [{ x: 0.5, y: 0.42, angle: -90, spread: 70, n: 110, pop: true }, { x: 0.04, y: 1.02, angle: -60, spread: 14, n: 60 }, { x: 0.96, y: 1.02, angle: -120, spread: 14, n: 60 }],
};
const STREAM_PER_S = 26; // confetti pieces a second at full flow (glitter adds a third as many)
const LIFE_MS = 7000;

/**
 * Where a piece is `age` ms after it set off from (x0, y0) at velocity
 * (vx, vy) (screen heights a second), slowing in the air (drag k) and falling
 * at last at g / k, swaying from side to side as it slows.
 */
function flight(age, x0, y0, vx, vy, k, g, sway, swayW, phase) {
  const a = age / 1000;
  const e = 1 - Math.exp(-k * a);
  return {
    x: x0 + (vx / k) * e + sway * Math.sin(swayW * a + phase) * e,
    y: y0 + ((vy - g / k) / k) * e + (g / k) * a,
  };
}

/**
 * Every piece showing at race time t: [{ x, y (shares of the width and the
 * height), size (share of the height), rot, flip, color, glitter, alpha }].
 */
export function piecesAt(t, shower, quality = 1, aspect = 1) {
  const out = [];
  if (!shower || t === null || t === undefined) return out;
  const push = (n, age, start, glitter) => {
    const k = glitter ? 3.2 : 2.6;
    const g = glitter ? 0.36 : 0.62;
    const p = flight(age, start.x, start.y, start.vx, start.vy, k, g, (glitter ? 0.012 : 0.03) / aspect, 2 + rnd(n, 7) * 3, rnd(n, 8) * 6.3);
    if (p.y > 1.08 || p.y < -0.6 || p.x < -0.1 || p.x > 1.1) return;
    const fade = Math.min(1, (LIFE_MS - age) / 900);
    const pal = glitter ? GOLDS : (rnd(n, 9) < 0.7 ? GOLDS : ACCENTS);
    const flip = Math.cos(rnd(n, 10) * 6.3 + age * (0.004 + rnd(n, 11) * 0.008));
    const [front, back] = pal[Math.floor(rnd(n, 12) * pal.length)];
    out.push({
      x: p.x,
      y: p.y,
      size: glitter ? 0.006 + rnd(n, 13) * 0.006 : 0.012 + rnd(n, 13) * 0.01,
      rot: rnd(n, 14) * 6.3 + age * (rnd(n, 15) - 0.5) * 0.012,
      flip,
      color: flip > 0 ? front : back,
      glitter,
      alpha: glitter ? fade * (0.55 + 0.45 * Math.sin(age * (0.012 + rnd(n, 16) * 0.02) + rnd(n, 17) * 6.3)) : fade,
    });
  };

  (shower.bursts ?? []).forEach((burst, b) => {
    const age = t - burst.at;
    if (age < 0 || age > LIFE_MS) return;
    (BURSTS[burst.kind] ?? []).forEach((gun, gi) => {
      const count = Math.round(gun.n * quality);
      for (let i = 0; i < count; i += 1) {
        const n = b * 10007 + gi * 1009 + i;
        const glitter = i % 3 === 2;
        const ang = ((gun.angle + (rnd(n, 1) - 0.5) * gun.spread * 2) * Math.PI) / 180;
        const speed = gun.pop ? 0.5 + rnd(n, 2) * 0.9 : 1.5 + rnd(n, 2) * 1.1;
        const delay = rnd(n, 3) * (gun.pop ? 120 : 260); // the cannons fire in a ripple, not all at once
        if (age < delay) continue;
        push(n, age - delay, { x: gun.x, y: gun.y, vx: (Math.cos(ang) * speed) / aspect, vy: Math.sin(ang) * speed }, glitter);
      }
    });
  });

  // The steady fall from the top: piece j of a stream sets off at from + j * gap.
  (shower.streams ?? []).forEach((stream, s) => {
    if (!(stream.rate > 0)) return;
    const gap = 1000 / (STREAM_PER_S * 1.35 * stream.rate);
    const first = Math.max(0, Math.floor((t - LIFE_MS - stream.from) / gap));
    const last = Math.floor((Math.min(t, stream.to) - stream.from) / gap);
    for (let j = first; j <= last; j += 1) {
      const n = 500000 + s * 100003 + j;
      if (rnd(n, 0) > quality) continue; // thinned out on weaker devices
      const age = t - (stream.from + j * gap);
      if (age < 0 || age > LIFE_MS) continue;
      push(n, age, { x: rnd(n, 1), y: -0.05 - rnd(n, 2) * 0.05, vx: 0, vy: 0.1 }, j % 4 === 3);
    }
  });
  return out;
}

/**
 * How many pieces this device can draw smoothly (0.3–1): a guess from its
 * processor and memory, lowered while drawing if frames run slow (see note()).
 */
export const quality = {
  value: (() => {
    if (typeof navigator === 'undefined') return 1;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    let q = 1;
    if (cores <= 4 || memory <= 3) q = 0.65;
    if (cores <= 2 || memory <= 2) q = 0.45;
    return q;
  })(),
  slow: 0,
  /** Told each frame's duration (ms): a run of slow frames thins the shower for good. */
  note(ms) {
    this.slow = ms > 26 ? this.slow + 1 : Math.max(0, this.slow - 1);
    if (this.slow > 20) {
      this.value = Math.max(0.3, this.value * 0.75);
      this.slow = 0;
    }
  },
};
