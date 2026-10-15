'use strict';

/**
 * The track picker's pictures: one small picture of each track, rendered from its own 3D scene
 * (the kit view, client/dev/kit-view.html, in a headless browser) with a race's marbles on it.
 *   node scripts/track-banners.js <slug> [<slug>…]     some tracks
 *   node scripts/track-banners.js --all                every track (switched-off ones too)
 *   node scripts/track-banners.js --missing            only tracks without a picture yet
 * Writes client/public/tracks/<slug>.webp (640×360) and <slug>@2x.webp (1280×720), and the list
 * client/src/shared/trackBanners.json the website reads. The track report runs this for its track,
 * so every new track gets its picture.
 *
 * Looks only: one race is simulated to have marbles on the track, nothing is stored and no
 * race changes. Same camera style on every track (kitView.banner): a raised three-quarter view
 * behind and beside the leader, in daylight (indoor looks, the pinball parlour and the arcades,
 * keep their own light). A track whose automatic picture isn't good gets its own moment and side
 * in scripts/track-banners.json ({ "<slug>": { "t": ms after GO, "side": 1 | -1 } }).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PHYSICS_TRACKS, physicsTrack } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { simulateRace } = require('../src/game/simulator');
const { houseField } = require('./race-fingerprints');
const { realTracks } = require('../test/helpers/realTracks');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const DEV = path.join(CLIENT, 'dev', '.tracks');
const OUT = path.join(CLIENT, 'public', 'tracks');
const MANIFEST = path.join(CLIENT, 'src', 'shared', 'trackBanners.json');
const OVERRIDES = path.join(__dirname, 'track-banners.json');
const SEED = 20261015;
const INDOOR = ['parlour', 'neon-night', 'synthwave']; // (lit rooms, not skies: they keep their own light)

/** Every track the game has: the physics tracks (not the test ones) and the classic tracks. */
function allSlugs() {
  const physics = PHYSICS_TRACKS.map((t) => t.slug).filter((s) => !s.startsWith('variety-') && !s.startsWith('kit-proving-ground'));
  const classic = realTracks().map((t) => t.slug).filter((s) => !physics.includes(s));
  return [...physics, ...classic];
}

/** The series a track is listed under (as GET /api/tracks works it out). */
function seriesOf(track) {
  const kit = track.physics?.kit;
  if (!track.physics) return 'Classic';
  if (kit?.pinball) return 'Pinball';
  if (kit?.arcade) return 'Arcade';
  if (kit?.canyon) return 'Canyons';
  if (kit?.coaster) return 'Coasters';
  if (kit?.grandPrix) return 'Grand Prix';
  return 'World Tour';
}

const CLASSIC_NAMES = { 'meadow-loop': 'Meadow Loop', 'canyon-drop': 'Canyon Drop', 'volcano-run': 'Volcano Run' };

/** The track as the kit view draws it, in daylight, and one race on it. */
function prepare(slug) {
  const physics = physicsTrack(slug);
  let track;
  let sim;
  const entries = houseField(SEED);
  if (physics) {
    track = JSON.parse(JSON.stringify(physics));
    const kit = track.physics.kit;
    if (kit && !INDOOR.includes(kit.lighting)) kit.lighting = 'day';
    sim = simulatePhysicsRace({ seed: SEED, track: physics, entries, level: 3 });
  } else {
    const classic = realTracks().find((t) => t.slug === slug);
    if (!classic) throw new Error(`No track "${slug}"`);
    track = { ...classic, name: slug };
    sim = simulateRace({ seed: SEED, track: classic, entries });
  }
  const looks = entries.map((e, index) => ({ index, entryId: e.id, lane: e.lane, isBot: true, user: null, marble: { id: e.id, slug: e.id, name: e.id, color_primary: '#e23b3b', pattern: 'solid' } }));
  fs.writeFileSync(path.join(DEV, `${slug}.json`), JSON.stringify(track));
  fs.writeFileSync(path.join(DEV, `${slug}.banner-race.json`), JSON.stringify({
    entries: looks, frames: sim.frames, results: sim.results, start: sim.start ?? null, tickMs: sim.tickMs, durationMs: sim.durationMs,
  }));
  const winnerMs = Math.min(...sim.results.map((r) => r.finishTimeMs ?? r.finish_time_ms ?? Infinity).filter(Number.isFinite));
  // The moments to try: from a fifth to two thirds of the winner's race.
  const times = [0.2, 0.3, 0.4, 0.5, 0.6, 0.67].map((k) => Math.round((Number.isFinite(winnerMs) ? winnerMs : sim.durationMs * 0.8) * k));
  return { slug, race: `${slug}.banner-race`, times, name: physics?.name ?? CLASSIC_NAMES[slug] ?? slug, series: seriesOf(physics ?? {}) };
}

function main() {
  const args = process.argv.slice(2);
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { note: '', enabled: false, banners: {} };
  manifest.note = 'The track picker\'s pictures (client/public/tracks/<slug>.webp and @2x), written by scripts/track-banners.js. enabled: shown in the track picker (false: only on /preview/banners). v: changes with the picture, so browsers fetch a new one.';
  let slugs = args.filter((a) => !a.startsWith('--'));
  if (args.includes('--all')) slugs = allSlugs();
  if (args.includes('--missing')) slugs = allSlugs().filter((s) => !manifest.banners[s]);
  if (!slugs.length) { console.log('Nothing to draw. Give slugs, --all or --missing.'); return; }
  fs.mkdirSync(DEV, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  const overrides = fs.existsSync(OVERRIDES) ? JSON.parse(fs.readFileSync(OVERRIDES, 'utf8')) : {};
  const jobs = slugs.map((slug) => {
    process.stdout.write(`  ${slug}: race… `);
    const job = { ...prepare(slug), pick: overrides[slug] ?? null };
    console.log('ok');
    return job;
  });
  const planFile = path.join(DEV, 'banners.plan.json');
  fs.writeFileSync(planFile, JSON.stringify({ out: OUT, jobs }));
  execFileSync('node', ['report/banners.mjs', planFile], { cwd: CLIENT, stdio: 'inherit' });
  const done = JSON.parse(fs.readFileSync(path.join(DEV, 'banners.result.json'), 'utf8'));
  for (const r of done) {
    if (r.error) continue;
    const job = jobs.find((j) => j.slug === r.slug);
    manifest.banners[r.slug] = { name: job.name, series: job.series, v: r.v, bytes: r.bytes, bytes2x: r.bytes2x, t: r.t, side: r.side, marbles: r.seen, ...(r.leaderBlocked && { leaderHidden: true }) };
  }
  manifest.banners = Object.fromEntries(Object.entries(manifest.banners).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
  const failed = done.filter((r) => r.error);
  console.log(`${done.length - failed.length} pictures written to client/public/tracks${failed.length ? `, ${failed.length} failed` : ''}.`);
  if (failed.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { allSlugs, prepare };
