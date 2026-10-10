'use strict';

/**
 * The standard track report (track kit, step 7): one command runs every check
 * on a track and writes one page, in the same layout every time, with a pass
 * or fail beside each line and the preview link and switch-on line at the top.
 *
 *   node scripts/track-report.js <slug> [--races 1000] [--batches 3] [--quick] [--out <folder>]
 *
 * Writes reports/<slug>/index.html (and report.json, the screenshots). --quick
 * runs 3 x 200 races, for tuning rounds; the full report runs 3 x 1,000.
 * Parts: fairness batches, pace, close racing, splitters, obstacles (races on
 * every core); safety (same seed same race, database matches the file, today's
 * tracks' fingerprints); ground and camera checks on the drawn track (client
 * report/viewChecks.report.js); drawing load and the fixed screenshots from a
 * headless browser (client report/screens.mjs).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { physicsTrack } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField, computeFingerprints, readFingerprints } = require('./race-fingerprints');
const { runBatch, batchSeeds } = require('../src/report/batch');
const { summarize } = require('../src/report/summarize');
const { renderReport } = require('../src/report/html');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const BUDGETS = { computer: { calls: 60, triangles: 150_000 }, phone: { calls: 35, triangles: 60_000 } };

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const quick = args.includes('--quick');
const RACES = Number(opt('races', quick ? 200 : 1000));
const BATCHES = Number(opt('batches', 3));
const log = (...m) => console.log('[report]', ...m);

/** A colourful field for the screenshots (the house marbles have no looks of their own). */
const LOOKS = ['#e23b3b', '#3f7fd8', '#ffd21f', '#2fb3a0', '#7a3fd0', '#f2a23a', '#ffffff', '#1b1b1b', '#e05aa8', '#7fd34a'];
function withLooks(entries) {
  return entries.map((e, index) => ({
    index, entryId: e.id, lane: e.lane, isBot: true, user: null,
    marble: { id: e.id, slug: e.id, name: e.id, color_primary: LOOKS[index % LOOKS.length], color_secondary: LOOKS[(index * 3 + 1) % LOOKS.length], pattern: index % 3 ? 'swirl' : 'solid' },
  }));
}

/** When the leader first reaches share p of the track (ms after GO). */
function leaderAt(sim, p) {
  const f = sim.frames.find((fr) => Math.max(...fr.p) >= p);
  return f ? f.t : sim.durationMs;
}

async function main() {
  const track = physicsTrack(slug);
  if (!track) throw new Error(`No physics track "${slug}"`);
  const out = path.join(ROOT, 'reports', opt('out', slug));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const started = Date.now();
  const report = { slug, name: track.name, at: new Date().toISOString(), races: RACES, batches: BATCHES, lines: [], ...(track.designChanges && { designChanges: track.designChanges }) };

  // 1. Races: fairness batches, pace, close racing, splitters, obstacles.
  const batches = [];
  for (let b = 0; b < BATCHES; b += 1) {
    log(`batch ${b + 1} of ${BATCHES}: ${RACES} races…`);
    batches.push(await runBatch(slug, batchSeeds(b, RACES), {
      onProgress: (d, total) => { if (d % 100 === 0) log(`  ${d} / ${total}`); },
    }));
  }
  report.lines.push(...summarize(batches, track));
  fs.writeFileSync(path.join(out, 'batches.json'), JSON.stringify(batches)); // (every race's measurements, to look into)

  // 2. Safety.
  const seed = batchSeeds(0, 1)[0];
  const once = JSON.stringify(simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 }));
  const twice = JSON.stringify(simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 }));
  report.lines.push({ part: 'Safety', what: 'The same seed gives the same race', value: once === twice ? 'identical' : 'different', target: 'identical', pass: once === twice });
  report.lines.push(await databaseLine(track));
  const want = readFingerprints();
  const got = computeFingerprints({ limit: 12 });
  const changed = Object.keys(want).filter((k) => got[k].some((h, i) => h !== want[k][i]));
  report.lines.push({ part: 'Safety', what: 'Today\'s tracks race exactly as before (recorded fingerprints)', value: changed.length ? `changed: ${changed.join(', ')}` : `all ${Object.keys(want).length} unchanged`, target: 'all unchanged', pass: !changed.length });

  // 3. The drawn track: ground and camera checks (two races, phone and computer screens).
  const dev = path.join(CLIENT, 'dev', '.tracks');
  fs.mkdirSync(dev, { recursive: true });
  fs.writeFileSync(path.join(dev, `${slug}.json`), JSON.stringify(track));
  const raceSeeds = batchSeeds(0, 2);
  const sims = raceSeeds.map((s) => simulatePhysicsRace({ seed: s, track, entries: houseField(s), level: 3 }));
  const racesFile = path.join(out, 'races.json');
  fs.writeFileSync(racesFile, JSON.stringify(sims.map((s) => ({ frames: s.frames, tickMs: s.tickMs, durationMs: s.durationMs }))));
  if (!args.includes('--skip-view')) {
    log('view checks: ground and camera…');
    const viewFile = path.join(out, 'view.json');
    execFileSync('npx', ['vitest', 'run', '--config', 'report/vitest.config.js'], {
      cwd: CLIENT, stdio: 'inherit', env: { ...process.env, REPORT_TRACK: path.join(dev, `${slug}.json`), REPORT_RACES: racesFile, REPORT_OUT: viewFile },
    });
    report.lines.push(...viewLines(JSON.parse(fs.readFileSync(viewFile, 'utf8')), Boolean(track.physics.kit)));
  }
  fs.rmSync(racesFile, { force: true });

  // 4. Drawing load and the fixed screenshots (headless browser).
  if (!args.includes('--skip-screens')) {
    log('screenshots and drawing load…');
    const sim = sims[0];
    const raceName = `${slug}.report-race`;
    fs.writeFileSync(path.join(dev, `${raceName}.json`), JSON.stringify({
      entries: withLooks(houseField(raceSeeds[0])), frames: sim.frames, results: sim.results, start: sim.start, tickMs: sim.tickMs, durationMs: sim.durationMs,
    }));
    const plan = { slug, race: raceName, out, loadEvery: 2000, shots: fixedShots(track, sim) };
    const planFile = path.join(out, 'plan.json');
    fs.writeFileSync(planFile, JSON.stringify(plan));
    execFileSync('node', ['report/screens.mjs', planFile], { cwd: CLIENT, stdio: 'inherit' });
    const screens = JSON.parse(fs.readFileSync(path.join(out, 'screens.json'), 'utf8'));
    report.shots = screens.shots;
    report.load = screens.load;
    report.lines.push(...loadLines(screens.load));
    if (screens.errors.length) report.lines.push({ part: 'Drawing load', what: 'Errors in the browser while drawing', value: screens.errors.slice(0, 3).join(' | '), target: 'none', pass: false });
    fs.rmSync(planFile, { force: true });
    fs.rmSync(path.join(dev, `${raceName}.json`), { force: true });
  }

  report.minutes = Math.round((Date.now() - started) / 6000) / 10;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(out, 'index.html'), renderReport(report, track));
  const failed = report.lines.filter((l) => l.pass === false);
  log(`done in ${report.minutes} min: ${report.lines.filter((l) => l.pass).length} passed, ${failed.length} failed`);
  for (const l of failed) log(`  FAIL ${l.part}: ${l.what}: ${l.value} (target ${l.target})`);
  log(`report: ${path.relative(ROOT, path.join(out, 'index.html'))}`);
}

/** Does the database hold exactly what the file builds? Only where there is a database to ask. */
async function databaseLine(track) {
  const line = { part: 'Safety', what: 'The database holds exactly what the track file builds', target: 'identical' };
  if (!process.env.DATABASE_URL) return { ...line, value: 'not checked: no database connection here', pass: null };
  const db = require('../src/db');
  try {
    const { rows } = await db.query('SELECT physics, waypoints, length_m FROM tracks WHERE slug = $1', [track.slug]);
    if (!rows[0]) return { ...line, value: 'not in the database yet', pass: null };
    const same = JSON.stringify(rows[0].physics) === JSON.stringify(track.physics) && JSON.stringify(rows[0].waypoints) === JSON.stringify(track.waypoints);
    return { ...line, value: same ? 'identical' : 'different: add a re-tune update', pass: same };
  } catch (err) {
    return { ...line, value: `not checked: ${err.message}`, pass: null };
  } finally {
    await db.pool?.end?.();
  }
}

function viewLines(view, kit) {
  const lines = [];
  for (const screen of ['computer', 'phone']) {
    const g = view.ground[screen];
    lines.push({
      part: 'Ground',
      what: `Buried in the ground: outer wall showing on normal ground (${screen})`,
      value: g.flagged.length ? g.flagged.map((f) => `${f.metres} m at ${Math.round(f.from * 100)}% (${f.why}, ${f.sections.join(', ')})`).join('; ') : `none, over ${g.normalMetres} m of normal ground`,
      target: 'none',
      pass: kit ? !g.flagged.length : null,
    });
  }
  const cams = view.camera;
  const sum = (key) => cams.reduce((n, c) => n + c[key].length, 0);
  const frames = cams.reduce((n, c) => n + c.frames, 0);
  const first = (key) => cams.flatMap((c) => c[key].map((x) => ({ ...x, race: c.race, screen: c.screen })))[0];
  const show = (x) => (x ? ` (first: race ${x.race}, ${x.screen}, ${(x.t / 1000).toFixed(1)} s${x.by ? `, ${x.by}` : ''}${x.metres !== undefined ? `, ${x.metres} m` : ''})` : '');
  lines.push({ part: 'Camera', what: 'Never blocked: nothing solid between the follow camera and its marble', value: `${sum('blocked')} of ${Math.round(frames / 5)} checks${show(first('blocked'))}`, target: 'none', pass: sum('blocked') === 0 });
  lines.push({ part: 'Camera', what: 'Its marble behind an obstacle it is passing, for a moment', value: `${cams.reduce((n, c) => n + c.behindObstacle, 0)} of ${Math.round(frames / 5)} checks`, target: 'shown', pass: null });
  lines.push({ part: 'Camera', what: 'On its marble\'s level: 0 to 20 m above the track it is over (from 5 s)', value: `${sum('offLevel')} of ${frames} frames off; highest ${Math.max(...cams.map((c) => c.highest)).toFixed(1)} m${show(first('offLevel'))}`, target: 'none', pass: sum('offLevel') === 0 });
  lines.push({ part: 'Camera', what: 'No jumps (at most 4 m a frame)', value: `${sum('jumps')} jumps; biggest move ${Math.max(...cams.map((c) => c.worstJump)).toFixed(1)} m${show(first('jumps'))}`, target: 'none', pass: sum('jumps') === 0 });
  lines.push({ part: 'Camera', what: 'Its marble never drawn inside the ice', value: `${sum('sunk')} frames; deepest ${Math.min(...cams.map((c) => c.worstSink)).toFixed(2)} m${show(first('sunk'))}`, target: 'none', pass: sum('sunk') === 0 });
  return lines;
}

function loadLines(load) {
  const lines = [];
  for (const screen of ['computer', 'phone']) {
    // The track and its world, judged on its budget; the race's own marbles (the same on every
    // track: each marble its own draw call) are shown beside it.
    const frames = load[screen].map((f) => ({ ...f, trackCalls: f.calls - (f.marbles?.calls ?? 0), trackTris: f.triangles - (f.marbles?.triangles ?? 0) }));
    const calls = frames.map((f) => f.trackCalls).sort((a, b) => a - b);
    const tris = frames.map((f) => f.trackTris).sort((a, b) => a - b);
    const marbles = Math.max(...frames.map((f) => f.marbles?.calls ?? 0));
    const b = BUDGETS[screen];
    const worst = frames.reduce((w, f) => (f.trackCalls > w.trackCalls ? f : w), frames[0]);
    lines.push({
      part: 'Drawing load',
      what: `${screen === 'phone' ? 'Phone' : 'Computer'}: the track's draw calls and triangles through a race (median, busiest)`,
      value: `${calls[calls.length >> 1]} / ${calls[calls.length - 1]} calls, ${Math.round(tris[tris.length >> 1] / 1000)}k / ${Math.round(tris[tris.length - 1] / 1000)}k triangles (busiest at ${(worst.t / 1000).toFixed(0)} s); the marbles add up to ${marbles} calls`,
      target: `at most ${b.calls} calls, ${b.triangles / 1000}k triangles`,
      pass: calls[calls.length - 1] <= b.calls && tris[tris.length - 1] <= b.triangles,
    });
  }
  return lines;
}

/** The fixed screenshots, always the same ten (fewer when a track has no sharp bend, splitter or billboard). */
function fixedShots(track, sim) {
  const kit = track.physics.kit;
  const sections = kit?.sections ?? track.sections;
  const mid = (s) => (s.from + s.to) / 2;
  const countdown = Math.max(5000, sim.start?.countdownMs ?? 0);
  const winnerMs = Math.min(...sim.results.map((r) => r.finishTimeMs));
  const shots = [
    { name: '01-countdown-opening', title: 'Countdown: opening shot', t: -countdown + 300 },
    { name: '02-start-line-phone', title: 'Starting line (phone)', t: -150, phone: true },
    { name: '03-start-line-computer', title: 'Starting line (computer)', t: -150 },
  ];
  const signature = sections.find((s) => s.name === kit?.signature) ?? sections.find((s) => s.shape === 'spiral') ?? sections.find((s) => s.shape === 'sweep');
  if (signature) shots.push({ name: '04-signature', title: `Signature: ${signature.name}`, t: leaderAt(sim, mid(signature)) });
  const sharp = sections.find((s) => s.shape === 'hairpin');
  if (sharp) shots.push({ name: '05-sharp-bend', title: `The sharp bend: ${sharp.name}`, t: leaderAt(sim, sharp.from + (sharp.to - sharp.from) * 0.4) });
  sections.filter((s) => s.shape === 'splitter').forEach((s, k) => shots.push({ name: `06-splitter-${k + 1}`, title: `Splitter: ${s.name}`, t: leaderAt(sim, mid(s)) }));
  const board = kit?.billboards?.[0];
  if (board) shots.push({ name: '07-billboards', title: `Billboard stretch: ${board.section}`, t: leaderAt(sim, Math.max(0, board.at - 35 / track.length_m)) });
  shots.push({ name: '08-finish', title: 'Finish camera', t: winnerMs + 1500 });
  shots.push({ name: '09-overview', title: 'The whole track from above', t: Math.round(winnerMs / 2), camera: 'overview' });
  shots.push({ name: '10-no-scenery', title: '?scenery=0', t: signature ? leaderAt(sim, mid(signature)) : Math.round(winnerMs / 2), scenery: false });
  return shots;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
