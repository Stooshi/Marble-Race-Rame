'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, waterfall, runIn, splitter, pileUp, swipe, curtain, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'elderglade-marble-grand-prix',
  name: 'Elderglade Marble Grand Prix',
  difficulty: 'extreme',
  description: 'Our own enchanted elven forest: down from a platform high in a giant tree, through giant ferns and a shimmering waterfall, round the trunk of an ancient tree to a clearing of glowing flowers.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day', 'fog'],
  grandPrix: { crowd: 'elves', barrier: 'logs', fireworks: 'sparkles' },
  signature: 'Great Tree spiral',
  billboardFrame: 'banner',
  start: { landmark: 'tree-platform' },
  finish: { landmark: 'glow-flowers' },
  designChanges: [
    'The slalom of glowing crystal posts is at the foot of the Tree plunge, straight after the giant mushrooms, rather than in the Fern S-bends: on the bends the posts left too few overtakes (measured on Dubai Marble Grand Prix, the same layout), and a start with only a pile-up lets the strongest marbles win too often.',
    'A splitter round a mossy boulder, "Fern splitter", straight after the Fern S-bends: the design has none, and without one the track left too few overtakes (55 a race against the recipe\'s 60) and too quick a winner (44 s against 48). Longer bends, a gentler waterfall, a longer slalom, a second boost pad and mushroom blocks on the Vine walk each left it at 56 to 57 overtakes; the splitter, with the proven Grand Prix settings (mirrored), brings it to 62 and the winner to 52 s.',
    'The bends turn the mirror way of the proven Grand Prix layout (S-bends right first, splitter on the right, sweep left, hairpin right, spiral left): turning left first, the camera looked down from the S-bends over the splitter, the waterfall and the hairpin at once and the phone went over its drawing budget (39 draw calls against 35).',
    'The Glade sweep is 140 degrees rather than the proven 160 and is an open glade with fewer trees, and its banners move from the run to the hairpin to the Vine walk: with the extra length of the waterfall the computer went just over its 150k triangles, and a banner on the run to the hairpin stood between the follow camera and its marble.',
    'No crowd along the Fern S-bends (the design has fireflies there): the elves fill the Glade sweep, the hairpin stand and the clearing.',
    'The Waterfall plunge falls at a grade of 0.35 rather than 0.45: with the splitter in, the leader came off the falls so fast that the follow camera jumped just over 4 m in a frame on the Glade sweep.',
    'A 35 m straight, "Pool above the falls", before the Waterfall plunge, and a 40 m pool below it: the recipe needs a straight before a waterfall so the field comes down off the walls before the lip, and gives the follow camera room after it.',
    'A 50 m straight before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The rumble strips of tree roots and the hanging vines are on a straight, "Vine walk", between the spiral and the clearing rather than on the spiral and the run-in: the recipe keeps bumps off bends and the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Tree plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'mushroom', at: 0.42 }), slalom({ costume: 'crystal-post', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'Fern S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    {
      name: 'Fern splitter', shape: splitter({ side: 'right', balance: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.32, scrub: 1.32 } } }),
      around: 'big-rock',
    },
    { name: 'Pool above the falls', shape: straight(35, { grade: 0.12 }) },
    { name: 'Waterfall plunge', shape: waterfall(40, { grade: 0.35, curtain: true }), surface: 'water' },
    { name: 'Pool below the falls', shape: straight(40, { grade: 0.12 }), surface: 'water', billboards: 1 },
    { name: 'Glade sweep', shape: sweep({ side: 'left', radius: 80, degrees: 140, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 3, scenery: ['crowd', 'pasture'] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    { name: 'Great Tree spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.17 }), around: 'giant-tree' },
    {
      name: 'Vine walk', shape: straight(90, { grade: 0.15 }),
      obstacles: [curtain({ costume: 'vines', at: 0.2, side: 'right' })],
      features: [rumble({ from: 0.6, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
