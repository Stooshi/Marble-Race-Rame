'use strict';

/**
 * The finish camera's picture on every track (Moses, 22 Oct 2026): on a 390×844 and a 430×932 phone
 * and a 1280×720 computer, the game's camera driven through the end of a real race (following the
 * marbles coming home, and following the winner). Fails a track where
 *   - anything high over the finish (a roof, a beam, a banner, a board) covers more than 10% of the picture;
 *   - a finished marble is not clearly in the picture: under the results at the bottom, under the
 *     banner at the top, out of the picture or behind something drawn;
 *   - a finished marble is drawn right in front of the lens: a parked one taller than 7% of the picture's
 *     height in its clear part (10% under the results), one still rolling in taller than 12%.
 * Looks only: the race never reads any of it.
 *
 *   node scripts/finish-frame-check.js [slug ...] [--all] [--races n] [--out <file>] [--resume]
 *
 * --all: every race track (not the test layouts). --resume: keep the tracks already in the out file and
 * check only the rest. Exits 1 when a track fails.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { physicsTrack, PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('./race-fingerprints');
const { batchSeeds } = require('../src/report/batch');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const args = process.argv.slice(2);
const value = (flag, dflt) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : dflt);
const outFile = value('--out', path.join(ROOT, 'reports', 'finish-frame.json'));
const raceCount = Number(value('--races', 1));
const RACE_TRACK = (slug) => !/^variety-|^kit-proving-ground/.test(slug);
const flagValues = new Set([outFile, String(raceCount)]);
const resume = args.includes('--resume') && fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const slugs = (args.includes('--all')
  ? PHYSICS_TRACKS.map((t) => t.slug ?? t).filter(RACE_TRACK)
  : args.filter((a) => !a.startsWith('--') && !flagValues.has(a))).filter((slug) => !resume[slug]);

/** A track's verdict from its runs: { pass, problems: [text] }. */
function verdict(runs) {
  if (!runs) return { pass: true, problems: [], skipped: true };
  const problems = [];
  for (const run of runs) {
    const where = `${run.screen}, following ${run.follow}`;
    if (run.worst.cover && run.worst.cover.cover > 0.1) problems.push(`${where}: ${Math.round(run.worst.cover.cover * 100)}% of the picture covered (${run.worst.cover.by.join(', ')})`);
    const lens = run.worst.lens;
    if (lens && lens.over > 1) problems.push(`${where}: a ${lens.parked ? 'parked' : 'finished'} marble right in front of the lens, drawn ${Math.round(lens.size * 100)}% of the picture's height${lens.inBand ? '' : ' (under the results)'}`);
    const { hidden } = run;
    if (hidden.length) problems.push(`${where}: ${hidden.length} finished marble${hidden.length === 1 ? '' : 's'} not clearly in the picture (${[...new Set(hidden.map((h) => h.why))].slice(0, 3).join('; ')})`);
  }
  return { pass: !problems.length, problems };
}

if (require.main === module) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'finish-frame-'));
  const dev = path.join(CLIENT, 'dev', '.tracks');
  fs.mkdirSync(dev, { recursive: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const all = { ...resume };
  let failed = Object.values(resume).filter((v) => !v.pass).length;
  const CHUNK = 12; // tracks per test run (each builds its scenery twice)
  for (let k = 0; k < slugs.length; k += CHUNK) {
    const list = slugs.slice(k, k + CHUNK).map((slug) => {
      const track = physicsTrack(slug);
      const trackFile = path.join(dev, `${slug}.json`);
      fs.writeFileSync(trackFile, JSON.stringify(track));
      const races = batchSeeds(0, raceCount).map((seed) => {
        const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
        return { frames: sim.frames, tickMs: sim.tickMs, durationMs: sim.durationMs, results: sim.results };
      });
      const racesFile = path.join(tmp, `${slug}.races.json`);
      fs.writeFileSync(racesFile, JSON.stringify(races));
      return { track: trackFile, races: racesFile };
    });
    const listFile = path.join(tmp, 'list.json');
    const viewFile = path.join(tmp, 'out.json');
    fs.writeFileSync(listFile, JSON.stringify(list));
    execFileSync('npx', ['vitest', 'run', '--config', 'report/vitest.config.js', 'report/finishFrame.report.js'], {
      cwd: CLIENT, stdio: 'pipe', env: { ...process.env, REPORT_FINISH: listFile, REPORT_OUT: viewFile },
    });
    const got = JSON.parse(fs.readFileSync(viewFile, 'utf8'));
    for (const [slug, runs] of Object.entries(got)) {
      const v = verdict(runs);
      all[slug] = { ...v, runs };
      if (!v.pass) failed += 1;
      console.log(`${slug.padEnd(36)} ${v.skipped ? 'no catch area' : v.pass ? 'pass' : `FAIL: ${v.problems.join(' · ')}`}`);
    }
    fs.writeFileSync(outFile, JSON.stringify(all, null, 1));
    for (const x of list) fs.rmSync(x.races, { force: true });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const total = Object.keys(all).length;
  console.log(`${total - failed} of ${total} pass`);
  if (failed) process.exitCode = 1;
}

module.exports = { verdict };
