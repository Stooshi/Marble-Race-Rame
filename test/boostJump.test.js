'use strict';

// The boost-pad jump (track kit: boostJump): a launch pad, a kicker, a gap and a landing deck. Every marble
// clears it (the pad brings each one up to the speed that carries it over), a hidden catch channel brings back
// any marble that would fall short, the recipe keeps it within what its test track proved, and it is used on
// three tracks at most. Tracks without one race exactly as before (test/raceFingerprints.test.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../src/trackKit');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('../scripts/race-fingerprints');
const { PHYSICS_TRACKS, physicsTrack } = require('../src/game/physicsTracks');

const JUMP_RUN = 'variety-layout-jump-run';
const withJump = (over) => {
  const t = physicsTrack(JUMP_RUN);
  return { ...t, physics: { ...t.physics, features: t.physics.features.map((f) => (f.type === 'jump' ? { ...f, ...over.jump } : f.min ? { ...f, ...over.pad } : f)) } };
};

test('the kit builds it: a launch pad wall to wall with its minimum speed, then the kicker, gap and landing deck', () => {
  const t = physicsTrack(JUMP_RUN);
  const pad = t.physics.features.find((f) => f.type === 'boost' && f.min);
  const jump = t.physics.features.find((f) => f.type === 'jump');
  assert.deepEqual({ kick: pad.kick, min: pad.min, length: pad.length, halfWidth: pad.halfWidth }, { kick: 4, min: 22, length: 6, halfWidth: 5.2 });
  assert.deepEqual({ kicker: jump.kicker, height: jump.height, gap: jump.gap, landing: jump.landing, deck: jump.deck }, { kicker: 20, height: 0.9, gap: 4, landing: 40, deck: 0.5 });
  assert.ok(jump.at > pad.at);
});

test('every marble clears it, flies and lands on the deck; nobody falls into the catch channel', () => {
  const t = physicsTrack(JUMP_RUN);
  let flights = 0;
  for (let k = 0; k < 15; k += 1) {
    const r = simulatePhysicsRace({ seed: 900 + k, track: t, entries: houseField(900 + k), level: 3 });
    assert.equal(r.stats.unfinished, 0);
    assert.equal(r.stats.features.caught, 0);
    assert.equal(r.stats.jumpFlights.length, 20);
    for (const f of r.stats.jumpFlights) {
      assert.ok(f.v >= 22, `left the lip at ${f.v} m/s`);
      assert.ok(f.distance > 4 && f.distance < 44, `flew ${f.distance} m`); // (over the gap, down on the deck)
      assert.ok(f.top < 2, `flew ${f.top} m high`);
    }
    flights += r.stats.jumpFlights.length;
  }
  assert.equal(flights, 300);
});

test('the catch channel: a marble that falls short drops under the deck and comes back onto the track', () => {
  // A jump made impossible on purpose (a 14 m gap, the deck almost as high as the lip, no launch pad).
  const t = withJump({ jump: { gap: 14, deck: 0.88 }, pad: { kick: 0, min: 0 } });
  const r = simulatePhysicsRace({ seed: 77, track: t, entries: houseField(77), level: 3 });
  assert.ok(r.stats.features.caught > 0);
  assert.equal(r.stats.unfinished, 0); // (every caught marble finished)
  // Under the deck it is below the ice (a negative height); it never shows above it there.
  assert.ok(r.frames.some((f) => f.h.some((h) => h < -1)));
});

test('the recipe keeps a jump to what its test track proved', () => {
  const sections = (features, shape = kit.straight(140, { grade: 0.12 })) => [
    { name: 'Drop', shape: kit.plunge(80, { grade: 0.6 }), obstacles: [kit.pileUp({ costume: 'reindeer' })] },
    { name: 'Bends', shape: kit.sBends({ first: 'left' }), billboards: 2 },
    { name: 'Jump straight', shape, features },
    { name: 'Sweep', shape: kit.sweep({ side: 'right' }), billboards: 2 },
    { name: 'Run to the hairpin', shape: kit.straight(45, { grade: 0.2 }) },
    { name: 'Hairpin', shape: kit.hairpin({ side: 'left' }) },
    { name: 'Spiral', shape: kit.spiral({ side: 'right' }) },
  ];
  const build = (features, shape) => kit.track({ slug: 'jump-recipe-test', name: 'Jump Recipe Test', family: 'test', sections: sections(features, shape) });
  assert.doesNotThrow(() => build([kit.boostJump({ at: 0.25 })]));
  assert.throws(() => build([kit.boostJump({ at: 0.25 })], kit.sweep({ side: 'left' })), /needs a straight/);
  assert.throws(() => build([kit.boostJump({ at: 0.25, deck: 0.95 })]), /landing deck starts lower/);
  assert.throws(() => build([kit.boostJump({ at: 0.25, gap: 9 })]), /gap is 2 to 6 m/);
  assert.throws(() => build([kit.boostJump({ at: 0.25, min: 12 })]), /at least 18 m\/s/);
  assert.throws(() => build([kit.boostJump({ at: 0.25, gap: 6, deck: 0.85, kicker: 40 })]), /must clear it/);
  assert.throws(() => build([kit.boostJump({ at: 0.25, landing: 15 })]), /past the landing deck/);
  assert.throws(() => build([kit.boostJump({ at: 0.05 })]), /30 m of the straight before/);
  assert.throws(() => build([kit.boostJump({ at: 0.6 })]), /15 m of the straight after/);
  assert.throws(() => build([kit.boostJump({ at: 0.25 }), kit.bump({ at: 0.92 })]), /too close to the boost-pad jump/);
});

test('on three real tracks at most (a signature moment, not a habit)', () => {
  const real = PHYSICS_TRACKS.filter((t) => t.physics.kit && !/^variety-|^kit-proving/.test(t.slug) && t.physics.features?.some((f) => f.type === 'jump'));
  assert.ok(real.length <= 3, real.map((t) => t.slug).join(', '));
});
