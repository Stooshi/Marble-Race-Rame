'use strict';

// Skee Hall (Moses, 28 Nov 2026: the Arcade pack towards 20): a prize-hall world inside the machine. The gate stands
// by three ramped skee lanes of our own, their target rings lit, a stack of prize tickets beside them. Away on the
// clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), through the
// ticket bends, a joystick swinging in far down them (the track's first obstacle), along the roll lane through the
// bumper posts, down the first ramp, along the prize lane off a speed pad, down the second ramp, then the track's big
// feature: the skee loop, a full loop; round the ticket sweep, the prize bends off a second speed pad and the bumper
// posts on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, runIn, swipe, peg, slalom, boost, brake, loop } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'skee-hall',
  name: 'Skee Hall',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A prize-hall world inside the machine: away from the skee lanes in a pack through the ticket bends past a swinging joystick, along the roll lane through the bumper posts, down the first ramp, along the prize lane and down the second ramp, then the skee loop, a full loop, round the ticket sweep and through the prize bends to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'skee', finish: '1000 TICKETS!' },
  signature: 'The skee loop',
  tvCameras: [
    // (Round the ticket sweep, low, looking back at the field out of the loop.)
    { section: 'Ticket sweep', at: 0.6, side: 'right', distance: 7, height: 5 },
  ],
  start: { landmark: 'skee-lanes', gate: 'trapdoor', shots: { countdown: 'crane', launch: 'high-behind' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Ticket bends', shape: sBends({ first: 'left', radius: 80, degrees: 60, grade: 0.12 }), billboards: 1,
      obstacles: [swipe({ costume: 'joystick', at: 0.7, side: 'right' })],
    },
    {
      name: 'Roll lane', shape: straight(70, { grade: 0.12 }),
      obstacles: [slalom({ costume: 'bumper-post', from: 0.2, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Down the first ramp', shape: plunge(50, { grade: 0.32, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Prize lane', shape: straight(50, { grade: 0.12 }), features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('center', 'left') },
    { name: 'Down the second ramp', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    {
      name: 'The skee loop', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 10 })],
    },
    { name: 'Ticket sweep', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Prize bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Down to the finish', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
