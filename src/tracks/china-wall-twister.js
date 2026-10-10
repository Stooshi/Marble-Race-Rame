'use strict';

// China Wall Twister: the Great Wall snaking over misty mountains, ending at the Temple
// of Heaven. Moses's design ("New Track Designs", 1), built with the track kit. The
// fortune cat stays; the dragon is a tunnel through its body, in at the tail and out of
// the mouth, so every marble goes through and finishes.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  pileUp, swipe, slalom, peg, boost, bump, paint,
} = require('../trackKit');

module.exports = track({
  slug: 'china-wall-twister',
  name: 'China Wall Twister',
  difficulty: 'extreme',
  description: 'Along the Great Wall over misty ridges, across a board-game run and through a dragon, to the Temple of Heaven.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'day',
  variants: ['fog', 'sunset'],
  signature: 'Dragon',
  billboardFrame: 'plain',
  // The gate on a watchtower terrace on the Wall, a red-columned hipped-roof hall behind the
  // start line; the finish before the Temple of Heaven, its round blue roofs behind the line.
  start: { landmark: 'wudian-hall', scenery: ['battlements'] },
  finish: { landmark: 'temple-of-heaven', scenery: ['forbidden-city'] },
  designChanges: [
    'A few pandas on the Wall plunge (a pile-up) rather than one, then red lanterns on posts glanced off like slalom gates: with one panda the strongest marbles win too often and the field reaches the splitter sorted by strength.',
  ],
  sections: [
    {
      name: 'Wall plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'panda', at: 0.42 }), slalom({ costume: 'lantern-pole', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      landmarks: [{ name: 'watchtower', at: 0.6, side: 'left', distance: 12 }], scenery: ['battlements'],
    },
    { name: 'Ridge S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), scenery: ['battlements'], billboards: 1, landmarks: [{ name: 'rice-terraces', at: 0.3, side: 'right', distance: 30 }] },
    {
      name: 'Watchtower splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'watchtower',
    },
    {
      name: 'Pagoda sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2,
      landmarks: [{ name: 'pagoda', at: 0.4, side: 'left', distance: 22 }],
    },
    {
      // A Go board, then a Xiangqi board, painted on a gently sloping stretch; a few stones and pieces
      // lie on them (glancing hits). It is also the braking zone before the hairpin.
      name: 'Board-game run', shape: straight(90, { grade: 0.12 }), billboards: 1,
      features: [paint({ from: 0.02, to: 0.48, look: 'go-board' }), paint({ from: 0.52, to: 0.98, look: 'xiangqi' })],
      obstacles: [
        peg({ costume: 'go-stone', at: 0.22, line: 'left' }), peg({ costume: 'go-stone', at: 0.32, line: 'right' }),
        peg({ costume: 'xiangqi-piece', at: 0.62, line: 'right' }), peg({ costume: 'xiangqi-piece', at: 0.72, line: 'left' }),
      ],
    },
    {
      name: 'Fortune-cat hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'fortune-cat', side: 'high' })],
      landmarks: [{ name: 'lantern-row', at: 0.5, side: 'right', distance: 6 }],
    },
    { name: 'Dragon', shape: plunge(110, { grade: 0.38, from: 0.16 }), tunnel: 'dragon' },
    { name: 'Pagoda spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), around: 'pagoda' },
    { name: 'Final plunge', shape: plunge(90, { grade: 0.28, from: 0.17 }), features: [bump({ at: 0.45 }), bump({ at: 0.7 })], scenery: ['forbidden-city'] },
    { name: 'Finish', shape: runIn(), scenery: ['forbidden-city'] },
  ],
});
