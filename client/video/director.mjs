// The director (Moses, 29 Oct 2026: "the pack is the show"): reads a race before it is filmed and
// picks the shots. Watching a lone leader isn't fun, even if it wins, so:
//   - the start wide: the whole field leaving the gate, bunching and smashing into each other;
//   - about half the race on the pack and the fights in it, cutting to wherever the most is happening
//     (bunches, contacts, overtakes in the pack, marbles in the air), the game's follow camera on a
//     marble at the back of the bunch, so the bunch is in front of the lens (close: contact and near misses),
//     or a wider chase camera behind the bunch;
//     the track's TV cameras show the pack coming towards them when the followed pack marble passes;
//   - back to the leader for lead changes and the last stretch; the finish head-on, so the leader AND the
//     chasers are seen arriving;
//   - calm cuts: 3–6 s a shot, shorter only at the big moments.
// Everything is read from the race's own frames (p: share of the track, l: across, h: height in the air,
// s: the order), so the same race always gets the same cut.

/** The photo-finish camera: 9 m past the line, 3 m up, looking back up the track through the finish arch (checked on all six tracks). */
export const FINISH_EYE = { p: 1, back: -9, beside: 0, up: 3, ahead: -12, lookUp: 0, fov: 34 };

/**
 * The start, wide: a camera 3% of the way down the track, 6 m up, looking back up at the gate, turning with
 * the middle of the field as all 20 leave it and bunch towards the lens (checked on all six tracks).
 */
export const START_EYE = { p: 0, back: 6, beside: 0, up: 22, ahead: 12, fov: 46 }; // (behind the field, looking down the track: the lane and gate markings read the right way up; Moses, 30 Oct 2026)
export const START_SHOT = (from, dur) => ({ type: 'pan', eye: START_EYE, members: Array.from({ length: 20 }, (_, i) => i), from, dur, fov: START_EYE.fov, lead: 16 }); // (aimed above the field, so the gate sits low in the picture and the run ahead fills it)

const STEP = 250;          // ms between readings
const BUNCH_M = 10;        // metres: marbles this close together along the track are a bunch
const CONTACT_M = 0.6;     // along the track…
const CONTACT_L = 0.22;    // …and across (share of the channel's half-width): touching, or near enough
const AIR_M = 0.2;         // metres up: in the air

const tOf = (race, i) => race.frames[i].t ?? i * race.tickMs;
function frameAt(race, t) {
  const i = Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)));
  return race.frames[i];
}

/** What is happening at each moment of the race (every STEP ms from GO to `to`). */
export function analyse(race, arc, to) {
  const out = [];
  let prevOrder = null;
  let prevLead = null;
  for (let t = 0; t <= to; t += STEP) {
    const f = frameAt(race, t);
    const racing = f.p.map((p, i) => ({ i, s: p * arc, l: f.l?.[i] ?? 0, h: f.h?.[i] ?? 0 })).filter((m) => m.s < arc - 0.5);
    racing.sort((a, b) => b.s - a.s);
    // The densest bunch: the most marbles within BUNCH_M of each other.
    let best = { n: 0, from: 0, to: 0 };
    for (let a = 0, b = 0; a < racing.length; a += 1) {
      while (b < racing.length && racing[a].s - racing[b].s <= BUNCH_M) b += 1;
      if (b - a > best.n) best = { n: b - a, from: a, to: b };
    }
    const members = racing.slice(best.from, best.to).map((m) => m.i);
    let contacts = 0;
    for (let a = 0; a < racing.length; a += 1) {
      for (let b = a + 1; b < racing.length && racing[a].s - racing[b].s < CONTACT_M; b += 1) {
        if (Math.abs(racing[a].l - racing[b].l) < CONTACT_L) contacts += 1;
      }
    }
    const order = members.join();
    const swaps = prevOrder && members.length > 2 ? members.filter((m, k) => prevOrder[k] !== undefined && prevOrder[k] !== m).length : 0;
    prevOrder = members;
    const lead = f.s?.[0] ?? null;
    const leadChange = prevLead !== null && lead !== prevLead;
    prevLead = lead;
    const air = racing.filter((m) => m.h > AIR_M).length;
    const leadGap = racing.length > 1 ? racing[0].s - racing[1].s : 99;
    // (The camera follows the bunch's last marble, so the whole bunch is in front of the lens: `mid`.)
    out.push({ t, n: best.n, members, mid: members[members.length - 1] ?? lead, contacts, swaps, air, leadChange, leadGap, lead, order });
  }
  return out;
}

const within = (A, a, b) => A.filter((x) => x.t >= a && x.t < b);
/** How much is happening in the pack between a and b (race ms). */
export function packScore(A, a, b) {
  const w = within(A, a, b);
  if (!w.length) return 0;
  const avg = (k) => w.reduce((s, x) => s + x[k], 0) / w.length;
  return avg('n') * 0.35 + avg('contacts') * 1.2 + avg('swaps') * 1.5 + avg('air') * 2.5;
}
/** How much the lead matters between a and b: a lead change, or the first two close. */
export function leadScore(A, a, b) {
  const w = within(A, a, b);
  if (!w.length) return 0;
  return (w.some((x) => x.leadChange) ? 8 : 0) + (w.filter((x) => x.leadGap < 1.2).length / w.length) * 3;
}
/** The busiest moment (race ms) between a and b, by the pack's score over `span` ms. */
export function busiest(A, a, b, span = 3000, avoid = []) {
  let best = null;
  for (const x of A) {
    if (x.t < a || x.t + span > b || avoid.some(([p, q]) => x.t + span > p && x.t < q)) continue;
    const s = packScore(A, x.t, x.t + span);
    if (!best || s > best.s) best = { t: x.t, s, mid: x.mid, members: x.members };
  }
  return best;
}
/** The first time (race ms) marble i reaches share p of the track. */
export function reaches(race, i, p) {
  const k = race.frames.findIndex((f) => (f.p[i] ?? 0) >= p);
  return k < 0 ? null : tOf(race, k);
}

/**
 * The shots for the race from `from` to `to` (race ms), each 3–6 s: the start wide (from 0), then the
 * pack and the leader in turn by where the action is, about `packShare` of the time on the pack.
 * → [{ type: 'race', follow, from, dur } | { type: 'group', members, shot, from, dur }]
 */
export function directRace(A, { from, to, packShare = 0.55, start = true }) {
  const shots = [];
  let t = from;
  if (start && from <= 0) {
    // The start, wide: the whole field leaving the gate.
    shots.push(START_SHOT(0, 4.5));
    t = 4500;
  }
  let pack = 0;
  let total = 0;
  let wide = true;
  let last = [];
  while (to - t >= 3000) {
    const big = within(A, t, t + 4500).some((x) => x.air >= 3 || x.contacts >= 4);
    let len = big ? 3500 : 4500;
    if (to - (t + len) < 3000) len = to - t <= 6000 ? to - t : (to - t) / 2; // (no shot under 3 s or over 6 s at the end)
    const lead = leadScore(A, t, t + len);
    const pk = packScore(A, t, t + len);
    const behind = total > 0 && pack / total < packShare;
    const two = last.length >= 2 && last[0] === last[1];
    let onPack = lead >= 8 ? false : (behind ? pk > 1 : pk > lead + 3.5);
    if (two) onPack = last[0] !== 'pack'; // (never three of the same in a row)
    const at = within(A, t, t + 500)[0] ?? A[A.length - 1];
    if (onPack && at.n >= (behind ? 3 : 4)) { // (a smaller bunch will do when the pack is behind its share)
      if (wide && at.members.length >= 4) shots.push({ type: 'group', members: at.members.slice(0, 8), shot: `pack-${t}`, from: t, dur: len / 1000 });
      else shots.push({ type: 'race', follow: at.mid, from: t, dur: len / 1000 });
      wide = !wide;
      pack += len;
      last = ['pack', ...last];
    } else {
      shots.push({ type: 'race', follow: 'leader', from: t, dur: len / 1000 });
      last = ['leader', ...last];
    }
    total += len;
    t += len;
  }
  if (to > t) shots.push({ type: 'race', follow: 'leader', from: t, dur: (to - t) / 1000 });
  return { shots, packShare: total ? pack / total : 0 };
}
