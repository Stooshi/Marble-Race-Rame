'use strict';

/**
 * Picks a collision montage shot (Moses, 10 Nov 2026; client/video/DAILY-ORDER.md "Collision montage"):
 * runs a track's races locally on the real simulator and finds the race and the moment where a tight group
 * of marbles hits the most: each other (worked out from the frames, as the game's own click is:
 * client/video/collisions.js) and the obstacles (the race's own obstacle hits). Optionally inside one section
 * (--section "<name>", e.g. a pinball bumper field, a splitter, a block slalom) or a stretch (--p 0.04-0.10).
 * Writes the best race for the recorder with `video.collision` (when, who, how many hits) inside it.
 * Nothing here touches the database or any stored race; races are the same as the game's for that seed.
 *   node scripts/collision-pick.js <slug> [--seeds 60] [--first 900001] [--race-ms 1200] [--section "<name>"] [--p a-b] [--avoid 1,2] [--top 5]
 * --race-ms: the race time the shot covers (a 2.4 s shot at half speed: 1200).
 */
const fs = require('node:fs');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { buildCenterline, trackProfile } = require('../src/game/trackGeometry');
const { houseField } = require('./race-fingerprints');

const DEV = path.join(__dirname, '..', 'client', 'dev', '.tracks');
const GROUP = 5;        // at most this many marbles in the shot's group (the chase camera rides behind them)
const NEAR_M = 4;       // the group: the marbles within this of the marble in the most hits, along the track (at least 3)
const BEHIND_M = 8;     // no other marble this close behind the group's last one (it would run through the low camera)
const STEP_MS = 100;    // windows tried every this often
const GAP_S = 0.11;     // hits closer than this (video time) count once (as the clicks will)

/** The race's metres: along (the track's length) and across (the channel's half-width as an arc). */
function metres(track) {
  const arc = trackProfile(buildCenterline(track)).total ?? track.length_m;
  const ch = track.physics?.channel;
  const room = ch ? (ch.maxAngle * Math.PI / 180) * ch.radius : 2;
  return { arc: Number.isFinite(arc) ? arc : track.length_m, room };
}

function best(sim, track, { M, raceMs, p0, p1, speed, lib }) {
  const race = { frames: sim.frames, tickMs: sim.tickMs };
  const all = Array.from({ length: sim.frames[0].p.length }, (_, i) => i);
  const hitsAll = lib.marbleHits(race, { ...M, own: all, from: 0, to: sim.durationMs });
  const bumps = (sim.events ?? []).filter((e) => e.type === 'bounce' && e.obstacle && e.obstacle !== 'marble' && e.obstacle !== 'wall')
    .map((e) => ({ t: e.t, kind: 'bump', i: e.i, k: 0.5, type: e.obstacle }));
  const hits = [...hitsAll, ...bumps].sort((a, b) => a.t - b.t);
  const frameAt = (t) => sim.frames[Math.min(sim.frames.length - 1, Math.max(0, Math.round(t / sim.tickMs)))];
  let top = null;
  for (let t = 0; t < sim.durationMs - raceMs; t += STEP_MS) {
    const inWin = hits.filter((h) => h.t >= t && h.t < t + raceMs);
    if (inWin.length < 3) continue;
    // (The group: the marble in the most hits and the marbles nearest it along the track, halfway through.)
    const count = new Map();
    for (const h of inWin) for (const i of [h.i, h.j]) if (i !== undefined) count.set(i, (count.get(i) ?? 0) + 1);
    const hub = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const mid = frameAt(t + raceMs / 2);
    if (!(mid.p[hub] >= p0 && mid.p[hub] <= p1) || mid.p[hub] >= 0.99) continue;
    const members = all.filter((i) => mid.p[i] < 1 && Math.abs(mid.p[i] - mid.p[hub]) * M.arc <= NEAR_M)
      .sort((a, b) => Math.abs(mid.p[a] - mid.p[hub]) - Math.abs(mid.p[b] - mid.p[hub])).slice(0, GROUP);
    if (members.length < 3) continue;
    // (Nobody close behind the group, at the start or halfway: a marble catching up runs through the camera.)
    const chased = [frameAt(t), mid].some((f) => {
      const rear = Math.min(...members.map((i) => f.p[i])) * M.arc;
      return all.some((i) => !members.includes(i) && f.p[i] < 1 && f.p[i] * M.arc < rear && f.p[i] * M.arc > rear - BEHIND_M);
    });
    if (chased) continue;
    const mine = new Set(members);
    const ours = inWin.filter((h) => mine.has(h.i) || (h.j !== undefined && mine.has(h.j)));
    const clicks = lib.soundTimes(ours, { from: t, speed, gap: GAP_S });
    const score = clicks.reduce((a, h) => a + 0.6 + h.k, 0) + 0.3 * new Set(ours.map((h) => h.kind)).size;
    if (!top || score > top.score) {
      top = { score, at: t, members: members.sort((a, b) => mid.p[b] - mid.p[a]), clicks: clicks.length, hits: ours.filter((h) => h.kind === 'hit').length, bumps: ours.filter((h) => h.kind === 'bump').length, p: +mid.p[hub].toFixed(3), types: [...new Set(ours.filter((h) => h.type).map((h) => h.type))] };
    }
  }
  return top;
}

function write(slug, track, seed, sim, video) {
  fs.mkdirSync(DEV, { recursive: true });
  fs.writeFileSync(path.join(DEV, `${slug}.json`), JSON.stringify(track));
  const entries = houseField(seed).map((e, index) => ({ index, entryId: e.id, lane: e.lane, isBot: true, user: null, marble: { id: e.id, slug: e.id, name: e.id } }));
  const name = `${slug}.video-${seed}`;
  fs.writeFileSync(path.join(DEV, `${name}.json`), JSON.stringify({ seed, entries, frames: sim.frames, results: sim.results, start: sim.start, tickMs: sim.tickMs, durationMs: sim.durationMs, video }));
  return name;
}

if (require.main === module) {
  (async () => {
    const lib = await import('../client/video/collisions.js');
    const args = process.argv.slice(2);
    const slug = args.find((a) => !a.startsWith('--'));
    const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
    const track = physicsTrack(slug);
    if (!track) throw new Error(`No physics track "${slug}"`);
    const M = metres(track);
    let [p0, p1] = [0.02, 0.99];
    const section = opt('section', null);
    if (section) {
      const sec = track.sections.find((x) => x.name === section) ?? track.sections.find((x) => x.name.startsWith(section));
      if (!sec) throw new Error(`No section "${section}": ${track.sections.map((x) => x.name).join(', ')}`);
      [p0, p1] = [sec.from, sec.to];
    }
    if (opt('p', null)) [p0, p1] = opt('p').split('-').map(Number);
    const raceMs = Number(opt('race-ms', 1200));
    const speed = Number(opt('speed', 1));
    const n = Number(opt('seeds', 60));
    const first = Number(opt('first', 900001));
    const avoid = new Set((opt('avoid', '') || '').split(',').filter(Boolean).map(Number));
    const rows = [];
    for (let k = 0; k < n; k += 1) {
      const seed = first + k * 7919;
      if (avoid.has(seed)) continue;
      const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
      const b = best(sim, track, { M, raceMs, p0, p1, speed, lib });
      if (b) rows.push({ seed, sim, b });
    }
    rows.sort((a, b) => b.b.score - a.b.score);
    for (const r of rows.slice(0, Number(opt('top', 5)))) console.error(JSON.stringify({ seed: r.seed, ...r.b, score: +r.b.score.toFixed(2) }));
    if (!rows.length) throw new Error('No moment with a group hitting found');
    const { seed, sim, b } = rows[0];
    const video = { collision: { ...b, raceMs, section, p0, p1, arc: M.arc, room: M.room } };
    console.log(JSON.stringify({ race: write(slug, track, seed, sim, video), seed, ...b, score: +b.score.toFixed(2) }));
  })().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { metres };
