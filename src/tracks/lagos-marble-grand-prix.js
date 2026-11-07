'use strict';

// Lagos Marble Grand Prix, its own layout (Moses, 6 Nov 2026; claude/grand-prix-relayout-plan.md). Until then it
// was the same track as Sydney and Stockholm (the Grand Prix recipe of 10 Oct 2026, mirrored). Now a pipe drop (no
// boost launch: it favoured the front starting group on Track and Field, Moses), the market S-bends, the Lagoon
// bridge banked turn (the big feature, approved by Moses: 220° on the steel bridge over the lagoon), S-bends round
// Lagos Island, the beach, the Lekki S-bends and hairpin, and the Theatre straight to the National Theatre. Its
// records started again with the new layout (tracks.records_since).
const {
  track, opening, plunge, straight, sBends, sweep, hairpin, runIn, peg, slalom, swipe, parked, rumble, boost,
} = require('../trackKit');

module.exports = track({
  slug: 'lagos-marble-grand-prix',
  name: 'Lagos Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A loud, colourful race across Lagos: down a half-pipe into a busy market, round the long banked turn on the steel bridge over the lagoon, through Lagos Island and along the beach, and through Lekki to the National Theatre.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { groupsEvery: 400 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Lagoon bridge banked turn',
  tvCameras: [
    // (At the end of the bridge, looking back along the banked turn with the water beside it.)
    { section: 'Lagoon bridge banked turn', at: 0.9, side: 'right', distance: 6, height: 6 },
    // (A second camera at the end of the Lekki S-bends looked at the bank and scenery beside them: taken out, 7 Nov 2026.)
  ],
  billboardFrame: 'led',
  start: { landmark: 'lagos-skyline', scenery: ['grandstand'], gate: 'trapdoor', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'national-theatre', scenery: ['grandstand'] },
  designChanges: [
    'A new layout (6 Nov 2026): until then Lagos was physically the same track as Sydney and Stockholm Marble Grand Prix (the Grand Prix recipe, mirrored), so on one seed the three ran the same race. No splitter now.',
    'The pipe drop at the gate (a short plunge into a half-pipe down to the market): no other Grand Prix track opens this way. The gate lets the field go in waves, in a new order every race, so the front starting group gets no edge (the boost launch, Moses\'s first idea for Lagos, favoured it on Track and Field). Its start shots (from the front, then high behind) are its own.',
    'The big feature is the Lagoon bridge banked turn: 220° on the steel bridge over the lagoon, a boost pad at its start, tighter and longer than any Grand Prix sweep before it, and a little steeper (0.12) than drawn first, for the pace.',
    'A slalom drop down to the market straight after the half-pipe (six gates), as on the other pipe-drop tracks: the pipe drop has no pile-up, and without it the strongest marbles won too often.',
    'The Lekki hairpin turns left: turning right, it brought the Lekki S-bends back over the finish line, 32 m up, where they covered the phone\'s finish shot.',
    'S-bends round Lagos Island rather than a spiral, and pegs and slaloms through the market, along the beach, in the Lekki S-bends and on the Theatre straight, for the overtakes.',
  ],
  opening: opening('pipe-drop', {
    side: 'left',
    names: { plunge: 'Down from the island', pipe: 'Market half-pipe' },
    dress: { pipe: { scenery: ['market-stalls', 'crowd'] } },
  }),
  sections: [
    {
      name: 'Down to the market', shape: plunge(50, { grade: 0.3, from: 0.15 }),
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.2, to: 0.95, count: 6, loss: 0.3 })],
    },
    {
      name: 'Market S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 100, grade: 0.15 }), scenery: ['market-stalls', 'crowd'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.6, line: 'left' })],
    },
    {
      name: 'Run to the lagoon', shape: straight(60, { grade: 0.16 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.5, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.85, line: 'right' })],
    },
    { name: 'Lagoon bridge banked turn', shape: sweep({ side: 'left', radius: 60, degrees: 220, grade: 0.12 }), features: [boost({ at: 0.06 })], bridge: 'steel' },
    {
      name: 'Island S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 90, grade: 0.16 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.4, to: 0.85, count: 3, loss: 0.3 })],
    },
    {
      name: 'Beach straight', shape: straight(60, { grade: 0.13 }), scenery: ['palms'],
      obstacles: [parked({ costume: 'danfo-bus', at: 0.2, side: 'left', length: 6 }), peg({ costume: 'traffic-cone', at: 0.6, line: 'right' }), slalom({ costume: 'traffic-cone', from: 0.7, to: 0.95, count: 3, loss: 0.15 })],
    },
    {
      name: 'Lekki S-bends', shape: sBends({ first: 'left', radius: 65, degrees: 90, grade: 0.13 }), billboards: 4, scenery: ['crowd'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.15, to: 0.4, count: 2, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.5, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.6, to: 0.9, count: 2, loss: 0.15 })],
    },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'left' })] },
    { name: 'Lekki hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    {
      name: 'Theatre straight', shape: straight(80, { grade: 0.17 }), billboards: 1, scenery: ['palms', 'grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.35, line: 'right' })],
      features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['palms', 'grandstand'] },
  ],
});
