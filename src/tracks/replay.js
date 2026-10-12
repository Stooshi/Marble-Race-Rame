'use strict';

// Replay: a surreal time-warp pinball table, a clocktower floating in a starry void. The field
// spirals down the glass globe of a giant gumball machine past clock-face bumpers, sweeps past
// the floating doors, runs up the stairs to nowhere and drops off them, spins round the
// clocktower, meets the swinging pendulum at the hairpin, passes through a floating door and a
// row of gumball targets to the flippers, where the clock strikes twelve and REPLAY lights up.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'replay',
  name: 'Replay',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A time-warp pinball table in a starry void: down a giant gumball machine past clock-face bumpers, past the floating doors and up the stairs to nowhere, round the clocktower, past the swinging pendulum and through a floating door to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'clocks', display: 'TIME WARP!', finish: 'REPLAY!' },
  signature: 'Through the floating door',
  start: { landmark: 'gumball-machine', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: {},
  designChanges: [
    'Built from the funnel drop (the long bowl is the gumball machine\'s glass globe, past a pile-up of clock-face bumpers and a slalom of bumper posts) and clock tower, the library layout made for this table from the climb-and-drop idea: a long sweep past the floating doors, the stairs to nowhere (a short climb) and a slalom drop off them, a spiral round the clocktower, the pendulum at the hairpin, S-bends, a floating door on the straight and a row of gumball targets and bumper posts on the run to the flippers.',
    'The clock pendulum is the hairpin\'s swipe rather than swinging across a straight, as every library layout keeps its swipe at the hairpin. The clock strike and the knocker\'s bang are left for the sound pass.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'clock-bumper', slalom: 'bumper-post' },
    names: { plunge: 'Gumball globe' },
  }),
  sections: layout('clock-tower', {
    costumes: { slalom: 'bumper-post', curtain: 'floating-door', swipe: 'pendulum', parked: 'gumball-targets', peg: 'bumper-post' },
    dress: {
      approach: { name: 'To the stairs' },
      climb: { name: 'Stairs to nowhere' },
      drop: { name: 'Off the stairs' },
      sweep: { name: 'Past the floating doors', landmarks: [{ name: 'floating-doors', at: 0.5, side: 'right', distance: 50 }] },
      spiral: { name: 'Clocktower spin', around: 'clocktower' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Pendulum hairpin' },
      sBends: { name: 'Time-warp bends' },
      doorRun: { name: 'Through the floating door' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
