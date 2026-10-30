/**
 * Racing look (SAMPLE ONLY, Moses 30 Oct 2026: "subtle, samples only, don't roll out yet"): small racing
 * touches painted flat on the ice, looks only (the race never sees them):
 *   - short red-and-white kerbs on the inside of a few key bends (the tightest apexes, not every bend);
 *   - a few painted chevrons on one main straight (decoration, not boost pads);
 *   - a chequered start line and finish line.
 * Drawn as one mesh in vertex colours (one draw call). Only the dev kit view turns it on
 * (`?racing=1`, TrackScene's `racingLook` option); no track carries it.
 */
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, placeOnChannel } from '../iceChannel';

const KERB = { red: '#c63a32', white: '#ece7dc', block: 1.1, from: 0.5, to: 0.66, half: 11 }; // metres along; share of the lip across
const CHECK = { dark: '#202126', light: '#eeece6', depth: 0.5, rows: 2, columns: 12 };
const CHEVRON = { colour: '#e6e1d6', count: 4, gap: 7, length: 3, width: 0.36, thick: 0.24 };
const START_AT = 2.3; // metres: just in front of the gate's front row (as the Track and Field start line)

export function buildRacingLook(centerline, channel, { lite = false } = {}) {
  const arc = channel.arc;
  const { samples, segments } = centerline;
  const out = new Vector3();
  const nrm = new Vector3();
  const at = (s, l, lift = 0.014) => placeOnChannel(centerline, channel, Math.min(1, Math.max(0, s / arc)), l, 0, 0, lift, out, nrm).clone();
  const lipShare = (s) => channelLipAt(channel, s) / channel.maxAngle;
  const pos = [];
  const col = [];
  const c = new Color();
  const quad = (a, b, d, e, colour) => {
    c.set(colour);
    for (const p of [a, b, d, a, d, e]) { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); }
  };
  const sampleAt = (s) => samples[Math.min(segments, Math.max(0, Math.round((s / arc) * segments)))];
  // The marbles' left as an l sign (the channel's `side` is not always on the left).
  const leftSign = (s) => {
    const k = sampleAt(s);
    return Math.sign(k.side.x * k.tangent.z - k.side.z * k.tangent.x) || 1;
  };
  // How sharply the track turns at s (radians a metre, + to the left), smoothed over ~10 m.
  const turn = (s) => {
    const a = sampleAt(s - 5).tangent;
    const b = sampleAt(s + 5).tangent;
    const ha = Math.atan2(a.x, a.z);
    let d = Math.atan2(b.x, b.z) - ha;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d / 10; // (atan2(x, z) grows turning left when y is up)
  };

  // ── Kerbs: the three tightest apexes, at least 80 m apart, away from the start and the finish ──
  const step = 2;
  const turns = [];
  for (let s = 40; s < arc - 70; s += step) turns.push({ s, k: turn(s) });
  const apexes = [];
  for (const t of [...turns].sort((x, y) => Math.abs(y.k) - Math.abs(x.k))) {
    if (Math.abs(t.k) < 0.012) break; // (a gentle sweep is no key bend)
    if (apexes.some((a) => Math.abs(a.s - t.s) < 80)) continue;
    apexes.push(t);
    if (apexes.length === 3) break;
  }
  for (const apex of apexes) {
    const inside = (apex.k > 0 ? 1 : -1) * leftSign(apex.s); // (the l sign of the bend's inside)
    let n = 0;
    for (let s = apex.s - KERB.half; s < apex.s + KERB.half; s += KERB.block, n += 1) {
      if (forkAt(channel, s) || forkAt(channel, s + KERB.block)) continue;
      const l0 = inside * KERB.from * lipShare(s);
      const l1 = inside * KERB.to * lipShare(s);
      const m0 = inside * KERB.from * lipShare(s + KERB.block);
      const m1 = inside * KERB.to * lipShare(s + KERB.block);
      quad(at(s, l0), at(s + KERB.block, m0), at(s + KERB.block, m1), at(s, l1), n % 2 ? KERB.white : KERB.red);
    }
  }

  // ── Chevrons: on the longest nearly straight stretch (not the first 40 m nor the last 70 m) ──
  let best = null;
  let run = null;
  for (const t of turns) {
    if (Math.abs(t.k) < 0.004 && !forkAt(channel, t.s)) {
      run = run ?? { from: t.s, to: t.s };
      run.to = t.s;
      if (!best || run.to - run.from > best.to - best.from) best = { ...run };
    } else run = null;
  }
  if (best && best.to - best.from > CHEVRON.gap * CHEVRON.count + 10) {
    const mid = (best.from + best.to) / 2;
    for (let k = 0; k < CHEVRON.count; k += 1) {
      const s = mid + (k - (CHEVRON.count - 1) / 2) * CHEVRON.gap;
      const w = CHEVRON.width * lipShare(s);
      const tk = CHEVRON.thick / (channelRadiusAt(channel, s) * channel.maxAngle); // (the arm's width as a share across)
      // A V pointing down the track: two thin arms from the edges back to the tip.
      for (const sgn of [1, -1]) {
        quad(at(s, sgn * w), at(s + CHEVRON.length, 0), at(s + CHEVRON.length + 0.3, 0), at(s + 0.3, sgn * w), CHEVRON.colour);
        quad(at(s, sgn * (w - tk)), at(s + CHEVRON.length - 0.05, 0), at(s + CHEVRON.length, 0), at(s, sgn * w), CHEVRON.colour);
      }
    }
  }

  // ── Chequered start and finish lines: two rows of squares across the floor ──
  const chequer = (s0) => {
    const lip = lipShare(s0) * 0.9;
    const cols = lite ? CHECK.columns / 2 : CHECK.columns;
    for (let r = 0; r < CHECK.rows; r += 1) {
      const s = s0 + r * CHECK.depth;
      for (let k = 0; k < cols; k += 1) {
        const a = -lip + (2 * lip * k) / cols;
        const b = -lip + (2 * lip * (k + 1)) / cols;
        quad(at(s, a, 0.018), at(s, b, 0.018), at(s + CHECK.depth, b, 0.018), at(s + CHECK.depth, a, 0.018), (k + r) % 2 ? CHECK.light : CHECK.dark);
      }
    }
  };
  chequer(START_AT);
  chequer(arc - 0.45 - CHECK.depth);

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new Mesh(g, new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.name = 'racing look (sample)';
  mesh.userData.apexes = apexes.map((a) => +(a.s / arc).toFixed(3));
  mesh.userData.chevronsAt = best ? +(((best.from + best.to) / 2) / arc).toFixed(3) : null;
  return mesh;
}
