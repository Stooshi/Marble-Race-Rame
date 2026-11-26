'use strict';

// Pirate Plunder (Moses, 26 Nov 2026: the Pinball pack towards 20): a pirate pinball table in a storm. The gate stands
// beside a three-masted galleon heeling in the waves, its sails torn. Away on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), along the quay off a speed pad past a barrel
// and through the mooring posts, S-bends through the harbour, down the gangplank, then the table's big feature: the
// whirlpool, a tight, steep banked turn raised high over the playfield; out of the whirlpool off a second speed pad,
// the hairpin round the cannon's swinging boom, the treasure cove and the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, runIn, block, peg, slalom, swipe, parked, boost } = require('../trackKit');

module.exports = track({
  slug: 'pirate-plunder',
  name: 'Pirate Plunder',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A pirate pinball table in a storm: away from the gate in a pack, along the quay past the barrels, through the harbour bends and down the gangplank, then round the whirlpool, a tight, steep banked turn, round the cannon and through the treasure cove to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'pirate', display: 'ALL HANDS!', finish: 'PIRATE KING' },
  signature: 'The whirlpool',
  tvCameras: [
    // (On the outside at the end of the banking, looking back at the field coming round the whirlpool's wall.)
    { section: 'The whirlpool', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Treasure cove', at: 0.6, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'storm-galleon', gate: 'paddle', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Along the quay', shape: straight(55, { grade: 0.12 }),
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [block({ costume: 'barrel', at: 0.25, line: 'left', loss: 0.15 }), slalom({ costume: 'mooring-pole', from: 0.5, to: 0.95, count: 4, loss: 0.3 })],
    },
    {
      name: 'Harbour bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.35, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.7, line: 'center' })],
    },
    {
      name: 'Down the gangplank', shape: plunge(50, { grade: 0.3, from: 0.13 }), billboards: 1,
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    { name: 'Up to the whirlpool', shape: straight(45, { grade: 0.12 }), billboards: 1 },
    { name: 'The whirlpool', shape: sweep({ side: 'right', radius: 45, degrees: 170, grade: 0.14 }) },
    {
      name: 'Out of the whirlpool', shape: sBends({ first: 'left', radius: 65, degrees: 60, grade: 0.13 }),
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.4, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'left' })],
    },
    { name: 'Run to the cannon', shape: straight(40, { grade: 0.12 }) },
    { name: 'Cannon hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'turret-cannon', side: 'high' })] },
    {
      name: 'Treasure cove', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.09 }), billboards: 1,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.35, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.65, line: 'right' })],
    },
    {
      name: 'Down to the flippers', shape: straight(65, { grade: 0.13 }),
      obstacles: [parked({ costume: 'treasure-chests', at: 0.2, side: 'right', length: 6 }), slalom({ costume: 'mooring-pole', from: 0.45, to: 0.88, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
