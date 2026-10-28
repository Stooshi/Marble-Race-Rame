'use strict';

/**
 * Races for the videos (client/video/README.md): runs a track's races locally on the real simulator,
 * scores each one for the camera (a close finish, lead changes late on, the top three swapping) and
 * writes the best (or a chosen seed) for the recorder: client/dev/.tracks/<slug>.json (the track) and
 * <slug>.video-<seed>.json (the race). Nothing here touches the database or any stored race.
 *   node scripts/video-race.js <slug> [--seeds 80] [--seed <n>] [--top 5]
 */
const fs = require('node:fs');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('./race-fingerprints');

const DEV = path.join(__dirname, '..', 'client', 'dev', '.tracks');

/** What makes a race good to watch: how it is scored (higher is better). */
function scoreRace(r) {
  const fin = r.results.map((x) => x.finishTimeMs).filter(Number.isFinite).sort((a, b) => a - b);
  let leadChanges = 0; let late = 0; let top3 = 0; let prev = null; let prev3 = null;
  for (const f of r.frames) {
    if (!f.s) continue;
    if (prev !== null && f.s[0] !== prev) { leadChanges += 1; if (Math.max(...f.p) > 0.7) late += 1; }
    prev = f.s[0];
    const k = f.s.slice(0, 3).join();
    if (prev3 && k !== prev3) top3 += 1;
    prev3 = k;
  }
  const margin = fin[1] - fin[0];
  return { winMs: fin[0], margin, third: fin[2] - fin[0], leadChanges, late, top3, score: -Math.min(margin, 3000) / 150 + late * 3 + leadChanges * 0.7 + Math.min(top3, 60) * 0.1 };
}

function raceFor(track, seed) {
  const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
  return { seed, sim, ...scoreRace(sim) };
}

function write(slug, track, { seed, sim }) {
  fs.mkdirSync(DEV, { recursive: true });
  fs.writeFileSync(path.join(DEV, `${slug}.json`), JSON.stringify(track));
  const entries = houseField(seed).map((e, index) => ({ index, entryId: e.id, lane: e.lane, isBot: true, user: null, marble: { id: e.id, slug: e.id, name: e.id } }));
  const name = `${slug}.video-${seed}`;
  fs.writeFileSync(path.join(DEV, `${name}.json`), JSON.stringify({ seed, entries, frames: sim.frames, results: sim.results, start: sim.start, tickMs: sim.tickMs, durationMs: sim.durationMs }));
  return name;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const opt = (n, d) => (args.includes(`--${n}`) ? Number(args[args.indexOf(`--${n}`) + 1]) : d);
  const track = physicsTrack(slug);
  if (!track) throw new Error(`No physics track "${slug}"`);
  if (args.includes('--seed')) {
    const r = raceFor(track, opt('seed'));
    console.log(JSON.stringify({ race: write(slug, track, r), ...r, sim: undefined }));
  } else {
    const rows = [];
    for (let k = 0; k < opt('seeds', 80); k += 1) rows.push(raceFor(track, 900001 + k * 7919));
    rows.sort((a, b) => b.score - a.score);
    for (const r of rows.slice(0, opt('top', 5))) console.log(JSON.stringify({ ...r, sim: undefined }));
    console.log(JSON.stringify({ race: write(slug, track, rows[0]) }));
  }
}

module.exports = { scoreRace, raceFor };
