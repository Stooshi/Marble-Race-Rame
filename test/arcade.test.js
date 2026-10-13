'use strict';

// The arcade kit (Arcade Series): the family's own settings and rules. Looks only.
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../src/trackKit');
const { physicsTrack } = require('../src/game/physicsTracks');
const { ARCADE_ART } = require('../src/trackKit/recipe');
const { LIGHTINGS } = require('../src/trackKit/lighting');

const { track, opening, layout } = kit;
const START = { gate: 'paddle', shots: { countdown: 'front', launch: 'side' } };
const world = (o = {}) => ({
  slug: 'arcade-check', name: 'Arcade Check', family: 'arcade', biome: 'circuit-board', lighting: 'neon-night', billboardFrame: 'marquee', start: START,
  opening: opening('classic'), sections: layout('classic'), ...o,
});

test('an arcade world: the circuit board or arcade carpet, neon light, the cabinet and the high-score table (looks only)', () => {
  const js = physicsTrack('joystick-spins');
  assert.equal(js.variety.family, 'arcade');
  assert.equal(js.physics.kit.biome, 'blacklight-carpet');
  assert.equal(js.physics.kit.lighting, 'neon-night');
  assert.deepEqual(js.physics.kit.arcade, { art: 'coin-op', finish: 'NEW HIGH SCORE!', title: 'JOYSTICK SPINS' });
  assert.ok(js.physics.kit.billboards.every((b) => b.frame === 'marquee'));
  assert.equal(js.physics.surface, 'ice'); // (it races exactly as the ice channel)
  assert.equal(physicsTrack('kill-screen').physics.kit.arcade.finish, 'LEVEL 256');
  // Defaults, and what the recipe refuses.
  assert.deepEqual(track(world()).physics.kit.arcade, { art: 'coin-op', finish: 'NEW HIGH SCORE!', title: 'ARCADE CHECK' });
  assert.ok(ARCADE_ART.includes('maze'));
  assert.ok(LIGHTINGS.includes('neon-night') && LIGHTINGS.includes('synthwave'));
  assert.doesNotThrow(() => track(world({ lighting: 'synthwave', biome: 'blacklight-carpet' })));
  assert.throws(() => track(world({ arcade: { art: 'plumber' } })), /unknown cabinet art/);
  assert.throws(() => track(world({ arcade: { finish: 'new high score' } })), /high-score table's call-out/);
  assert.throws(() => track(world({ biome: 'meadow' })), /circuit board or arcade carpet/);
  assert.throws(() => track(world({ lighting: 'day' })), /arcade world's light/);
  assert.throws(() => track(world({ billboardFrame: 'plain' })), /cabinet marquees/);
  assert.throws(() => track({ ...world({ family: 'world-tour', biome: 'meadow', lighting: 'day', billboardFrame: undefined }), arcade: { art: 'maze' } }), /arcade settings are for arcade worlds/);
  // Its own library layouts are proven on test tracks built as arcade worlds.
  const t = physicsTrack('variety-layout-cabinet-rows');
  assert.equal(t.physics.kit.arcade.art, 'coin-op');
  assert.equal(t.variety.family, 'test');
});
