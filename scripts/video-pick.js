'use strict';

/**
 * Picks a video's race by searching seeds (Moses, 3 Nov 2026: "pick the race by searching, not by luck"):
 * runs many of a track's races locally on the real simulator and scores each for
 *   1. a pack of 3–4 marbles side by side through at least two curves,
 *   2. 3–4 marbles crossing the line close together (within about 0.3 s), not only the winner,
 *   3. a close winning gap,
 * then writes the best (or a chosen seed) for the recorder, with the moments the shot list needs
 * (`video`: the curves with the pack side by side, the track's signature feature; with --spotlight <look>, the
 * Marble Spotlight's marble and its curve) inside the race file.
 * Nothing here touches the database or any stored race; races are the same as the game's for that seed.
 *   node scripts/video-pick.js <slug> [--seeds 300] [--first 900001] [--seed <n>] [--feature "<section name>"] [--top 8] [--avoid 1,2] [--spotlight <look>]
 */
const fs = require('node:fs');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const { raceFor } = require('./video-race');
const { houseField } = require('./race-fingerprints');

const DEV = path.join(__dirname, '..', 'client', 'dev', '.tracks');
const ALONG_M = 2.2;   // metres: marbles this close along the track are side by side…
const ACROSS = 0.2;    // …when they are also spread this far across (share of the half-width), not in single file
const HOLD_MS = 450;   // a pack of 3+ side by side for at least this long in a curve counts
const CLOSE_MS = 300;  // the finish: 3–4 marbles within this of the winner

/** The track's curves: stretches where it turns tighter than a 70 m radius for 15 m or more (by its waypoints). */
function curves(track) {
  const w = track.waypoints;
  const s = [0];
  for (let i = 1; i < w.length; i += 1) s.push(s[i - 1] + Math.hypot(w[i].x - w[i - 1].x, w[i].z - w[i - 1].z));
  const L = s[s.length - 1];
  const head = (i) => Math.atan2(w[Math.min(i + 1, w.length - 1)].z - w[Math.max(i - 1, 0)].z, w[Math.min(i + 1, w.length - 1)].x - w[Math.max(i - 1, 0)].x);
  const out = [];
  let cur = null;
  for (let i = 2; i < w.length - 2; i += 1) {
    let d = head(i + 1) - head(i - 1);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const k = Math.abs(d) / Math.max(1e-6, s[i + 1] - s[i - 1]);
    if (k > 1 / 70) {
      if (cur && s[i - 1] <= cur.s1 + 1) cur.s1 = s[i + 1];
      else { cur = { s0: s[i - 1], s1: s[i + 1] }; out.push(cur); }
    }
  }
  const names = track.sections ?? [];
  return out.filter((c) => c.s1 - c.s0 >= 15 && c.s0 / L > 0.03 && c.s1 / L < 0.97).map((c) => {
    const p0 = c.s0 / L;
    const p1 = c.s1 / L;
    const sec = [...names].reverse().find((x) => (x.from ?? x.start ?? 0) <= (p0 + p1) / 2);
    return { p0, p1, name: sec?.name ?? null };
  });
}

/** Where a pack of 3+ is side by side inside each curve, and for how long. */
function packsInCurves(sim, track, cs) {
  const L = track.length_m;
  const out = [];
  for (const c of cs) {
    let best = null;
    let run = null;
    for (const f of sim.frames) {
      const inside = f.p.map((p, i) => ({ i, s: p * L, l: f.l?.[i] ?? 0 })).filter((m) => m.s >= c.p0 * L - 8 && m.s <= c.p1 * L + 8).sort((a, b) => b.s - a.s);
      let g = null;
      for (let a = 0; a < inside.length; a += 1) {
        const grp = inside.filter((m) => m.s <= inside[a].s && inside[a].s - m.s <= ALONG_M);
        const ls = grp.map((m) => m.l);
        const spread = grp.length ? Math.max(...ls) - Math.min(...ls) : 0;
        if (grp.length >= 3 && spread >= ACROSS && (!g || grp.length > g.length)) g = grp;
      }
      if (g) {
        const place = Math.min(...g.map((m) => (f.s ?? []).indexOf(m.i)).filter((x) => x >= 0));
        if (!run) run = { t0: f.t, t1: f.t, n: g.length, members: g.slice(0, 4).map((m) => m.i), place };
        else { run.t1 = f.t; run.n = Math.max(run.n, g.length); }
      } else if (run) {
        if (!best || run.t1 - run.t0 > best.t1 - best.t0) best = run;
        run = null;
      }
    }
    if (run && (!best || run.t1 - run.t0 > best.t1 - best.t0)) best = run;
    if (best && best.t1 - best.t0 >= HOLD_MS) out.push({ ...c, t: best.t0, ms: best.t1 - best.t0, n: best.n, members: best.members, place: best.place });
  }
  return out;
}

/** The track's signature feature (a section whose name starts with `feature`): its span, and when the busiest group goes through. */
function featureOf(track, sim, feature) {
  if (!feature) return null;
  const secs = track.sections ?? [];
  const from = (x) => x.from ?? x.start ?? 0;
  const hits = secs.map((x, k) => ({ x, k })).filter(({ x }) => x.name.toLowerCase().startsWith(feature.toLowerCase()));
  if (!hits.length) throw new Error(`No section "${feature}" on ${track.slug}: ${secs.map((x) => x.name).join(', ')}`);
  const p0 = from(hits[0].x);
  const last = hits[hits.length - 1].k;
  const p1 = secs[last + 1] ? from(secs[last + 1]) : 0.98;
  // (The group: the most marbles inside the feature at once, from the leader's entry to the last one's.)
  let best = null;
  for (const f of sim.frames) {
    const inside = f.p.map((p, i) => ({ p, i })).filter((m) => m.p >= p0 && m.p <= p1);
    if (!best || inside.length > best.n) best = { t: f.t, n: inside.length, members: inside.sort((a, b) => b.p - a.p).slice(0, 6).map((m) => m.i) };
  }
  const lead = sim.frames.find((f) => Math.max(...f.p) >= p0);
  return { name: hits[0].x.name.replace(/\s*·\s*\d+$/, ''), p0, p1, leaderIn: lead?.t ?? null, busiest: best };
}

function judge(sim, track, cs) {
  const fin = sim.results.map((r) => r.finishTimeMs).filter(Number.isFinite).sort((a, b) => a - b);
  const margin = fin[1] - fin[0];
  const c3 = fin[2] - fin[0];
  const c4 = fin[3] - fin[0];
  const packs = packsInCurves(sim, track, cs);
  const nCurves = new Set(packs.map((x) => x.name ?? x.p0)).size;
  // (all three wanted: two or more curves with a pack, 3–4 close at the line, a close gap)
  const score = Math.min(nCurves, 4) * 3 + packs.reduce((a, x) => a + Math.min(x.ms, 2500) / 1000 + (x.n >= 4 ? 0.6 : 0) + (x.place <= 6 ? 0.5 : 0), 0) * 0.5
    + (c4 <= CLOSE_MS ? 6 : c3 <= CLOSE_MS ? 4 : c3 <= 500 ? 1.5 : 0) - Math.min(margin, 1000) / 60 - Math.min(c4, 2000) / 400;
  return { margin, c3, c4, nCurves, packs, score, winMs: fin[0] };
}

function write(slug, track, seed, sim, video) {
  fs.mkdirSync(DEV, { recursive: true });
  fs.writeFileSync(path.join(DEV, `${slug}.json`), JSON.stringify(track));
  const entries = houseField(seed).map((e, index) => ({ index, entryId: e.id, lane: e.lane, isBot: true, user: null, marble: { id: e.id, slug: e.id, name: e.id } }));
  const name = `${slug}.video-${seed}`;
  fs.writeFileSync(path.join(DEV, `${name}.json`), JSON.stringify({ seed, entries, frames: sim.frames, results: sim.results, start: sim.start, tickMs: sim.tickMs, durationMs: sim.durationMs, video }));
  return name;
}

const brief = (seed, j) => ({
  seed, score: +j.score.toFixed(2), winner: +(j.winMs / 1000).toFixed(2), margin: j.margin, third: j.c3, fourth: j.c4, curves: j.nCurves,
  packs: j.packs.map((x) => `${x.name ?? x.p0.toFixed(2)} ${x.n}×${(x.ms / 1000).toFixed(1)}s@${(x.t / 1000).toFixed(1)}`).join(' | '),
});

if (require.main === module) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  const track = physicsTrack(slug);
  if (!track) throw new Error(`No physics track "${slug}"`);
  const cs = curves(track);
  const feature = opt('feature', null);
  const finish = (seed, sim, j) => {
    const video = { curves: j.packs, feature: featureOf(track, sim, feature), margin: j.margin, third: j.c3, fourth: j.c4 };
    // (--spotlight <look>: the Marble Spotlight's marble worn by a marble in the longest pack side by side through a
    // curve, the middle one of it, so it is seen racing in the pack; looks only, the race is the same.)
    const look = opt('spotlight', null);
    if (look) {
      const c = [...j.packs].sort((a, b) => b.ms - a.ms)[0];
      if (!c) throw new Error('No curve with a pack side by side in this race');
      video.spotlight = { look, index: c.members[Math.min(1, c.members.length - 1)], curve: { t: c.t, members: c.members, name: c.name, ms: c.ms } };
    }
    console.log(JSON.stringify({ race: write(slug, track, seed, sim, video), ...brief(seed, j), feature: video.feature && { name: video.feature.name, p0: +video.feature.p0.toFixed(3), leaderIn: video.feature.leaderIn, busiest: video.feature.busiest } }));
  };
  console.error(`${slug}: ${cs.length} curves: ${cs.map((c) => `${c.name ?? '?'} ${c.p0.toFixed(2)}–${c.p1.toFixed(2)}`).join(', ')}`);
  if (args.includes('--seed')) {
    const seed = Number(opt('seed'));
    const { sim } = raceFor(track, seed);
    finish(seed, sim, judge(sim, track, cs));
  } else {
    const n = Number(opt('seeds', 300));
    const first = Number(opt('first', 900001));
    const avoid = new Set((opt('avoid', '') || '').split(',').filter(Boolean).map(Number));
    const rows = [];
    for (let k = 0; k < n; k += 1) {
      const seed = first + k * 7919;
      if (avoid.has(seed)) continue;
      const { sim } = raceFor(track, seed);
      const j = judge(sim, track, cs);
      rows.push({ seed, j });
      if ((k + 1) % 50 === 0) console.error(`  ${k + 1} of ${n}`);
    }
    rows.sort((a, b) => b.j.score - a.j.score);
    const allThree = rows.filter((r) => r.j.nCurves >= 2 && r.j.c3 <= CLOSE_MS);
    console.error(`${rows.length} seeds searched; ${allThree.length} have all three (2+ curves with a pack side by side, 3+ within ${CLOSE_MS} ms)`);
    for (const r of rows.slice(0, Number(opt('top', 8)))) console.log(JSON.stringify(brief(r.seed, r.j)));
    const pick = allThree[0] ?? rows[0];
    const { sim } = raceFor(track, pick.seed);
    finish(pick.seed, sim, pick.j);
  }
}

module.exports = { curves, packsInCurves, featureOf, judge };
