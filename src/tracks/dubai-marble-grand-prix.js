'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'dubai-marble-grand-prix',
  name: 'Dubai Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A night race through downtown Dubai under floodlights: down from beside the Burj Khalifa, past the dancing fountain, round the Museum of the Future and along the highway to the Marina.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'night',
  grandPrix: true,
  signature: 'Fountain S-bends',
  billboardFrame: 'led',
  start: { landmark: 'burj-khalifa', scenery: ['skyscrapers'] },
  finish: { landmark: 'marina', scenery: ['skyscrapers'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the Tower plunge, straight after the tyre stacks, rather than in the Fountain S-bends: there it left too few overtakes (58 to 59 a race; 60 needed) and the field reached the splitter sorted so that one channel never gave its marbles a fair share of wins.',
    'The Museum splitter comes straight after the Fountain S-bends, before the Highway sweep, rather than after the Frame hairpin: out of the hairpin the whole field rides one side of the channel, and in 400 races at each of eight settings the marbles taking the other channel always lost more than a place on the way through (the recipe allows half a place).',
    'A 50 m straight, "Run to the hairpin", before the Frame hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The rumble strips and the parked safety car are on a straight, "Marina straight", between the spiral and the finish rather than on the spiral and the run-in: the recipe keeps bumps off bends (marbles high on the wall are thrown off them) and keeps the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Tower plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    {
      name: 'Fountain S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }),
      billboards: 2, landmarks: [{ name: 'dubai-fountain', at: 0.65, side: 'right', distance: 18 }],
    },
    {
      name: 'Museum splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'museum-of-the-future',
    },
    { name: 'Highway sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 3, scenery: ['skyscrapers'] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1, scenery: ['skyscrapers'] },
    { name: 'Frame hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })], around: 'dubai-frame' },
    { name: 'Marina spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), around: 'twisted-tower' },
    {
      name: 'Marina straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: 'safety-car', at: 0.15, side: 'right', length: 8 })],
      features: [rumble({ from: 0.55, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand', 'skyscrapers'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['skyscrapers'] },
  ],
});
