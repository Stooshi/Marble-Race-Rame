'use strict';

// Rhythm Rush (Moses, 28 Nov 2026: the Arcade pack towards 20): a dance-game world inside the machine. The gate stands
// by a giant dance pad of our own, its four lit arrows, speaker stacks and falling notes. Away on the clear start (the
// field let go in waves, gentle bends and nothing in the way for the first seconds), round the warm-up sweep, a laser
// curtain far down it (the track's first obstacle), along the beat lane through the laser pylons, the bass bends off a
// speed pad, down the drop, then the track's big feature: the beat drop, a full loop; right round the speaker spiral,
// the combo bends off a second speed pad and the pylons on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, spiral, runIn, curtain, peg, slalom, boost, brake, loop } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'drum-peg', at: 0.35, line: a }), peg({ costume: 'drum-peg', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'laser-pylon', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'rhythm-rush',
  name: 'Rhythm Rush',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A dance-game world inside the machine: away from the giant dance pad in a pack round the warm-up sweep under a laser curtain, along the beat lane through the laser pylons, through the bass bends and down the drop, then the beat drop, a full loop, right round the speaker spiral, through the combo bends and down to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'rhythm', finish: 'FULL COMBO!' },
  signature: 'The beat drop',
  tvCameras: [
    // (Out of the speaker spiral, looking back at the field coming off its last turn.)
    { section: 'Combo bends', at: 0.2, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'dance-pad', gate: 'paddle', shots: { countdown: 'swing', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Warm-up sweep', shape: sweep({ side: 'right', radius: 110, degrees: 70, grade: 0.12 }), billboards: 1,
      obstacles: [curtain({ costume: 'laser-curtain', at: 0.75, side: 'left' })],
    },
    {
      name: 'Beat lane', shape: straight(70, { grade: 0.12 }),
      obstacles: [slalom({ costume: 'laser-pylon', from: 0.2, to: 0.92, count: 5, loss: 0.27 })],
    },
    { name: 'Bass bends', shape: sBends({ first: 'right', radius: 70, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Down the drop', shape: plunge(50, { grade: 0.34, from: 0.12 }), billboards: 1, obstacles: drops() },
    {
      name: 'The beat drop', shape: straight(155, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 10 })],
    },
    { name: 'Speaker spiral', shape: spiral({ side: 'left', radius: 48, turns: 1, grade: 0.18 }) },
    { name: 'Combo bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Down to the finish', shape: straight(55, { grade: 0.2 }), obstacles: [slalom({ costume: 'laser-pylon', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
