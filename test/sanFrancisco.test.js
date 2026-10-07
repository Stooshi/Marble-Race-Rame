'use strict';

// San Francisco, rebuilt on the new physics: a racing channel dressed as a city
// street. The recipe's checks (see the build plan), and its old classic races.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { physicsTrack } = require('../src/game/physicsTracks');
const { cableCar, CABLE_PERIOD } = require('../src/game/trackFeatures');
const { createRng } = require('../src/game/rng');
const { subSeed } = require('../src/game/simulator');
const { realTracks, realMarbles } = require('./helpers/realTracks');

process.env.DATABASE_URL ||= 'postgres://localhost:1/unused';
const raceService = require('../src/game/raceService');

const sf = physicsTrack('san-francisco');
const sorted = [...realMarbles()].sort((a, b) => (a.slug < b.slug ? -1 : 1));
/** A race as the preview route builds it: 20 of the catalog, lanes from the seed. */
function routeRace(seed) {
  const rng = createRng(subSeed(seed, 3));
  const picked = rng.shuffle([...sorted]).slice(0, 20);
  const lanes = rng.shuffle(picked.map((_, i) => i));
  const entries = picked.map((m, i) => ({ id: m.slug, lane: lanes[i], topSpeed: m.topSpeed, acceleration: m.acceleration, handling: m.handling, luck: m.luck }));
  return { entries, sim: simulatePhysicsRace({ seed, track: sf, entries, level: 3 }) };
}
let batch = null;
const fairnessBatch = () => {
  // Big enough to see class through the chaos (the full check is 3 x 1,000 races).
  batch ??= Array.from({ length: 150 }, (_, k) => routeRace(30_000 + k * 7919));
  return batch;
};

test('San Francisco is moved onto the new physics, then re-tuned, by its data updates: together exactly the track in code', () => {
  const dir = path.join(__dirname, '..', 'docs', 'data_updates');
  const script = path.join(__dirname, '..', 'scripts', 'physics-track-sql.js');
  // The rebuild (already run live, so never edited) moved it onto the new physics…
  const rebuild = fs.readFileSync(path.join(dir, '2026-10-07-san-francisco-rebuild.sql'), 'utf8');
  assert.match(rebuild, /WHERE slug = 'san-francisco' AND physics IS NULL;/);
  // …and the latest re-tune sets everything as it is now in code.
  const retune = fs.readFileSync(path.join(dir, '2026-10-08-san-francisco-retune.sql'), 'utf8');
  const generated = execFileSync(process.execPath, [script, 'san-francisco', '--retune'], { encoding: 'utf8' });
  assert.equal(retune, generated, 'the latest data update no longer gives the track in code');
  const later = fs.readdirSync(dir).filter((f) => f > '2026-10-08-san-francisco-retune.sql' && f.includes('san-francisco'));
  assert.deepEqual(later, [], 'a later San Francisco update: check it against the code here');
});

test('old San Francisco races replay exactly as they ran, on the classic engine', () => {
  // An old race: decided on the classic track (its snapshot), replayed after the track gained physics.
  const classic = realTracks().find((t) => t.slug === 'san-francisco');
  const snapshot = { length_m: classic.length_m, lane_count: classic.lane_count, waypoints: classic.waypoints, obstacles: classic.obstacles };
  const entries = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, lane: i, snap_top_speed: 30 + i * 3, snap_acceleration: 50, snap_handling: 50, snap_luck: 50 }));
  const base = { seed: 11, tick_rate_hz: 10, track_slug: 'san-francisco' };
  const old = raceService.withSnapshot({ ...base, ...sf, physics: sf.physics, track_snapshot: snapshot });
  assert.equal(old.physics, null, 'its own snapshot has no physics: classic');
  const replayed = raceService.runSimulation(old, entries);
  const asRun = raceService.runSimulation({ ...base, ...snapshot, physics: null }, entries);
  assert.equal(JSON.stringify(replayed), JSON.stringify(asRun));
  assert.equal(replayed.start, undefined, 'no starting gate on the classic engine');
});

test('new San Francisco races: same seed, same race; fast, within the limits, every marble home', () => {
  const a = routeRace(4242).sim;
  assert.equal(JSON.stringify(routeRace(4242).sim), JSON.stringify(a));
  for (const { sim } of fairnessBatch().slice(0, 30)) {
    const w = sim.stats.winnerMs / 1000;
    assert.ok(w > 40 && w < 62, `winner ${w} s`);
    assert.ok(sim.stats.lastMs / 1000 < 85, `last finisher ${sim.stats.lastMs / 1000} s`);
    assert.ok(sim.results.every((r) => Number.isFinite(r.finishTimeMs)), 'every marble finishes');
  }
});

test('the climbs are taken at speed and every marble clears them; the walls hold them in the hairpins', () => {
  const climbs = ['Russian Hill', 'Telegraph Hill'].map((n) => sf.sections.filter((s) => s.name.startsWith(n)).at(-1));
  for (const { sim } of fairnessBatch().slice(0, 10)) {
    for (const c of climbs) {
      const tops = [];
      for (let i = 0; i < 20; i += 1) tops.push(sim.frames.find((f) => f.p[i] >= c.to).v[i]);
      // Nobody stalls: even a marble the cable car has just knocked about goes over the top well on the move
      // (the pack crosses at 110-140 km/h; the slowest at about 50).
      assert.ok(Math.min(...tops) > 8, `a marble over ${c.name} at only ${Math.min(...tops).toFixed(1)} m/s`);
      assert.ok(tops.sort((a, b) => a - b)[10] > 25, `the pack over ${c.name} at only ${tops[10].toFixed(1)} m/s`);
    }
    for (const f of sim.frames) for (let i = 0; i < 20; i += 1) assert.ok(Math.abs(f.l[i]) <= 1 + 1e-9, 'inside the channel');
  }
});

test('the obstacles cause chaos where the pack rides: the cable car, the street furniture and the sea lion all get hit', () => {
  const hits = {};
  const runs = fairnessBatch().slice(0, 20);
  for (const { sim } of runs) for (const [k, n] of Object.entries(sim.stats.features)) hits[k] = (hits[k] ?? 0) + n;
  const per = (k) => hits[k] / runs.length;
  assert.ok(per('cable_car') > 15, `cable car ${per('cable_car')} hits per race`);
  assert.ok(per('news_box') + per('hydrant') > 8, `street furniture ${per('news_box') + per('hydrant')} hits per race`);
  assert.ok(hits.sea_lion > 5, `sea lion ${hits.sea_lion} hits in ${runs.length} races`);
  assert.ok(per('trash_can') > 5, `trash cans ${per('trash_can')} hits per race`);
  assert.ok(per('bus') > 3, `bus ${per('bus')} hits per race`);
  assert.ok(per('boost') > 30, `only ${per('boost')} boost kicks per race`); // four pads across the whole street
});

test('the cable car crosses on a fixed timetable, the same for everyone, both ways', () => {
  assert.equal(cableCar(CABLE_PERIOD + 1).dir, -cableCar(1).dir);
  assert.equal(cableCar(5), null);
  for (let t = 0; t < 30; t += 0.37) {
    const a = cableCar(t);
    const b = cableCar(t + 2 * CABLE_PERIOD);
    assert.equal(Boolean(a), Boolean(b));
    if (a) assert.ok(a.dir === b.dir && Math.abs(a.k - b.k) < 1e-9);
  }
});

test('fair: no starting place has an edge, and better marbles win more often without dominating', () => {
  const groups = Array.from({ length: 5 }, () => ({ n: 0, pos: 0 }));
  const total = (e) => e.topSpeed + e.acceleration + e.handling + e.luck;
  let strongWins = 0;
  let weakWins = 0;
  for (const { entries, sim } of fairnessBatch()) {
    for (const r of sim.results) {
      const g = groups[Math.floor(entries[r.index].lane / 4)];
      g.n += 1;
      g.pos += r.position;
    }
    const order = entries.map((e, i) => i).sort((a, b) => total(entries[b]) - total(entries[a]) || (entries[a].id < entries[b].id ? -1 : 1));
    const winner = sim.results[0].index;
    if (order.slice(0, 5).includes(winner)) strongWins += 1;
    if (order.slice(15).includes(winner)) weakWins += 1;
  }
  for (const [k, g] of groups.entries()) {
    const avg = g.pos / g.n;
    assert.ok(avg > 9 && avg < 12, `starting places ${k * 4 + 1}-${k * 4 + 4} finish ${avg.toFixed(2)} on average (fair is 10.5)`);
  }
  const n = fairnessBatch().length;
  assert.ok(strongWins / n > 0.25 && strongWins / n < 0.7, `strongest five won ${strongWins} of ${n}`);
  assert.ok(strongWins / n > weakWins / n + 0.1, `strongest five ${strongWins} wins, weakest five ${weakWins}`);
});
