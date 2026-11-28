'use strict';

// Bobsleigh Run and Table Mountain Run, re-laid (Moses, 16 Nov 2026, option (a)): the live tracks have their own
// layouts, laid out with the track kit but still drawn with their hand-built looks; the tracks before that are
// frozen for the engine's tests in src/game/referenceTracks.js (the race fingerprints, test/bobsleigh.test.js,
// test/tableMountain.test.js, the kit's comparisons in test/trackKit.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { physicsTrack } = require('../src/game/physicsTracks');
const { referenceTrack } = require('../src/game/referenceTracks');
const { profile } = require('../src/report/variety');

const DIR = path.join(__dirname, '..', 'docs', 'data_updates');
const SCRIPT = path.join(__dirname, '..', 'scripts', 'physics-track-sql.js');
const body = (sql) => sql.slice(sql.indexOf('UPDATE tracks'));

const TRACKS = [
  { slug: 'bobsleigh-run', look: undefined, scenery: 'the alpine run', feature: 'The Horseshoe' },
  { slug: 'table-mountain-run', look: 'sand', scenery: 'Cape Town', feature: 'Down Platteklip Gorge' },
];

for (const { slug, look, feature } of TRACKS) {
  test(`${slug}: its own layout, still a hand-built track to look at`, () => {
    const live = physicsTrack(slug);
    const ref = referenceTrack(slug);
    assert.notDeepEqual(live.waypoints, ref.waypoints, 'the live track has its new layout');
    // Drawn with its own theme by slug (client themes.js): no kit looks, its start and TV cameras written out.
    assert.equal(live.physics.kit, undefined);
    assert.equal(live.physics.look, look);
    assert.ok(live.physics.startLook.gate && live.physics.startLook.shots.countdown && live.physics.startLook.shots.launch);
    assert.ok(live.physics.tv.length >= 1 && live.physics.tv.every((c) => c.p > 0 && c.p < 1 && Math.abs(c.side) === 1));
    // No splitter any more, and its big feature from the real place.
    assert.equal(live.physics.fork, undefined);
    assert.equal(live.physics.forks, undefined);
    assert.ok(live.sections.some((s) => s.name.startsWith(feature)), feature);
    // The same channel, gate and run-out as the engine's reference track (only the layout and obstacles change).
    for (const k of ['surface', 'pace', 'collisions', 'runout']) assert.deepEqual(live.physics[k], ref.physics[k], k);
    // The sameness check sees it as hand-built (family 'classic'), from what the kit built.
    const p = profile(live);
    assert.equal(p.family, 'classic');
    assert.notEqual(p.opening, 'classic');
  });

  test(`${slug}: its new layout's data update gives the track in code and starts its records again`, () => {
    const later = fs.readdirSync(DIR).filter((f) => f.slice(11).startsWith(`${slug}-new-layout`)).sort();
    assert.ok(later.length, `no ${slug}-new-layout data update`);
    const latest = fs.readFileSync(path.join(DIR, later.at(-1)), 'utf8');
    assert.match(latest, /gets a new layout\./);
    assert.match(latest, /records_since = now\(\)/);
    assert.doesNotMatch(latest, /is_active/);
    assert.equal(body(latest), body(execFileSync(process.execPath, [SCRIPT, slug, '--relayout'], { encoding: 'utf8' })), `${later.at(-1)} no longer gives the track in code`);
  });
}

test('Bobsleigh Run: no Olympic name or rings', () => {
  const bob = physicsTrack('bobsleigh-run');
  assert.ok(!/olympic|\brings?\b/i.test(JSON.stringify(bob)));
});
