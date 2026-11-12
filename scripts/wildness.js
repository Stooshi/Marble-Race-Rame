'use strict';

/**
 * Wildness (Moses, 11 Nov 2026; docs/04-game-rules.md "Wildness"): how wild a track's races are, from the
 * full track report's races on the real simulator plus the track's own big features. Luck, not skill.
 *
 *   node scripts/wildness.js measure [--races 1000] [--list live.json]   → reports/wildness-raw.json (resumes)
 *   node scripts/wildness.js score                                       → src/tracks/wildness.json
 *   node scripts/wildness.js one <slug> [--races 1000] [--from-report]   → one new track's score (prints JSON)
 *     (a track added after the 143 of 11 Nov 2026: its 1,000 races ranked against theirs in src/tracks/wildness.json,
 *     whose own scores never change; its score goes in its own data update, `<date>-<slug>-to-<pack>.sql`)
 *
 * Score 0–100 = race part (ranks among all the live tracks, 60 points) + features (up to 40):
 *   overtakes 18, lead changes 14, obstacle hits 14, finishing gap 8, upsets 6 (1 − rank of the
 *   favourite starting group's share of wins); loop 10, jump 8, splitter 6 each (2 at most),
 *   drop 3 each (3 at most; a fall of more than 6 m within 20 m after the first 10% of the track).
 * Levels: Easy 0–32, Wild 33–46, Extreme 47+.
 * Nothing here touches the database or any stored race.
 */
const fs = require('node:fs');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const { buildCenterline, trackProfile } = require('../src/game/trackGeometry');
const { runBatch, batchSeeds } = require('../src/report/batch');

const RAW = path.join(__dirname, '..', 'reports', 'wildness-raw.json');
const OUT = path.join(__dirname, '..', 'src', 'tracks', 'wildness.json');
const WEIGHTS = { overtakes: 18, leadChanges: 14, hits: 14, gap: 8, upset: 6, loop: 10, jump: 8, splitter: 6, drop: 3 };
const LEVELS = [{ level: 'extreme', from: 47 }, { level: 'wild', from: 33 }, { level: 'easy', from: 0 }];
const levelOf = (score) => LEVELS.find((l) => score >= l.from).level;

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Drops: separate stretches after the first 10% (the starting ramp) falling more than 6 m within 20 m. */
function drops(track) {
  const pr = trackProfile(buildCenterline(track));
  const from = pr.total * 0.1;
  let count = 0;
  let k = 0;
  let lastEnd = -Infinity;
  for (let i = 0; i < pr.s.length; i += 1) {
    if (pr.s[i] < from) continue;
    while (k < pr.s.length - 1 && pr.s[k] - pr.s[i] < 20) k += 1;
    if (pr.y[i] - pr.y[k] > 6 && pr.s[i] > lastEnd) { count += 1; lastEnd = pr.s[k]; }
  }
  return count;
}

function features(track) {
  const f = track.physics?.features ?? [];
  const type = (x) => f.filter((o) => o.type === x).length;
  return {
    loops: type('loop'),
    jumps: type('jump'),
    splitters: (track.physics?.forks ?? (track.physics?.fork ? [track.physics.fork] : [])).length,
    drops: drops(track),
  };
}

/** One track's races, measured as the report measures them. */
function measureRaces(races) {
  const groupWins = [0, 0, 0, 0, 0];
  for (const r of races) if (r.winnerGroup !== undefined) groupWins[r.winnerGroup] += 1;
  const hitsPer = races.map((r) => Object.values(r.hits ?? {}).reduce((a, h) => a + (h.lane ? h.lane.reduce((x, y) => x + y, 0) : 0), 0));
  return {
    races: races.length,
    overtakes: +mean(races.map((r) => r.overtakes)).toFixed(2),
    leadChanges: +mean(races.map((r) => r.leadChanges)).toFixed(3),
    hits: +mean(hitsPer).toFixed(2),
    gapS: +(median(races.map((r) => r.gapMs)) / 1000).toFixed(2),
    favouriteGroupShare: +((Math.max(...groupWins) / races.length) * 100).toFixed(1),
  };
}

/** Percentile rank among all the tracks (0 lowest, 1 highest; ties share). */
function ranker(rows, key) {
  const vals = rows.map((t) => t[key]);
  return (v) => {
    const below = vals.filter((x) => x < v).length;
    const same = vals.filter((x) => x === v).length;
    return (below + (same - 1) / 2) / Math.max(1, vals.length - 1);
  };
}

/** The scores of all the measured tracks (each track ranked against the others). */
function score(rows) {
  const R = Object.fromEntries(['overtakes', 'leadChanges', 'hits', 'gapS', 'favouriteGroupShare'].map((k) => [k, ranker(rows, k)]));
  const W = WEIGHTS;
  return rows.map((t) => {
    const race = W.overtakes * R.overtakes(t.overtakes) + W.leadChanges * R.leadChanges(t.leadChanges) + W.hits * R.hits(t.hits)
      + W.gap * R.gapS(t.gapS) + W.upset * (1 - R.favouriteGroupShare(t.favouriteGroupShare));
    const feat = Math.min(40, W.loop * Math.min(1, t.loops) + W.jump * Math.min(1, t.jumps)
      + W.splitter * Math.min(2, t.splitters) + W.drop * Math.min(3, t.drops));
    const s = Math.min(100, Math.round(race + feat));
    return { ...t, race: +race.toFixed(1), features: feat, score: s, wildness: levelOf(s) };
  });
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
    if (args[0] === 'measure') {
      fs.mkdirSync(path.dirname(RAW), { recursive: true });
      const raw = fs.existsSync(RAW) ? JSON.parse(fs.readFileSync(RAW, 'utf8')) : {};
      const listFile = opt('list', null);
      const live = listFile ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : JSON.parse(fs.readFileSync(OUT, 'utf8')).tracks;
      const n = Number(opt('races', 1000));
      for (const t of live) {
        if (raw[t.slug]?.races >= n) continue;
        const track = physicsTrack(t.slug);
        const started = Date.now();
        const races = await runBatch(t.slug, batchSeeds(0, n), { threads: Number(opt('threads', 2)) });
        raw[t.slug] = { slug: t.slug, name: t.name, series: t.series, ...measureRaces(races), ...features(track) };
        fs.writeFileSync(RAW, JSON.stringify(raw, null, 1));
        console.log(`${Object.keys(raw).length}/${live.length} ${t.slug} ${Math.round((Date.now() - started) / 1000)} s`);
      }
    } else if (args[0] === 'score') {
      const raw = Object.values(JSON.parse(fs.readFileSync(RAW, 'utf8')));
      const rows = score(raw).sort((a, b) => a.slug.localeCompare(b.slug));
      const counts = rows.reduce((c, t) => ({ ...c, [t.wildness]: (c[t.wildness] ?? 0) + 1 }), {});
      fs.writeFileSync(OUT, `${JSON.stringify({
        about: 'Wildness (scripts/wildness.js): how wild a track\'s races are, from the track report\'s races. Luck, not skill.',
        racesPerTrack: Math.min(...rows.map((t) => t.races)),
        seeds: 'batchSeeds(0, racesPerTrack), the full report\'s first batch',
        levels: { easy: '0-32', wild: '33-46', extreme: '47+' },
        counts,
        tracks: rows.map((t) => ({ slug: t.slug, name: t.name, series: t.series, score: t.score, wildness: t.wildness,
          overtakes: t.overtakes, leadChanges: t.leadChanges, hits: t.hits, gapS: t.gapS, favouriteGroupShare: t.favouriteGroupShare,
          loops: t.loops, jumps: t.jumps, splitters: t.splitters, drops: t.drops, races: t.races })),
      }, null, 1)}\n`);
      console.log(counts);
    } else if (args[0] === 'one') {
      const slug = args[1];
      const track = physicsTrack(slug);
      if (!track) throw new Error(`no track "${slug}"`);
      const known = JSON.parse(fs.readFileSync(OUT, 'utf8')).tracks.filter((t) => t.slug !== slug);
      // (--from-report: the full report's first batch, the same 1,000 races, batchSeeds(0, 1000), without racing them again.)
      const saved = path.join(__dirname, '..', 'reports', slug, 'batches.json');
      const fromReport = args.includes('--from-report') && fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, 'utf8'))[0] : null;
      if (args.includes('--from-report') && fromReport?.length !== 1000) throw new Error(`${slug}: no full report with a first batch of 1,000 races`);
      const races = fromReport ?? await runBatch(slug, batchSeeds(0, Number(opt('races', 1000))), { threads: Number(opt('threads', 2)) });
      const me = { slug, name: track.name, ...measureRaces(races), ...features(track) };
      const mine = score([...known, me]).find((t) => t.slug === slug);
      console.log(JSON.stringify(mine));
    } else {
      console.error('node scripts/wildness.js measure|score|one <slug>');
      process.exit(1);
    }
    process.exit(0);
  })().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { score, levelOf, measureRaces, features, WEIGHTS, LEVELS };
