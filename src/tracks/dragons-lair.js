'use strict';

// Dragon's Lair (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a dragon's-castle pinball
// table. The gate stands under a dragon of our own curled on a rock over its hoard of gold, wings half open. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// castle road off a speed pad, a siege catapult parked far down it on the right (the table's first obstacle), round
// the drawbridge off a second speed pad through the gem pillars, down the dungeon stairs, then the table's big
// feature: the ring of fire, a full loop; round the tower spiral, over the battlements, the hoard bends, down to the
// hoard and the gem pillars on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, loop, runIn, parked, slalom, brake, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'gem-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'dragons-lair',
  name: 'Dragon\'s Lair',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A dragon\'s-castle pinball table: away from the dragon in a pack along the castle road past a siege catapult, round the drawbridge through the gem pillars, down the dungeon stairs, then the ring of fire, a full loop, round the tower spiral, over the battlements and through the hoard bends to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'lair', display: 'DRAGON FIRE!', finish: 'DRAGON SLAYER' },
  signature: 'The ring of fire',
  tvCameras: [
    { section: 'Hoard bends', at: 0.5, side: 'left', distance: 9, height: 8 },
    // (Before the loop, looking back: a camera just past a loop draws the whole table on a computer.)
    { section: 'The ring of fire', at: 0.25, side: 'right', distance: 9, height: 7 },
  ],
  start: { landmark: 'hoard-dragon', gate: 'barrier', shots: { countdown: 'swing', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Castle road', shape: straight(85, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [parked({ costume: 'catapult', at: 0.78, side: 'right', length: 6 })],
    },
    {
      name: 'Drawbridge sweep', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1,
      features: [boost({ at: 0.12, kick: 4 })], obstacles: [slalom({ costume: 'gem-pillar', from: 0.35, to: 0.75, count: 3, loss: 0.25 })],
    },
    { name: 'Down the dungeon stairs', shape: plunge(50, { grade: 0.36, from: 0.12 }), billboards: 1, obstacles: drops() },
    {
      name: 'The ring of fire', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 14 })],
    },
    { name: 'Tower spiral', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.14 }) },
    { name: 'Over the battlements', shape: plunge(45, { grade: 0.3, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Hoard bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: [slalom({ costume: 'gem-pillar', from: 0.35, to: 0.75, count: 3, loss: 0.25 })] },
    { name: 'Down to the hoard', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: 'gem-pillar', from: 0.3, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
