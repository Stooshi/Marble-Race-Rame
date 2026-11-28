'use strict';

/**
 * Candidates for the short clips (client/video/README.md): runs `--seeds` races on each track (the
 * ones listed in `--tracks <file.json>`, a JSON list of slugs) on the real simulator and records, per
 * race, what makes a clip: how close the finish was, a lead change on the line, the longest jump, the
 * splitter's share, and where the winner was at halfway (a surprise winner for "Who wins?").
 * Writes one JSON line per track to stdout. Local races only: never the database.
 *   node scripts/video-clips.js --tracks live.json [--seeds 16]
 */
const fs = require('node:fs');
const { physicsTrack } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('./race-fingerprints');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const slugs = JSON.parse(fs.readFileSync(opt('tracks'), 'utf8'));
const SEEDS = Number(opt('seeds', 16));

for (const slug of slugs) {
  const track = physicsTrack(slug);
  if (!track) continue;
  const kit = track.physics.kit ?? {};
  const races = [];
  for (let k = 0; k < SEEDS; k += 1) {
    const seed = 900001 + k * 7919;
    const r = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
    const fin = r.results.map((x) => x.finishTimeMs).filter(Number.isFinite).sort((a, b) => a - b);
    const winner = r.results.find((x) => x.finishTimeMs === fin[0]).index;
    let onTheLine = 0; let prev = null; let halfRank = null;
    for (const f of r.frames) {
      if (!f.s) continue;
      const lead = Math.max(...f.p);
      if (halfRank === null && lead >= 0.5) halfRank = f.s.indexOf(winner) + 1;
      if (prev !== null && f.s[0] !== prev && lead > 0.96 && lead < 1.001) onTheLine += 1;
      prev = f.s[0];
    }
    const sp = r.stats.splitter;
    const share = sp ? Math.min(sp.inside.marbles, sp.outside.marbles) / 20 : null;
    races.push({ seed, winMs: fin[0], margin: fin[1] - fin[0], onTheLine, halfRank, air: r.stats.longestAirSeconds, jumps: r.stats.jumps, share });
  }
  console.log(JSON.stringify({ slug, name: track.name, family: kit.family ?? null, signature: kit.signature ?? null, tv: (kit.tv ?? []).length, races }));
}
