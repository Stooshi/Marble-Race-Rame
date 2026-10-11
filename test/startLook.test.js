'use strict';

// The "first 3 seconds" check on screen (src/report/startLook.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { PHYSICS_TRACKS, physicsTrack } = require('../src/game/physicsTracks');
const { profile } = require('../src/report/variety');
const { LOOK_FAIL, LOOK_SIZE, frameVector, lookVector, lookSimilarity, readLooks, startLookCheck } = require('../src/report/startLook');

const { width: W, height: H } = LOOK_SIZE;
const picture = (f) => Array.from({ length: W * H }, (_, i) => f(i % W, Math.floor(i / W)));

test('the same picture scores 1, a different one far less; brightness alone does not count', () => {
  const stripes = picture((x) => (x % 20 < 10 ? 40 : 200));
  const bands = picture((x, y) => (y % 20 < 10 ? 40 : 200));
  const brighter = picture((x) => (x % 20 < 10 ? 90 : 250));
  assert.ok(Math.abs(lookSimilarity(frameVector(stripes), frameVector(stripes)) - 1) < 1e-9);
  assert.ok(lookSimilarity(frameVector(stripes), frameVector(bands)) < 0.2);
  assert.ok(lookSimilarity(frameVector(stripes), frameVector(brighter)) > 0.95);
  assert.equal(lookVector([stripes, bands, stripes, bands]).length, 4 * 8 * 6 * 6);
});

test('every track but the test tracks has its start look recorded (the report records each track it checks)', () => {
  const looks = readLooks();
  const missing = PHYSICS_TRACKS.filter((t) => profile(t)?.family !== 'test' && !/^variety-|kit-proving/.test(t.slug) && !looks[t.slug]);
  assert.deepEqual(missing.map((t) => t.slug), []);
});

test('on screen: the coasters\' varied starts look unlike each other; the tracks before them all alike', () => {
  const looks = readLooks();
  const check = (slug) => startLookCheck(physicsTrack(slug), looks[slug].v, PHYSICS_TRACKS, looks);
  for (const slug of PHYSICS_TRACKS.filter((t) => profile(t)?.family === 'coaster').map((t) => t.slug)) assert.equal(check(slug).pass, true, slug);
  for (const slug of ['dubai-marble-grand-prix', 'paris-eiffel-tower-run', 'bobsleigh-run']) {
    const line = check(slug);
    assert.equal(line.pass, false, slug);
    assert.ok(line.scores[0][1] >= LOOK_FAIL);
  }
  assert.equal(startLookCheck(physicsTrack('variety-layout-classic'), looks.sognefjord.v, PHYSICS_TRACKS, looks).pass, null);
});
