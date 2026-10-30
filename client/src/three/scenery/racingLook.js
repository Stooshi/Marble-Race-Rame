/**
 * Racing look (Moses, 30 Oct 2026; the lighter version approved and rolled out to every track the same
 * morning): small racing touches painted flat on the ice, looks only (the race never sees them):
 *   - a chequered start line and finish line, on every track;
 *   - short, muted red-and-white kerbs on the inside of the 1–2 sharpest bends only (a nature world:
 *     Canyons, Rivers, Peaks, at most one).
 * The lighter version (Moses, 30 Oct 2026, 09:35): fewer and shorter kerbs, muted colours, no chevrons.
 * A Track and Field track keeps its own white start line and lane markings: only its finish gets the chequer.
 * Returned as pieces ({ s, positions, colors }) that TrackScene adds into the channel's own pieces
 * (the same material), so it costs no draw call of its own.
 */
import { Color, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, placeOnChannel } from '../iceChannel';

const KERB = { red: '#a9554d', white: '#d9d2c4', block: 0.9, from: 0.52, to: 0.64, half: 6.5, sharp: 0.016 }; // metres along; share of the lip across
// (PROPOSAL `more`, Moses 30 Oct 2026 12:50: about 3 kerbs and 3 chevron sets a track; samples only)
const MORE = { kerbs: 3, sharp: 0.012, chevrons: 3, straight: 45 };
const CHEVRON = { colour: '#cfc8ba', count: 3, gap: 6, length: 2.4, width: 0.3, thick: 0.2 };
const CHECK = { dark: '#202126', light: '#eeece6', depth: 0.5, rows: 2, columns: 12 };
const START_AT = 2.3; // metres: just in front of the gate's front row (as the Track and Field start line)

/**
 * `nature`: a Canyons, Rivers or Peaks track (kit.canyon / kit.river / kit.peak): at most one kerb;
 * `athletics`: a Track and Field track: the finish's chequer only.
 * → { parts: [{ s (metres along), positions, colors }], apexes (progress of the kerbed bends) }
 */
export function buildRacingLook(centerline, channel, { lite = false, nature = false, athletics = false, more = false } = {}) {
  const most = athletics ? 0 : more ? MORE.kerbs : nature ? 1 : 2;
  const arc = channel.arc;
  const { samples, segments } = centerline;
  const out = new Vector3();
  const nrm = new Vector3();
  const at = (s, l, lift = 0.03) => placeOnChannel(centerline, channel, Math.min(1, Math.max(0, s / arc)), l, 0, 0, lift, out, nrm).clone();
  const lipShare = (s) => channelLipAt(channel, s) / channel.maxAngle;
  const parts = [];
  let part = null;
  const begin = (s0) => { part = { s: s0, positions: [], colors: [] }; parts.push(part); };
  const c = new Color();
  const quad = (a, b, d, e, colour) => {
    c.set(colour);
    for (const p of [a, b, d, a, d, e]) { part.positions.push(p.x, p.y, p.z); part.colors.push(c.r, c.g, c.b); }
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

  // ── Kerbs: the sharpest one or two apexes, at least 80 m apart, away from the start and the finish ──
  const step = 2;
  const turns = [];
  for (let s = 40; s < arc - 70; s += step) turns.push({ s, k: turn(s) });
  const apexes = [];
  for (const t of [...turns].sort((x, y) => Math.abs(y.k) - Math.abs(x.k))) {
    if (Math.abs(t.k) < (more && apexes.length >= 1 ? MORE.sharp : KERB.sharp)) break; // (only a sharp bend gets one; the proposal's extra ones: a fairly sharp bend)
    if (apexes.some((a) => Math.abs(a.s - t.s) < 80)) continue;
    apexes.push(t);
    if (apexes.length >= most) break;
  }
  if (!most) apexes.length = 0;
  for (const apex of apexes) {
    begin(apex.s);
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

  // ── PROPOSAL `more`: muted chevron sets on the longest nearly straight stretches (45 m and more) ──
  const chevronsAt = [];
  if (more && !athletics) {
    const runs = [];
    let run = null;
    for (const t of turns) {
      if (Math.abs(t.k) < 0.004 && !forkAt(channel, t.s)) { run = run ?? { from: t.s, to: t.s }; run.to = t.s; } else { if (run) runs.push(run); run = null; }
    }
    if (run) runs.push(run);
    for (const r of runs.filter((x) => x.to - x.from >= MORE.straight).sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, MORE.chevrons)) {
      const mid = (r.from + r.to) / 2;
      chevronsAt.push(+(mid / arc).toFixed(3));
      begin(mid);
      for (let k = 0; k < CHEVRON.count; k += 1) {
        const s0 = mid + (k - (CHEVRON.count - 1) / 2) * CHEVRON.gap;
        const w = CHEVRON.width * lipShare(s0);
        const tk = CHEVRON.thick / (channelRadiusAt(channel, s0) * channel.maxAngle);
        for (const sgn of [1, -1]) {
          quad(at(s0, sgn * w), at(s0 + CHEVRON.length, 0), at(s0 + CHEVRON.length + 0.25, 0), at(s0 + 0.25, sgn * w), CHEVRON.colour);
          quad(at(s0, sgn * (w - tk)), at(s0 + CHEVRON.length - 0.05, 0), at(s0 + CHEVRON.length, 0), at(s0, sgn * w), CHEVRON.colour);
        }
      }
    }
  }

  // ── Chequered start and finish lines: two rows of squares across the floor ──
  const chequer = (s0) => {
    begin(s0);
    const lip = lipShare(s0) * 0.9;
    const cols = lite ? CHECK.columns / 2 : CHECK.columns;
    for (let r = 0; r < CHECK.rows; r += 1) {
      const s = s0 + r * CHECK.depth;
      for (let k = 0; k < cols; k += 1) {
        const a = -lip + (2 * lip * k) / cols;
        const b = -lip + (2 * lip * (k + 1)) / cols;
        quad(at(s, a, 0.035), at(s, b, 0.035), at(s + CHECK.depth, b, 0.035), at(s + CHECK.depth, a, 0.035), (k + r) % 2 ? CHECK.light : CHECK.dark);
      }
    }
  };
  if (!athletics) chequer(START_AT);
  chequer(arc - 0.45 - CHECK.depth);
  return { parts, apexes: apexes.map((x) => +(x.s / arc).toFixed(3)), chevronsAt };
}
