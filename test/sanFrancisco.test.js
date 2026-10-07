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
const { cableCar, CABLE_PERIOD, FLOP_PERIOD, FLOP_STAY, seaLionFlop } = require('../src/game/trackFeatures');
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
  const LATEST = '2026-10-10-san-francisco-bends.sql';
  // The rebuild (already run live, so never edited) moved it onto the new physics…
  const rebuild = fs.readFileSync(path.join(dir, '2026-10-07-san-francisco-rebuild.sql'), 'utf8');
  assert.match(rebuild, /WHERE slug = 'san-francisco' AND physics IS NULL;/);
  // …re-tunes followed (each already run live is never edited, only followed by a new one)…
  for (const f of ['2026-10-08-san-francisco-retune.sql', '2026-10-09-san-francisco-sea-lions.sql', LATEST]) {
    assert.match(fs.readFileSync(path.join(dir, f), 'utf8'), /^UPDATE tracks$[\s\S]*^ WHERE slug = 'san-francisco';$/m, f);
  }
  // …and the latest sets everything as it is now in code (its header only says what changed).
  const body = (sql) => sql.slice(sql.indexOf('UPDATE tracks'));
  const generated = execFileSync(process.execPath, [script, 'san-francisco', '--retune'], { encoding: 'utf8' });
  assert.equal(body(fs.readFileSync(path.join(dir, LATEST), 'utf8')), body(generated), 'the latest data update no longer gives the track in code');
  const later = fs.readdirSync(dir).filter((f) => f > LATEST && f.includes('san-francisco'));
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

test('the obstacles cause chaos where the pack rides: the cable car, the street furniture and the sea lions all get hit', () => {
  const hits = {};
  const runs = fairnessBatch().slice(0, 20);
  for (const { sim } of runs) for (const [k, n] of Object.entries(sim.stats.features)) hits[k] = (hits[k] ?? 0) + n;
  const per = (k) => hits[k] / runs.length;
  assert.ok(per('cable_car') > 8, `cable car ${per('cable_car')} hits per race`); // parked across part of Powell Street
  assert.ok(per('news_box') + per('hydrant') > 8, `street furniture ${per('news_box') + per('hydrant')} hits per race`);
  assert.ok(per('sea_lion') > 5, `sea lions ${per('sea_lion')} hits per race`); // two flopping into the street
  assert.ok(per('trash_can') > 5, `trash cans ${per('trash_can')} hits per race`);
  assert.ok(per('bus') > 3, `bus ${per('bus')} hits per race`);
  assert.ok(per('boost') > 30, `only ${per('boost')} boost kicks per race`); // four pads across the whole street
});

test('slower into the bends: cobbles brake the pack before each one, no boost pad leads into one, the straights stay fast', () => {
  const bends = ['Powell bend', 'Lombard 1', 'Embarcadero'].map((n) => sf.sections.find((s) => s.name === n));
  const metres = (share) => share * sf.length_m;
  for (const b of bends) {
    // No boost pad on the run into a bend (they sit before the climbs and on the way out of bends)…
    for (const pad of sf.physics.features.filter((f) => f.type === 'boost')) {
      const before = metres(b.from) - metres(pad.at);
      assert.ok(before < 0 || before > 100, `a boost pad ${before.toFixed(0)} m before ${b.name}`);
    }
    // …and cobbles across the street right before it.
    const cobbles = sf.physics.features.find((f) => f.type === 'cobbles' && metres(b.from) - metres(f.at) > 0 && metres(b.from) - metres(f.at) < 60);
    assert.ok(cobbles, `cobbles before ${b.name}`);
  }
  // The pack's speed into each bend (median of every marble in 10 races), and its top speed on the straights.
  const entry = bends.map(() => []);
  let top = 0;
  for (const { sim } of fairnessBatch().slice(0, 10)) {
    bends.forEach((b, n) => {
      for (let i = 0; i < 20; i += 1) entry[n].push(sim.frames.find((f) => f.p[i] >= b.from).v[i] * 3.6);
    });
    for (const f of sim.frames) for (let i = 0; i < 20; i += 1) if (f.p[i] < 1) top = Math.max(top, f.v[i] * 3.6);
  }
  const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
  const [powell, lombard, embarcadero] = entry.map(med);
  assert.ok(powell < 125, `into the Powell bend at ${powell.toFixed(0)} km/h`); // was about 132
  assert.ok(lombard < 100, `into Lombard's hairpins at ${lombard.toFixed(0)} km/h`); // was about 113
  assert.ok(embarcadero < 100, `into the Embarcadero at ${embarcadero.toFixed(0)} km/h`); // was about 108
  assert.ok(top > 140, `top speed on the straights only ${top.toFixed(0)} km/h`);
});

test('the cable car stands parked on its rails across part of Powell Street (old races keep the crossing timetable)', () => {
  const car = sf.physics.features.find((f) => f.type === 'cable_car');
  assert.equal(car.parked, true);
  assert.ok(Math.abs(car.l) > 1 && Math.abs(car.l2) < 0.5, 'from beyond the rim in across part of the street');
  assert.equal(car.phase, undefined);
  // The timetable stays, for replays of races run while it still crossed.
  assert.equal(cableCar(CABLE_PERIOD + 1).dir, -cableCar(1).dir);
  assert.equal(cableCar(5), null);
  for (let t = 0; t < 30; t += 0.37) {
    const a = cableCar(t);
    const b = cableCar(t + 2 * CABLE_PERIOD);
    assert.equal(Boolean(a), Boolean(b));
    if (a) assert.ok(a.dir === b.dir && Math.abs(a.k - b.k) < 1e-9);
  }
});

test('the sea lions flop into the street on a fixed timetable, the same for everyone, and lie there a while', () => {
  let lying = 0;
  for (let t = 0; t < FLOP_PERIOD; t += 0.01) {
    assert.ok(Math.abs(seaLionFlop(t) - seaLionFlop(t + 3 * FLOP_PERIOD)) < 1e-9);
    assert.ok(seaLionFlop(t) >= 0 && seaLionFlop(t) <= 1);
    if (seaLionFlop(t) === 1) lying += 0.01;
  }
  assert.ok(Math.abs(lying - FLOP_STAY) < 0.05, `lies in the street ${lying.toFixed(2)} s of every ${FLOP_PERIOD}`);
  // Two of them, out of step: the run to the finish is never clear of both for long.
  const seals = sf.physics.features.filter((f) => f.type === 'sea_lion');
  assert.equal(seals.length, 2);
  assert.ok(seals.every((f) => f.flop !== undefined && Math.abs(f.l) > 1 && Math.abs(f.reach) < 0.5), 'from a perch beyond the rim into the pack\'s line');
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
