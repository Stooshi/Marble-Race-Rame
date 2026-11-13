'use strict';

// The loop (Moses, 2 Nov 2026; available in the kit, on no live track yet): a clothoid roller-coaster loop, its launch pad, the net
// inside it, and the kit's rules for it. Only the loop's proving track has one; no real track does.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loopShape } = require('../src/game/loopShape');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { physicsTrack, PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { houseField } = require('../scripts/race-fingerprints');
const { track, opening, straight, loop, sBends } = require('../src/trackKit');

const SLUG = 'variety-layout-loop-run';

test('the loop is a clothoid: tightest at the top, easing to nothing at the bottom, back on the ground at its end', () => {
  const L = loopShape({ topRadius: 6, shift: 11, runout: 40 });
  const top = L.at(L.rise).i;
  assert.ok(Math.abs(1 / L.kappa[top] - 6) < 0.1, 'its top radius');
  assert.equal(L.kappa[0], 0);
  assert.ok(Math.abs(L.lerp(L.phi, L.rise) - Math.PI) < 1e-3, 'upside down at the top');
  assert.ok(Math.abs(L.height - 19) < 0.5, `about 19 m tall (${L.height.toFixed(1)})`);
  assert.ok(Math.abs(L.z[L.n]) < 1e-9 && Math.abs(L.q[L.n]) < 1e-9, 'back on the ground, in line');
  // Not a circle: as tall as a circle of the top's radius would be twice over, and narrower than tall.
  let fMin = Infinity;
  let fMax = -Infinity;
  for (let i = 0; i <= L.at(2 * L.rise).i; i += 1) if (L.z[i] > 2) { fMin = Math.min(fMin, L.f[i]); fMax = Math.max(fMax, L.f[i]); }
  assert.ok(L.height > 1.2 * (fMax - fMin), 'a teardrop: taller than wide');
  // Where the way in and the way down pass each other at the bottom, they are a track's width apart.
  let closest = Infinity;
  for (let i = 0; i < top - 40; i += 2) for (let j = top + 40; j <= L.at(2 * L.rise).i; j += 2) {
    closest = Math.min(closest, Math.hypot(L.f[i] - L.f[j], L.z[i] - L.z[j], L.q[i] - L.q[j]));
  }
  assert.ok(closest >= 10.9, `the two tracks ${closest.toFixed(1)} m apart at the bottom (the channel is 8 m wide with its rims)`);
});

test('the loop\'s proving track: the loop is its feature (the flyover\'s highlight), a TV camera looking back at it, never raced for real', () => {
  const t = physicsTrack(SLUG);
  const f = t.physics.features;
  const lp = f.find((x) => x.type === 'loop');
  const pad = f.find((x) => x.type === 'boost' && x.min);
  assert.ok(lp && pad && pad.at < lp.at, 'a launch pad before the loop');
  assert.equal(pad.min, 25);
  assert.equal(t.physics.kit.signature ?? t.signature, 'The loop');
  assert.ok(t.physics.kit.tv.some((c) => c.section === 'The loop' && c.p > lp.at));
  // The only tracks with a loop: its proving track, Saint-Tropez and Pudong Marble Grand Prix (3 Nov 2026), and Nairobi
  // Marble Grand Prix's Expressway loop (its own layout, 7 Nov 2026).
  assert.deepEqual(PHYSICS_TRACKS.filter((x) => x.physics?.features?.some((y) => y.type === 'loop')).map((x) => x.slug), [SLUG, 'nairobi-marble-grand-prix', 'saint-tropez', 'pudong-marble-grand-prix', 'nevada-drag-strip']);
});

test('every marble goes round the loop at racing speed, and every one finishes', () => {
  const t = physicsTrack(SLUG);
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const sim = simulatePhysicsRace({ seed, track: t, entries: houseField(seed), level: 3 });
    const [L] = sim.stats.loops;
    assert.equal(L.entered, 20);
    assert.equal(L.completed, 20, `seed ${seed}: ${L.completed} round`);
    assert.equal(L.caught, 0);
    assert.ok(L.leastPress > 9.81, `seed ${seed}: pressed on over the top with more than gravity's worth to spare (${L.leastPress})`);
    assert.equal(sim.stats.unfinished, 0);
  }
});

test('a marble that can\'t hold on drops into the net and back onto the way down, never off the track; same seed, same race', () => {
  // The proving track with its pad taken away and a rough stretch before the loop: far too slow to get round.
  const t = JSON.parse(JSON.stringify(physicsTrack(SLUG)));
  const lp = t.physics.features.find((x) => x.type === 'loop');
  t.physics.features = t.physics.features.filter((x) => !(x.type === 'boost' && x.min)).concat([{ type: 'cobbles', at: lp.at - 0.02, length: 25, drag: 0.02 }]).sort((a, b) => a.at - b.at);
  const run = () => simulatePhysicsRace({ seed: 7, track: t, entries: houseField(7), level: 3 });
  const sim = run();
  const [L] = sim.stats.loops;
  assert.ok(L.caught >= 15, `most caught by the net (${L.caught})`);
  assert.equal(L.caught + L.completed, 20, 'and the rest round');
  assert.equal(sim.stats.unfinished, 0, 'and every one finishes');
  // Falling: on its way down (h, metres fallen) but never further than the loop is tall, and never moved back down the track.
  const shape = loopShape(lp);
  for (let i = 0; i < 20; i += 1) {
    let was = 0;
    for (const f of sim.frames) {
      assert.ok(f.h[i] <= shape.height, 'never further than the loop is tall');
      assert.ok(f.p[i] >= was - 0.002, 'never sent back down the track');
      was = f.p[i];
    }
  }
  assert.ok(sim.frames.some((f) => f.h.some((h) => h > 3)), 'some fell a good way into the net');
  assert.equal(JSON.stringify(run().frames), JSON.stringify(sim.frames));
});

test('the kit\'s rules for a loop: one a track, on a straight, a launch pad fast enough', () => {
  const base = { slug: 'loop-rules', name: 'Loop rules', family: 'test', surface: 'ice', biome: 'alpine', lighting: 'day', start: { landmark: 'mountain-hut' }, finish: { landmark: 'church' }, opening: opening('classic') };
  const sections = (features) => [
    { name: 'S-bends', shape: sBends({ first: 'left' }), billboards: 2 },
    { name: 'The loop', shape: straight(170, { grade: 0.12 }), features },
    { name: 'Run-in', shape: straight(400, { grade: 0.12 }), billboards: 2 },
  ];
  assert.doesNotThrow(() => track({ ...base, sections: sections([loop({ at: 0.2 })]) }));
  assert.throws(() => track({ ...base, sections: sections([loop({ at: 0.2, min: 18 })]) }), /comes over the loop's top at/);
  assert.throws(() => track({ ...base, sections: sections([loop({ at: 0.2, topRadius: 12 })]) }), /top radius is 4 to 8 m/);
  assert.throws(() => track({ ...base, sections: sections([loop({ at: 0.05 })]) }), /30 m of the straight before its pad/);
});
