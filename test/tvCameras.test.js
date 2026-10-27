'use strict';

// Every track has at least one backward-facing TV camera (Moses, 27 Oct 2026: "every track, current and
// future"): a trackside camera facing back up the track at the oncoming marbles, which the big view cuts
// to as the followed marble comes by (drawing only, never the race). Kit tracks set them in their track
// file (`tvCameras` → physics.kit.tv); the three hand-built tracks carry `physics.tv`. A track added to
// the database without one fails here. (The client test client/test/tvMoments.test.js checks that no
// scenery stands at a camera or between it and the track, on every track.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PHYSICS_TRACKS } = require('../src/game/physicsTracks');

// Every track in the database: added (or rebuilt onto the new physics) by a data update.
const dir = path.join(__dirname, '..', 'docs', 'data_updates');
const inDatabase = new Set();
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^\d{4}-\d\d-\d\d-add-(.+)\.sql$/) ?? f.match(/^\d{4}-\d\d-\d\d-(.+)-rebuild\.sql$/);
  if (m) inDatabase.add(m[1]);
}
const tracks = PHYSICS_TRACKS.filter((t) => inDatabase.has(t.slug));
const spots = (t) => t.physics.kit?.tv ?? t.physics.tv ?? [];

test('every track in the database is here (the data updates and the track files agree)', () => {
  assert.ok(tracks.length >= 141, `${tracks.length} tracks`);
});

for (const t of tracks) {
  test(`${t.slug}: at least one backward-facing TV camera, by the rules`, () => {
    const cams = spots(t);
    assert.ok(cams.length >= 1 && cams.length <= 2, `${t.slug} has ${cams.length} TV cameras (one or two: track file tvCameras, or physics.tv)`);
    const total = Number(t.length_m);
    for (const c of cams) {
      const m = c.p * total;
      assert.ok(m >= 245, `${Math.round(m)} m from the gate (at least 250 m: the start keeps its own shots)`);
      assert.ok(total - m >= 145, `${Math.round(total - m)} m from the line (the last 150 m keep the finish shot)`);
      assert.ok([1, -1].includes(c.side));
      assert.ok(c.distance >= 6 && c.distance <= 25);
      assert.ok(c.height >= 2 && c.height <= 15);
    }
    if (cams.length === 2) assert.ok(Math.abs(cams[0].p - cams[1].p) * total >= 295, 'two cameras at least 300 m apart');
  });
}

test('the standing rule is written down for every new track', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'src', 'tracks', 'README.md'), 'utf8');
  assert.match(readme, /every track[^\n]*at least one backward-facing TV camera/i);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'CLAUDE.md'), 'utf8'), /backward-facing TV camera/);
});
