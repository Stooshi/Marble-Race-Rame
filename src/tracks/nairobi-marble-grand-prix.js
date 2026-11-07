'use strict';

// Nairobi Marble Grand Prix, its own layout (Moses, 7 Nov 2026: four more Grand Prix tracks re-laid the same way
// as Lagos, Istanbul and Sydney, Nairobi first). Until then it was the Grand Prix recipe of 10 Oct 2026 (the same
// track as Dubai, mirrored). Now the field drops from the KICC and banks right into the city, threads the Uhuru
// S-bends, loops the loop on the Nairobi Expressway (the signature: the elevated highway over the city), runs to
// Westlands and round its hairpin, takes the Mbagathi S-bends into the Acacia splitter (a channel either side of a
// great flat-topped acacia, giraffes beyond), spirals down onto the plains of the national park and runs along its
// fence to the line. Its records started again with the new layout (tracks.records_since).
const {
  track, opening, straight, sBends, spiral, hairpin, splitter, runIn, peg, slalom, swipe, rumble, loop,
} = require('../trackKit');

module.exports = track({
  slug: 'nairobi-marble-grand-prix',
  name: 'Nairobi Marble Grand Prix',
  difficulty: 'extreme',
  description: 'The city where wildlife lives beside the skyline: down from the KICC and through Uhuru Park, round the loop on the Nairobi Expressway, through Westlands and either side of a great acacia, and down onto the national park\'s plains to a grandstand finish.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: true,
  signature: 'Expressway loop',
  tvCameras: [
    // (Past the loop, looking back up at the field coming round it.)
    { section: 'Expressway loop', at: 0.55, side: 'right', distance: 8, height: 7 },
  ],
  billboardFrame: 'plain',
  start: { landmark: 'kicc-tower', scenery: ['skyscrapers'], gate: 'barrier', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'safari-truck', scenery: ['savannah'] },
  designChanges: [
    'A new layout (7 Nov 2026): until then Nairobi was physically the Grand Prix recipe of 10 Oct 2026 (the same track as Dubai Marble Grand Prix, mirrored). Its old signature, the Park boundary run, goes.',
    'Two Nairobi features: the Expressway loop (big feature one, the signature: a loop on the elevated Nairobi Expressway) and the Acacia splitter (big feature two: a channel either side of a flat-topped acacia, as on the plains of the national park). No jump: the three jump tracks are used.',
    'The opening a banked turn to the right (the KICC drop, then a 110° bank into the city): the latest re-layouts opened with a split start, a crest, a pipe drop and a funnel drop. Its start shots (from the front, then looking back) are its own among the Grand Prix tracks.',
    'The Acacia splitter shorter than the Grand Prix one (a 60 m run-in, 100° round the tree and a 30 m merge) and the Plains spiral tighter (40 m): with the full-length splitter the winner took 56 s, over the 55 s target. With the shorter splitter its inside (right) channel was the quicker way round, so it is rougher (2.1) and the outside one smoother (0.3), and the tip 0.3 m over: now about 46% of the marbles take the inside channel and win about 51% of the races.',
    'The Uhuru S-bends\' slalom before their cone, not after it: the other way round, the first 20 seconds were too like Accra December Beats\' (a banked-turn opening, then a pile-up, a slalom, a bend, a peg and a slalom; 0.84). The Uhuru S-bends gentler than first drawn (75°, not 90°): at 65° to 90° the weakest marbles reached the Expressway loop\'s launch pad more often than the strongest. The loop keeps its full 130 m straight (30 m before the pad and 15 m after the catch, as the recipe needs). The Westlands hairpin turns left: turning right, the Mbagathi S-bends ran under the loop\'s straight (3 m aside, 25 m below) and the follow camera went inside the bank between them.',
  ],
  opening: opening('banked-turn', {
    side: 'right',
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { plunge: 'KICC drop', turn: 'City bank' },
    dress: { plunge: { scenery: ['skyscrapers'] }, turn: { scenery: ['skyscrapers'] } },
  }),
  sections: [
    {
      name: 'Uhuru S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.16 }), billboards: 3, scenery: ['jacarandas', 'crowd'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.15, to: 0.5, count: 3, loss: 0.2 }), peg({ costume: 'traffic-cone', at: 0.75, line: 'center' })],
    },
    { name: 'Expressway loop', shape: straight(130, { grade: 0.12 }), features: [loop({ at: 0.25, viewSide: 26 })], scenery: ['skyscrapers'] },
    {
      name: 'Run to Westlands', shape: straight(40, { grade: 0.12 }), billboards: 1, scenery: ['skyscrapers'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'left' })],
    },
    { name: 'Westlands hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })], scenery: ['grandstand'] },
    { name: 'Mbagathi S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 85, grade: 0.17 }), scenery: ['jacarandas'] },
    {
      name: 'Acacia splitter',
      shape: splitter({ side: 'right', approach: 60, degrees: 100, merge: 30, balance: { tipOffset: 0.3, left: { drag: 0.3, scrub: 0.5 }, right: { drag: 2.1, scrub: 2.1 } } }),
      around: 'acacia', scenery: ['savannah'],
      figures: ['giraffe', 'zebra', 'giraffe'],
    },
    { name: 'Plains spiral', shape: spiral({ side: 'left', radius: 40, grade: 0.2 }), scenery: ['savannah'] },
    {
      name: 'Plains straight', shape: straight(45, { grade: 0.15 }), billboards: 1, scenery: ['grandstand', 'savannah'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.45, line: 'left' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
      landmarks: [{ name: 'park-fence', at: 0.5, side: 'right', distance: 3 }],
    },
    { name: 'Finish', shape: runIn(), scenery: ['savannah'] },
  ],
});
