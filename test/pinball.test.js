'use strict';

// The pinball kit (Pinball Series): the family's own settings and rules. Looks only.
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../src/trackKit');
const { physicsTrack } = require('../src/game/physicsTracks');
const { PINBALL_ART } = require('../src/trackKit/recipe');

const { track, opening, layout } = kit;
const START = { gate: 'paddle', shots: { countdown: 'front', launch: 'side' } };
const table = (o = {}) => ({
  slug: 'pinball-check', name: 'Pinball Check', family: 'pinball', biome: 'playfield', lighting: 'parlour', start: START,
  opening: opening('classic'), sections: layout('classic'), ...o,
});

test('a pinball table: the playfield, the parlour light, its backglass and display (looks only)', () => {
  const mm = physicsTrack('multiball-manor');
  assert.equal(mm.variety.family, 'pinball');
  assert.equal(mm.physics.kit.biome, 'playfield');
  assert.equal(mm.physics.kit.lighting, 'parlour');
  assert.deepEqual(mm.physics.kit.pinball, { art: 'manor', display: 'MULTIBALL!', finish: 'JACKPOT!', title: 'MULTIBALL MANOR' });
  assert.equal(mm.physics.surface, 'ice'); // (it races exactly as the ice channel)
  // Defaults, and what the recipe refuses.
  assert.deepEqual(track(table()).physics.kit.pinball, { art: 'manor', display: 'MULTIBALL!', finish: 'JACKPOT!', title: 'PINBALL CHECK' });
  assert.ok(PINBALL_ART.includes('castle'));
  assert.throws(() => track(table({ pinball: { art: 'jungle' } })), /unknown backglass art/);
  assert.throws(() => track(table({ pinball: { display: 'multiball' } })), /dot-matrix call-out/);
  assert.throws(() => track(table({ biome: 'meadow' })), /playfield/);
  assert.throws(() => track({ ...table({ family: 'world-tour', biome: 'meadow', lighting: 'day' }), pinball: { art: 'manor' } }), /pinball settings are for pinball tables/);
  // Its own library layout is proven on a test track built as a pinball table.
  const t = physicsTrack('variety-layout-staircases');
  assert.equal(t.physics.kit.pinball.art, 'manor');
  assert.equal(t.variety.family, 'test');
});
