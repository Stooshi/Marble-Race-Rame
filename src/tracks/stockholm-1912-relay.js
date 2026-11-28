'use strict';

// Stockholm 1912 Relay: Track and Field track 7. Stockholms Stadion: red-brown brick stands and
// towers; two teams out of the twin chutes, then the relay: four legs, each handing over in an
// exchange zone marked on the lanes, round the stadium and out past the brick towers to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'stockholm-1912-relay',
  name: 'Stockholm 1912 Relay',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'A relay round Stockholm\'s brick stadium of 1912: two teams out of the twin chutes, then four legs, each handing over in an exchange zone marked on the lanes, out past the brick towers and round to the line.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'stockholm-1912', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#9a4a36', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The exchange zones',
  tvCameras: [
    { section: 'The exchange zones', at: 0.5, side: 'right', distance: 8, height: 9 },
    { section: 'Hairpin', at: 0.5, side: 'left', distance: 8, height: 9 },
  ],
  start: { landmark: 'brick-tower', type: 'elevator', gate: 'stalls', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'relay-batons' },
  designChanges: [
    'Built from the split start (two teams in the twin chutes) and the relay legs, the library layout made for this track: four straights joined by sweeps, an exchange zone painted on each (looks only), the hairpin, a sweep and a part-spiral.',
    'The stadium is drawn round the first leg, the bend and the second leg: brick stands, two brick towers with pointed roofs, old floodlight masts (looks only).',
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers, painted as on a real track, read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'steeple-barrier', slalom: 'hurdle' },
    names: { plunge: 'Start plunge', chutes: 'Two teams', after: 'Out of the chutes' },
  }),
  sections: layout('relay-legs', {
    costumes: { slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      leg1: { name: 'First leg', stadium: true },
      sweep1: { name: 'Stadium bend', stadium: true },
      leg2: { name: 'The exchange zones', stadium: true },
      sweep2: { name: 'Out past the towers' },
      leg3: { name: 'Third leg' },
      hairpin: { name: 'Hairpin' },
      leg4: { name: 'Anchor leg' },
      sweep3: { name: 'Sweep' },
      spin: { name: 'Spiral' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
