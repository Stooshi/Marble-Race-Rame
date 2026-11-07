'use strict';

// The sameness check (src/report/variety.js) over every track at once (Moses, 6 Nov 2026).
//
// Until now the check ran only in a new track's own report, so tracks built before it (the Grand Prix
// series of 10 Oct 2026 and several World Tour tracks) were never held to it. This test runs it on
// every kit and hand-built track:
//   - a track not listed below must pass every sameness line;
//   - a listed track may fail only the lines listed for it, never a new one;
//   - a listed line that passes again must be taken off the list (so the list only ever shrinks).
// Re-laying out a listed track: take its entry off once its report passes.
const test = require('node:test');
const assert = require('node:assert/strict');
const { PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { varietyCheck, profile } = require('../src/report/variety');

/** The sameness lines, by a short name. */
function lineKey(what) {
  if (what.startsWith('Opening: no other')) return 'opening';
  if (what.startsWith('Opening: at most')) return 'opening-kind';
  if (what.startsWith('Start: no other')) return 'start-shots';
  if (what.startsWith('Start: at most')) return 'start-type';
  if (what.startsWith('Layout: the section')) return 'layout';
  return what;
}

// The known failures on 6 Nov 2026, parked until each track gets its own layout (Moses, 6 Nov 2026).
// opening: opens the same way as another track of its family; opening-kind: more than two of its family
// share its kind of opening; layout: its section order is too alike another track's.
const KNOWN = {
  // The three hand-built tracks (before the track kit).
  'bobsleigh-run': ['opening', 'opening-kind', 'layout'],
  'san-francisco': ['opening-kind'],
  'table-mountain-run': ['opening', 'opening-kind', 'layout'],
  // World Tour.
  'are-run': ['opening', 'opening-kind', 'layout'],
  'portes-du-soleil-run': ['opening-kind', 'layout'],
  'park-city-run': ['opening', 'opening-kind', 'layout'],
  'baqueira-beret-run': ['opening', 'opening-kind', 'layout'],
  'greenland-expedition': ['opening', 'opening-kind', 'layout'],
  'paris-eiffel-tower-run': ['opening', 'opening-kind', 'layout'],
  'dubai-twister': ['opening', 'opening-kind', 'layout'],
  'amazon-water-run': ['layout'],
  'rio-jungle-rumble': ['opening', 'opening-kind', 'layout'],
  'china-wall-twister': ['opening', 'opening-kind', 'layout'],
  // Grand Prix (one design: Dubai's, and Sydney's mirror of it).
  'dubai-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'sydney-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'istanbul-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'nairobi-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'delhi-red-fort-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'sahara-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'elderglade-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'frostmere-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
  'wyrmwood-hollow-marble-grand-prix': ['opening', 'opening-kind', 'layout'],
};

const tracks = PHYSICS_TRACKS.filter((t) => profile(t) && profile(t).family !== 'test');

test('every track passes the sameness check, apart from the known failures listed here', () => {
  const problems = [];
  for (const t of tracks) {
    const failing = varietyCheck(t, PHYSICS_TRACKS).lines.filter((l) => l.pass === false);
    const allowed = KNOWN[t.slug] ?? [];
    for (const l of failing) {
      if (!allowed.includes(lineKey(l.what))) problems.push(`${t.slug}: ${l.what.split(':')[0]}: ${l.value}`);
    }
    const now = failing.map((l) => lineKey(l.what));
    for (const k of allowed) {
      if (!now.includes(k)) problems.push(`${t.slug}: "${k}" passes now, take it off the known failures`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the known failures name only real tracks', () => {
  const slugs = new Set(tracks.map((t) => t.slug));
  for (const slug of Object.keys(KNOWN)) assert.ok(slugs.has(slug), `${slug} is not a track (renamed or removed?)`);
});
