'use strict';

// The Holiday Season's layer (client/src/three/holidayLayer.js): every holiday track has its weather,
// nothing else does, and the weather fits (snow on the winter tracks). Looks only: the race never reads it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LAYER = require('../client/src/shared/holidayLayer.json');
const TRACKS = require('../src/tracks');

const holiday = TRACKS.filter((t) => t.physics?.kit?.season === 'holiday-2026').map((t) => t.slug);

test('holiday layer: each of the 31 holiday tracks has its weather, and only they', () => {
  assert.equal(holiday.length, 31);
  assert.deepEqual(Object.keys(LAYER.weather).sort(), [...holiday].sort());
  for (const w of Object.values(LAYER.weather)) assert.ok(['snow', 'confetti', 'sparkles'].includes(w), w);
  for (const slug of LAYER.on) assert.ok(holiday.includes(slug), slug);
  // (Winter places snow; the summer-Christmas and New Year places never do.)
  for (const s of ['sydney-harbour-new-year', 'rio-new-year-burst', 'cape-town-summer-christmas', 'buenos-aires-summer-christmas', 'outback-christmas-burst', 'queenstown-pohutukawa-run', 'accra-december-beats', 'goa-star-lanterns']) assert.notEqual(LAYER.weather[s], 'snow', s);
  for (const s of ['tromso-aurora-grand-prix', 'harbin-ice-city', 'new-york-winter-run', 'sapporo-snow-sculptures']) assert.equal(LAYER.weather[s], 'snow', s);
});

test('holiday layer: drawing only (the race and its engine never import it)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../client/src/three/holidayLayer.js'), 'utf8');
  assert.match(src, /LOOKS ONLY/);
  for (const dir of ['src/game', 'src/physics']) {
    const full = path.join(__dirname, '..', dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) assert.doesNotMatch(fs.readFileSync(path.join(full, f), 'utf8'), /holidayLayer/, f);
  }
});
