'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, curtain, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'wyrmwood-hollow-marble-grand-prix',
  name: 'Wyrmwood Hollow Marble Grand Prix',
  difficulty: 'extreme',
  description: 'Our own valley of ancient ruins where an old dragon sleeps: from a ruined castle wall through crumbling arches, over a chasm on an old stone bridge and past the sleeping dragon to a ruined amphitheatre.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['fog', 'day'],
  grandPrix: { crowd: 'villagers', barrier: 'stone' },
  signature: 'Dragon hairpin',
  billboardFrame: 'banner',
  start: { landmark: 'ruined-castle' },
  finish: { landmark: 'amphitheatre' },
  designChanges: [
    'The slalom of broken pillars is at the foot of the Rampart plunge, straight after the fallen stone blocks, rather than in the Ruins S-bends: on the bends it left too few overtakes and the field reached the splitter sorted so that one channel never gave its marbles a fair share of wins (measured on Dubai Marble Grand Prix, the same layout).',
    'The splitter round the fallen statue comes straight after the Ruins S-bends, before the Valley sweep, rather than after the Dragon hairpin: out of the hairpin the whole field rides one side of the channel and the splitter cannot share it out fairly (measured on Dubai Marble Grand Prix).',
    'The Chasm bridge is the 50 m straight before the Dragon hairpin, its braking zone, rather than a stretch of its own after the Ruins S-bends: the recipe needs a braking zone before the one sharp bend, and a longer straight after the splitter left too few overtakes (measured on Istanbul Marble Grand Prix).',
    'The rumble strips and the hanging battle banners are on a straight, "Amphitheatre run", between the spiral and the finish rather than on the spiral and the run-in: the recipe keeps bumps off bends and the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Rampart plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'stone-block', at: 0.42 }), slalom({ costume: 'broken-pillar', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'Ruins S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['crowd'] },
    {
      name: 'Statue splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'fallen-statue',
    },
    { name: 'Valley sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 4, scenery: ['crowd'] },
    { name: 'Chasm bridge', shape: straight(50, { grade: 0.12 }), bridge: 'stone' },
    {
      name: 'Dragon hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'dragon-tail', side: 'high' })],
      landmarks: [{ name: 'sleeping-dragon', at: 0.5, side: 'right', distance: 26 }],
    },
    {
      name: 'Spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }),
      landmarks: [{ name: 'dragon-mountain', at: 0.5, side: 'left', distance: 260 }],
    },
    {
      name: 'Amphitheatre run', shape: straight(80, { grade: 0.15 }),
      obstacles: [curtain({ costume: 'battle-banners', at: 0.2, side: 'left' })],
      features: [rumble({ from: 0.6, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
