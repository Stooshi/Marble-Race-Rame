'use strict';

// Pirate Plunder (Moses, 26 Nov 2026: the Pinball pack towards 20): a pirate pinball table in a storm. The gate stands
// beside a three-masted galleon heeling in the waves, its sails torn. Away on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), along the quay off a speed pad through the
// mooring posts, then the table's big feature: the whirlpool, a tight, steep banked turn; down the
// gangplank, S-bends through the harbour off a second speed pad, a spin round treasure island, past the cannon's
// swinging boom, down the cliff path, the smugglers' bend, the cove and the run past the treasure chests to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, runIn, peg, slalom, swipe, parked, boost } = require('../trackKit');

module.exports = track({
  slug: 'pirate-plunder',
  name: 'Pirate Plunder',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A pirate pinball table in a storm: away from the gate in a pack, along the quay through the mooring posts, then round the whirlpool, a tight, steep banked turn, down the gangplank, through the harbour bends, round treasure island, past the cannon and down the cliff path to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'pirate', display: 'ALL HANDS!', finish: 'PIRATE KING' },
  signature: 'The whirlpool',
  tvCameras: [
    // (On the outside at the end of the banking, looking back at the field coming round the whirlpool's wall.)
    { section: 'The whirlpool', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Down the cliff path', at: 0.6, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'storm-galleon', gate: 'paddle', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Along the quay', shape: straight(60, { grade: 0.12 }),
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.25, line: 'center' }), slalom({ costume: 'mooring-pole', from: 0.5, to: 0.95, count: 4, loss: 0.3 })],
    },
    { name: 'Up to the whirlpool', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'The whirlpool', shape: sweep({ side: 'right', radius: 45, degrees: 170, grade: 0.14 }) },
    {
      name: 'Down the gangplank', shape: plunge(50, { grade: 0.3, from: 0.14 }), billboards: 1,
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    {
      name: 'Harbour bends', shape: sBends({ first: 'left', radius: 60, degrees: 70, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.4, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'left' })],
    },
    { name: 'Round treasure island', shape: spiral({ side: 'left', radius: 48, turns: 1, grade: 0.15 }) },
    { name: 'Past the cannon', shape: straight(45, { grade: 0.12 }), obstacles: [swipe({ costume: 'turret-cannon', at: 0.3, side: 'right' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'center' })] },
    {
      name: 'Down the cliff path', shape: plunge(45, { grade: 0.3, from: 0.12 }),
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    {
      name: 'Smugglers\' bend', shape: sweep({ side: 'left', radius: 85, degrees: 110, grade: 0.1 }), billboards: 1,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.25, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.5, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'left' })],
    },
    { name: 'Treasure cove', shape: straight(50, { grade: 0.12 }), obstacles: [swipe({ costume: 'turret-cannon', at: 0.25, side: 'left' }), slalom({ costume: 'mooring-pole', from: 0.55, to: 0.9, count: 3, loss: 0.15 })] },
    {
      name: 'Down to the flippers', shape: straight(65, { grade: 0.13 }),
      obstacles: [parked({ costume: 'treasure-chests', at: 0.2, side: 'right', length: 6 }), slalom({ costume: 'mooring-pole', from: 0.45, to: 0.88, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
