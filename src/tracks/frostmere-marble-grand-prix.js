'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, curtain, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'frostmere-marble-grand-prix',
  name: 'Frostmere Marble Grand Prix',
  difficulty: 'extreme',
  description: 'Our own snowy fairy-tale kingdom by night: from the castle bridge through a snowy pine forest, across a frozen lake and a village, through the ice palace\'s glittering hall into its courtyard under the northern lights.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'night-northern-lights',
  variants: ['snow'],
  grandPrix: { crowd: 'kingdom-folk', barrier: 'snow', groupsEvery: 700 },
  signature: 'Ice palace hall',
  billboardFrame: 'banner',
  start: { landmark: 'snow-castle' },
  finish: { landmark: 'ice-palace' },
  designChanges: [
    'The slalom of ice lanterns is at the foot of the Castle plunge, straight after the giant snowballs, rather than in the Pine S-bends: on the bends it left too few overtakes and the field reached the splitter sorted so that one channel never gave its marbles a fair share of wins (measured on Dubai Marble Grand Prix, the same layout).',
    'A 50 m straight before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The ice palace hall is a plunge rather than level: after the hairpin the field needs the drop to pick its speed back up.',
    'The Village sweep is 130 degrees rather than the proven 160, the village and the frozen lake are open snowfields with only a few pines, there are no houses at the castle bridge and no crowd along the Pine S-bends (the design has owls there), and the small groups of spectators along the way stand 700 m apart rather than 230 m: with the ice palace hall the track is 90 m longer than the proven layout, and from the S-bends the camera sees the whole kingdom at once, so the computer went over its 150k triangles (157k) and the phone over its 60k.',
    'The rumble strips and the icicle garlands are on a straight, "Courtyard run", between the spiral and the finish rather than on the spiral and the run-in: the recipe keeps bumps off bends and the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Castle plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'giant-snowball', at: 0.42 }), slalom({ costume: 'ice-lantern', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'Pine S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['pines'] },
    {
      name: 'Frozen lake splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'snow-island', figures: ['skier', 'skier'], scenery: ['pasture'],
    },
    { name: 'Village sweep', shape: sweep({ side: 'right', radius: 80, degrees: 130, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 3, scenery: ['wooden-houses', 'pasture'] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1, scenery: ['wooden-houses'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'snow-troll', side: 'high' })] },
    { name: 'Ice palace hall', shape: plunge(100, { grade: 0.3, from: 0.16 }), tunnel: 'ice-cave' },
    { name: 'Courtyard spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }) },
    {
      name: 'Courtyard run', shape: straight(80, { grade: 0.15 }),
      obstacles: [curtain({ at: 0.2, side: 'left' })],
      features: [rumble({ from: 0.6, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
