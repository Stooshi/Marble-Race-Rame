'use strict';

// Pin Drop (Moses, 28 Nov 2026: the Arcade pack towards 20): a pin-drop world inside the machine. The gate stands by
// a tall pin-drop cabinet of our own, its rows of pins, a ball on its way down and the prize cups at the foot. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// launch straight over a raised ledge far down it (the track's first obstacle) and through the pins, round the
// top sweep off a speed pad, the bounce bends off a second speed pad, then the track's big feature: the pin wall, a
// long steep drop through rows of pins; round the cup sweep, the prize bends, down the chute and the pins on the run
// to the finish.
const { track, opening, straight, sweep, sBends, plunge, runIn, box, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'drum-peg', at: 0.35, line: a }), peg({ costume: 'drum-peg', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'drum-peg', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'pin-drop',
  name: 'Pin Drop',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A pin-drop world inside the machine: away from the pin-drop cabinet in a pack along the launch straight over a raised ledge and through the pins, round the top sweep, through the bounce bends, then the pin wall, a long steep drop through rows of pins, round the cup sweep, through the prize bends and down the chute to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'pins', finish: 'TOP PRIZE!' },
  signature: 'The pin wall',
  tvCameras: [
    // (At the foot of the pin wall, looking back up at the field coming down through the pins.)
    { section: 'Cup sweep', at: 0.15, side: 'right', distance: 8, height: 7 },
  ],
  start: { landmark: 'pin-cabinet', gate: 'trapdoor', shots: { countdown: 'side', launch: 'side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    { name: 'Launch straight', shape: straight(120, { grade: 0.12 }), billboards: 1, features: [box({ at: 0.4, length: 10 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.72, to: 0.98, count: 5, loss: 0.3 })] },
    { name: 'Top sweep', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Bounce bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'To the wall', shape: straight(35, { grade: 0.12 }), billboards: 1 },
    { name: 'The pin wall', shape: plunge(70, { grade: 0.34, from: 0.12 }), obstacles: [slalom({ costume: 'drum-peg', from: 0.25, to: 0.9, count: 6, loss: 0.25 })] },
    { name: 'Cup sweep', shape: sweep({ side: 'right', radius: 90, degrees: 150, grade: 0.14 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Prize bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.13 }), obstacles: pegs('right', 'left') },
    { name: 'Down the chute', shape: plunge(45, { grade: 0.26, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(70, { grade: 0.2 }), obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
