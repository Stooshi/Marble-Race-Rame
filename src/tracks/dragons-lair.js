'use strict';

// Dragon's Lair (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a dragon's-castle pinball
// table. The gate stands under a dragon of our own curled on a rock over its hoard of gold, wings half open. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// castle road off a speed pad, a siege catapult parked far down it on the right (the table's first obstacle), round
// the drawbridge, through the great hall's gem pillars off a second speed pad, down the dungeon stairs, then the table's big
// feature: the ring of fire, a full loop; round the tower bend, over the battlements, the hoard bends, down to the
// hoard and the gem pillars on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, loop, runIn, parked, peg, slalom, brake, boost } = require('../trackKit');

const pegs = (a, b, at = [0.35, 0.7]) => [peg({ costume: 'gem-pillar', at: at[0], line: a }), peg({ costume: 'gem-pillar', at: at[1], line: b })];
const drops = () => [slalom({ costume: 'gem-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'dragons-lair',
  name: 'Dragon\'s Lair',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A dragon\'s-castle pinball table: away from the dragon in a pack along the castle road past a siege catapult, round the drawbridge, through the great hall's gem pillars, down the dungeon stairs, then the ring of fire, a full loop, round the tower bend, over the battlements and through the hoard bends to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'lair', display: 'DRAGON FIRE!', finish: 'DRAGON SLAYER' },
  signature: 'The ring of fire',
  tvCameras: [
    // (Before the loop, looking back: a camera just past a loop draws the whole table on a computer.)
    { section: 'The ring of fire', at: 0.25, side: 'right', distance: 9, height: 7 },
  ],
  start: { landmark: 'hoard-dragon', gate: 'barrier', shots: { countdown: 'swing', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Castle road', shape: straight(100, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [parked({ costume: 'catapult', at: 0.7, side: 'right', length: 6 })],
    },
    {
      name: 'Drawbridge sweep', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'gem-pillar', from: 0.22, to: 0.45, count: 2, loss: 0.15 }), ...pegs('right', 'left', [0.65, 0.85])],
    },
    { name: 'Great hall', shape: straight(55, { grade: 0.12 }), features: [boost({ at: 0.08, kick: 4 })], obstacles: [slalom({ costume: 'gem-pillar', from: 0.25, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Down the dungeon stairs', shape: plunge(50, { grade: 0.36, from: 0.12 }), billboards: 1, obstacles: drops() },
    {
      name: 'The ring of fire', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 14 })],
    },
    { name: 'Tower bend', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Over the battlements', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Hoard bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down to the hoard', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'gem-pillar', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
