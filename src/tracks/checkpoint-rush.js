'use strict';

// Checkpoint Rush: arcade racers, from sit-down cabinets to the coastal-highway classics.
// A coastal highway at synthwave sunset: off the grid on the green light down the boost
// strip, long sweeps along the coast past palms and checkpoint gates, the road forking at a
// signpost and rejoining, a toll boom at the hairpin, traffic cones and roadside barrels,
// a parked pixel convertible and the GOAL banner with its trophy.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'checkpoint-rush',
  name: 'Checkpoint Rush',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A coastal highway at synthwave sunset: off the grid down the boost strip, long sweeps past palms and checkpoint gates, a fork at the signpost, a toll boom at the hairpin and traffic cones to the GOAL banner.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'highway', finish: 'GOAL!' },
  signature: 'The fork',
  start: { landmark: 'starting-grid', gate: 'stalls', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'goal-banner' },
  designChanges: [
    'Built from the boost-pad launch (the starting grid and its green light, past roadside barrels, down the boost strip and through traffic cones) and coast road, the library layout made for it: two long sweeps along the coast past checkpoint gates, the fork (the splitter) round the signpost, a third sweep with a boost pad, the hairpin under a swinging toll boom, a drop through traffic cones, a last sweep and a parked pixel convertible on the run to the finish.',
    'The roadside barrels are the pile-up at the start and stand still. The checkpoint gates stand beside the road, CHECKPOINT! lit on their boards. The GOAL banner and its pixel trophy stand past the finish and the high-score table reads GOAL! for the winner; the finish arch itself is the standard one. The car and the coast are our own, with no real cars or games.',
  ],
  opening: opening('boost-launch', {
    costumes: { block: 'road-barrel', slalom: 'traffic-cone' },
    names: { drop: 'Green light', launch: 'Boost strip', plunge: 'Onto the coast road' },
  }),
  sections: layout('coast-road', {
    costumes: { swipe: 'toll-boom', slalom: 'traffic-cone', parked: 'pixel-convertible', peg: 'traffic-cone' },
    dress: {
      sweep1: { name: 'Coast road', scenery: ['palms'], landmarks: [{ name: 'checkpoint-gate', at: 0.5, side: 'right', distance: 18 }] },
      sweep2: { name: 'Sunset sweep' },
      splitter: { name: 'The fork', around: 'fork-signpost' },
      sweep3: { name: 'Time extended', landmarks: [{ name: 'checkpoint-gate', at: 0.4, side: 'left', distance: 18 }] },
      brakingStraight: { name: 'Run to the toll' },
      hairpin: { name: 'Toll booth turn' },
      drop: { name: 'Cliff road' },
      sweep4: { name: 'Last sweep', scenery: ['palms'] },
      lastStraight: { name: 'Final stretch' },
    },
  }),
});
