'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, block, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'sahara-marble-grand-prix',
  name: 'Sahara Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A desert Grand Prix: from a kasbah of earthen towers over the dunes, through a narrow red rock canyon cheered from the cliff tops and round an oasis, to a great mud-brick mosque.',
  surface: 'asphalt',
  biome: 'desert',
  lighting: 'day',
  variants: ['fog', 'sunset'],
  grandPrix: { crowd: 'desert-folk' },
  signature: 'Canyon run',
  billboardFrame: 'crates',
  start: { landmark: 'kasbah' },
  finish: { landmark: 'mud-mosque' },
  designChanges: [
    'A traffic-cone chicane at the foot of the Kasbah plunge, straight after the tyre stacks: without it (as designed) the field reached the splitter sorted by strength, the gap from first to last grew to 20 s (18 allowed) and the races had too few overtakes (58; 60 needed).',
    'The Oasis splitter comes straight after the Dune S-bends, and the Canyon run is the 50 m straight before the hairpin, its braking zone: with the canyon between the dunes and the oasis the splitter could not share the field out fairly (the oasis side won 94% of races with 78% of the marbles), and the recipe needs a braking zone before the one sharp bend.',
    'The kneeling camels are on the straight before the finish, "Mosque straight", rather than in the Dune S-bends: on the bends they pushed the field to the wrong side of the splitter (the oasis side won 15% of races with 30% of the marbles) and spread it 20 s from first to last; on the Desert sweep, nearly level, marbles stuck against them.',
    'The rumble strips and the parked support truck are on the Mosque straight too, rather than on the spiral and the run-in: the recipe keeps bumps off bends and the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Kasbah plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    {
      name: 'Dune S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2,
    },
    {
      name: 'Oasis splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'oasis',
    },
    {
      name: 'Desert sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 4,
    },
    { name: 'Canyon run', shape: straight(50, { grade: 0.12 }), tunnel: 'canyon' },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    {
      name: 'Spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }),
      landmarks: [{ name: 'caravan', at: 0.5, side: 'left', distance: 90 }],
    },
    {
      name: 'Mosque straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [block({ costume: 'camel', at: 0.1, line: 'left' }), block({ costume: 'camel', at: 0.25, line: 'right' }), parked({ costume: 'support-truck', at: 0.42, side: 'right', length: 8 })],
      features: [rumble({ from: 0.75, to: 0.95, count: 3 })], billboards: 2, scenery: ['grandstand'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
