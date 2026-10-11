'use strict';

// The variety libraries (openings and layouts) and the sameness check in the track report.
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../src/trackKit');
const { physicsTrack, PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('../scripts/race-fingerprints');
const { varietyCheck, similarity, profile } = require('../src/report/variety');

const { track, opening, layout, OPENING_KINDS, LAYOUT_KINDS } = kit;

const spec = (o = {}) => ({ slug: 'variety-check', name: 'Variety Check', opening: opening('classic'), sections: layout('classic'), ...o });

test('every opening and every layout in the libraries builds within the recipe, and says which it is', () => {
  for (const kind of OPENING_KINDS) {
    const t = track(spec({ opening: opening(kind) }));
    assert.equal(t.physics.kit.opening, kind);
    assert.equal(t.physics.kit.layout, 'classic');
  }
  for (const kind of LAYOUT_KINDS) {
    for (const mirror of [false, true]) assert.equal(track(spec({ sections: layout(kind, { mirror }) })).physics.kit.layout, kind);
  }
  assert.throws(() => opening('cannon'), /unknown opening "cannon"/);
  assert.throws(() => layout('maze'), /unknown layout "maze"/);
});

test('each library opening and layout has its proven test track', () => {
  for (const kind of OPENING_KINDS.filter((k) => k !== 'classic')) assert.equal(physicsTrack(`variety-opening-${kind}`)?.physics.kit.opening, kind);
  for (const kind of LAYOUT_KINDS) assert.equal(physicsTrack(`variety-layout-${kind}`)?.physics.kit.layout, kind);
});

test('the starting rule: a library opening, or the classic steep plunge written out by hand', () => {
  // Tracks built before the library keep their hand-written plunge, and say nothing new about it.
  const legacy = physicsTrack('dubai-marble-grand-prix');
  assert.equal(legacy.physics.kit.opening, undefined);
  assert.equal(legacy.variety.opening, 'classic');
  // A gentle first section without an opening is refused, naming the library.
  const gentle = spec({ opening: undefined, sections: [{ name: 'Gentle', shape: kit.straight(40) }, ...layout('classic')] });
  assert.throws(() => track(gentle), /must open with a proven opening from the library/);
  // An opening that does not come from the library is refused.
  assert.throws(() => track(spec({ opening: { kind: 'cannon', sections: [] } })), /the opening must come from the library/);
  // Twin chutes only as the split-and-merge opening's.
  const chutes = spec();
  chutes.sections = [{ name: 'Chutes', shape: require('../src/trackKit/openings').twinChutes(50) }, ...chutes.sections];
  assert.throws(() => track(chutes), /twin chutes are the split-and-merge opening's/);
  // An opening is dressed, never reshaped.
  assert.throws(() => opening('crest-start', { dress: { climb: { shape: kit.straight(10) } } }), /"shape" cannot be changed/);
  assert.equal(track(spec({ opening: opening('tunnel-launch', { names: { tunnel: 'Gatehouse' } }) })).physics.kit.sections[1].name, 'Gatehouse');
});

test('split-and-merge: two equal chutes off the gate funnel that merge again', () => {
  const t = physicsTrack('variety-opening-split-start');
  const [chutes] = t.physics.forks;
  const sec = t.physics.kit.sections.find((s) => s.shape === 'twinChutes');
  assert.equal(chutes.from, sec.from);
  assert.equal(chutes.to, sec.to);
  assert.deepEqual(chutes.left, chutes.right, 'the same ice in both chutes');
  assert.equal(chutes.tipOffset, 0);
  assert.ok(chutes.from * t.length_m > t.physics.channel.funnel.length, 'the wedge stands below the gate funnel');
});

test('staggered drop: the field goes in five waves of four, a new order each race', () => {
  const t = physicsTrack('variety-opening-staggered-drop');
  const orders = new Set();
  for (const seed of [11, 12, 13, 14, 15, 16]) {
    const entries = houseField(seed);
    const { releaseMs } = simulatePhysicsRace({ seed, track: t, entries, level: 3 }).start;
    const waves = [0, 1, 2, 3, 4].map((g) => entries.map((e, i) => (Math.floor(e.lane / 4) === g ? releaseMs[i] : null)).filter((x) => x !== null));
    for (const w of waves) assert.ok(Math.max(...w) - Math.min(...w) <= 80, 'a wave goes together');
    orders.add(waves.map((w) => Math.round(Math.min(...w) / 300)).join(''));
  }
  assert.ok(orders.size >= 4, 'the waves go in a different order from race to race');
});

test('funnel drop: a longer, wider bowl at the gate (only on that track)', () => {
  const t = physicsTrack('variety-opening-funnel-drop');
  assert.equal(t.physics.channel.funnel.length, 82);
  assert.equal(physicsTrack('dubai-marble-grand-prix').physics.channel.funnel.length, 70);
});

test('the sameness check: identical layouts fail, different ones pass, test tracks are not compared', () => {
  const tokens = (...xs) => xs.map(([t, side]) => ({ t, side }));
  assert.equal(similarity(tokens(['spiral', 'left']), tokens(['spiral', 'left'])), 1);
  assert.equal(similarity(tokens(['spiral', 'left']), tokens(['spiral', 'right'])), 0.75);
  assert.equal(similarity(tokens(['spiral', 'left']), tokens(['hairpin', 'left'])), 0);
  // Today's Grand Prix tracks share one layout: the check fails them.
  const dubai = varietyCheck(physicsTrack('dubai-marble-grand-prix'), PHYSICS_TRACKS);
  assert.ok(dubai.lines.some((l) => l.pass === false && /Layout/.test(l.what)));
  // A track on a new layout and opening passes against every track today.
  const fresh = track(spec({ family: 'world-tour', opening: opening('crest-start'), sections: layout('twin-spirals', { mirror: true }) }));
  const check = varietyCheck(fresh, [...PHYSICS_TRACKS, fresh]);
  assert.deepEqual(check.lines.filter((l) => l.pass === false), []);
  // The libraries' own test tracks are never compared.
  assert.equal(varietyCheck(physicsTrack('variety-layout-classic'), PHYSICS_TRACKS).lines[0].pass, null);
  assert.equal(profile(physicsTrack('kit-proving-ground')).family, 'test');
});

test('a mirrored track is not compared with the track it mirrors', () => {
  const a = track(spec({ family: 'world-tour', opening: opening('banked-turn'), sections: layout('long-sweeps') }));
  const b = kit.mirror(a, { slug: 'variety-check-mirrored', name: 'Variety Check Mirrored' });
  const { scores } = varietyCheck(b, [...PHYSICS_TRACKS, a, b]);
  assert.ok(!scores.some((s) => s.slug === a.slug));
});

test('coasters: up on supports, touching down somewhere, a station roof for billboards, their own rules', () => {
  const sog = physicsTrack('sognefjord');
  assert.equal(sog.variety.family, 'coaster');
  assert.equal(sog.physics.kit.coaster.height, 18);
  assert.ok(sog.physics.kit.sections.some((s) => s.height === 0 && s.shape !== 'runIn'), 'touches down along the way');
  assert.equal(sog.physics.kit.sections.at(-1).height, 0, 'its station stands on the ground');
  assert.equal(sog.physics.kit.sections.find((s) => s.name === 'Mountain tunnel').height, 0, 'its tunnel runs into the land');
  assert.ok(sog.physics.kit.billboards.some((b) => b.mount === 'roof'));
  assert.ok(sog.physics.kit.billboards.filter((b) => b.mount !== 'roof').every((b) => b.mount === 'tower'));
  // Looks only: the race is the ice channel's (no coaster settings reach the physics).
  assert.equal(sog.physics.surface, 'ice');
  const coaster = (o = {}) => spec({ family: 'coaster', sections: layout('classic', { dress: { brakingStraight: { height: 0 } } }), ...o });
  assert.equal(track(coaster()).physics.kit.coaster.colours.support, '#c43a2f');
  assert.throws(() => track(coaster({ sections: layout('classic') })), /touches down somewhere along the way/);
  assert.throws(() => track(coaster({ coaster: { height: 80 } })), /coaster.height is how high the track flies/);
  assert.throws(() => track(coaster({ finish: { billboards: 3 } })), /0 to 2 billboards on the station roof/);
  assert.throws(() => track(spec({ sections: layout('classic', { dress: { sweep: { height: 10 } } }) })), /height, water and waterCurtain are for coasters/);
  assert.throws(() => track(coaster({ sections: layout('mid-drop', { waterfall: false, dress: { belowDrop: { tunnel: 'rock', height: 12, billboards: 0 } } }) })), /coaster's tunnel runs into the land/);
});
