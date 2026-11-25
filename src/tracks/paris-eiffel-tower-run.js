'use strict';

// Paris Eiffel Tower Run: from the hilltop of Montmartre through the heart of Paris
// to the Eiffel Tower. Moses's design ("New Track Designs", 3), built with the track
// kit. Daylight only: the tower's evening light show is protected, so no night lighting.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  pileUp, curtain, parked, slalom, brake, peg,
} = require('../trackKit');

module.exports = track({
  slug: 'paris-eiffel-tower-run',
  name: 'Paris Eiffel Tower Run',
  difficulty: 'extreme',
  description: 'From Montmartre through the Arc de Triomphe and round the Concorde obelisk, down to the Seine and the Eiffel Tower.',
  surface: 'stone',
  biome: 'city',
  lighting: 'day',
  variants: ['rain', 'fog'], // (daylight only)
  signature: 'Round the Étoile',
  tvCameras: [
    // (At the end of the turn, looking back round the Arc de Triomphe at the field coming round the Étoile.)
    { section: 'Round the Étoile', at: 0.85, side: 'left', distance: 6, height: 8 },
    { section: 'Île de la Cité S-bends', at: 0.5, side: 'right', distance: 6, height: 8 },
  ],
  billboardFrame: 'column',
  // The gate on the cobbled square before Sacré-Cœur, the roofs of Paris below; the finish
  // on the Champ de Mars, the Eiffel Tower rising straight behind the line.
  start: { landmark: 'sacre-coeur', scenery: ['haussmann'], gate: 'stalls', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'eiffel-tower', scenery: ['plane-trees'] },
  designChanges: [
    'Its own layout (Moses, 15 Nov 2026: World Tour re-layouts): down Montmartre past the café tables and street lamps, down the cobbles of the Rue Lepic, a sweep past the Moulin Rouge, right round the Arc de Triomphe on the Étoile (the big feature: a banked spiral, as the traffic circles it), down the Champs-Élysées, the Concorde hairpin round the obelisk, past the Louvre, down to the Seine, S-bends past Notre-Dame and on to the Eiffel Tower.',
    'Street lamps down the Montmartre plunge after the café tables, glanced off like slalom gates: with café tables alone the strongest marbles win too often.',
    'A straight before the hairpin (the Champs-Élysées): the recipe needs a braking zone before the one sharp bend; a stretch of rough cobbles bunches the field.',
  ],
  sections: [
    {
      name: 'Montmartre plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'cafe-table', at: 0.42 }), slalom({ costume: 'street-lamp', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      figures: ['painter', 'painter'], scenery: ['haussmann'],
    },
    { name: 'Rue Lepic', shape: straight(45, { grade: 0.14 }), features: [brake({ at: 0.1, length: 15 })], scenery: ['haussmann'], billboards: 1 },
    {
      name: 'Moulin Rouge sweep', shape: sweep({ side: 'left', radius: 75, degrees: 110, grade: 0.13 }),
      landmarks: [{ name: 'moulin-rouge', at: 0.5, side: 'right', distance: 20 }], scenery: ['haussmann'],
      obstacles: [peg({ costume: 'bollard', at: 0.3, line: 'right' }), peg({ costume: 'bollard', at: 0.7, line: 'left' })],
    },
    { name: 'To the Étoile', shape: straight(35, { grade: 0.13 }), scenery: ['haussmann'] },
    // The track's big feature: a banked spiral right round the Arc de Triomphe, as the traffic circles the Étoile.
    { name: 'Round the Étoile', shape: spiral({ side: 'right', radius: 45, grade: 0.14 }), around: 'arc-de-triomphe', scenery: ['plane-trees'] },
    {
      name: 'Champs-Élysées', shape: straight(80, { grade: 0.14 }), billboards: 2, scenery: ['plane-trees', 'haussmann'],
      features: [brake({ at: 0.1, length: 15 })],
      landmarks: [{ name: 'fountains', at: 0.75, side: 'left', distance: 10 }],
    },
    { name: 'Concorde hairpin', shape: hairpin({ side: 'left' }), around: 'obelisk' },
    {
      name: 'Louvre run', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: 'vespa', at: 0.35, side: 'right', length: 8 }), slalom({ costume: 'street-lamp', from: 0.6, to: 0.92, count: 3, loss: 0.3 })],
      landmarks: [{ name: 'louvre-pyramid', at: 0.5, side: 'left', distance: 14 }],
    },
    {
      name: 'Seine plunge', shape: plunge(70, { grade: 0.3, from: 0.16 }),
      obstacles: [curtain({ costume: 'easel', at: 0.45, side: 'left' })], figures: ['pigeon', 'pigeon', 'pigeon'],
      landmarks: [{ name: 'seine', at: 0.5, side: 'right', distance: 22 }, { name: 'bookstalls', at: 0.3, side: 'left', distance: 6 }],
    },
    {
      name: 'Île de la Cité S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.14 }), scenery: ['plane-trees'],
      landmarks: [{ name: 'notre-dame', at: 0.5, side: 'left', distance: 30 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.7, line: 'right' })],
    },
    {
      name: 'Champ de Mars', shape: straight(70, { grade: 0.14 }), billboards: 1, scenery: ['plane-trees'],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.45, to: 0.88, count: 3, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['plane-trees'] },
  ],
});
