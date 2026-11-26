'use strict';

// Volcano Island (Moses, 26 Nov 2026: the Pinball pack towards 20, the second set): a tiki-island pinball table. The
// gate stands below a volcano of our own, its crater glowing and lava running down its slopes, a carved totem at its
// foot. Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first
// seconds), along the beach path off a speed pad past a swinging tail and through the lava pillars, then the table's big
// feature, the descent into the volcano in three drops: into the lava tube, down the crater wall and over the lava
// falls; between them the lava fields, the crater-rim bends off a second speed pad and the pillars by the vent; the lagoon bend, a spin round the caldera and the lava pillars on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, runIn, peg, slalom, swipe, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'magma-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'volcano-island',
  name: 'Volcano Island',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A tiki-island pinball table: away from the gate in a pack, along the beach path through the lava pillars, then down into the volcano in three drops, into the lava tube, down the crater wall and over the lava falls, across the lava fields and the lagoon and round the caldera to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'volcano', display: 'ERUPTION!', finish: 'FIRE KING' },
  signature: 'Down the crater wall',
  tvCameras: [
    { section: 'Lava fields', at: 0.45, side: 'right', distance: 9, height: 8 },
    // (At the foot of the crater wall, looking back up at the field diving in.)
    { section: 'Down the crater wall', at: 0.85, side: 'left', distance: 9, height: 7 },
  ],
  start: { landmark: 'erupting-volcano', gate: 'barrier', shots: { countdown: 'swing', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Beach path', shape: straight(60, { grade: 0.12 }),
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [swipe({ costume: 'dragon-tail', at: 0.25, side: 'right' }), slalom({ costume: 'magma-pillar', from: 0.5, to: 0.95, count: 3, loss: 0.3 })],
    },
    { name: 'Into the lava tube', shape: plunge(50, { grade: 0.36, from: 0.12 }), billboards: 1, obstacles: drops() },
    {
      name: 'Lava fields', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.1 }), billboards: 1,
      obstacles: [peg({ costume: 'magma-pillar', at: 0.3, line: 'left' }), peg({ costume: 'magma-pillar', at: 0.7, line: 'right' })],
    },
    {
      name: 'Crater-rim bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'magma-pillar', at: 0.4, line: 'right' }), peg({ costume: 'magma-pillar', at: 0.75, line: 'left' })],
    },
    { name: 'Past the vent', shape: straight(45, { grade: 0.12 }), obstacles: [slalom({ costume: 'magma-pillar', from: 0.3, to: 0.7, count: 2, loss: 0.15 })] },
    { name: 'Down the crater wall', shape: plunge(60, { grade: 0.36, from: 0.12 }), obstacles: drops() },
    { name: 'Crater floor', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'Over the lava falls', shape: plunge(50, { grade: 0.36, from: 0.12 }), obstacles: drops() },
    {
      name: 'Lagoon bend', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.1 }),
      obstacles: [peg({ costume: 'magma-pillar', at: 0.35, line: 'left' }), peg({ costume: 'magma-pillar', at: 0.65, line: 'right' })],
    },
    { name: 'Round the caldera', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.15 }) },
    {
      name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }),
      obstacles: [slalom({ costume: 'magma-pillar', from: 0.3, to: 0.88, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
