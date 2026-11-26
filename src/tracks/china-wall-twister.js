'use strict';

// China Wall Twister: the Great Wall snaking over misty mountains, ending at the Temple
// of Heaven. Moses's design ("New Track Designs", 1), built with the track kit. The
// fortune cat stays; the dragon is a tunnel through its body, in at the tail and out of
// the mouth, so every marble goes through and finishes.
const {
  track, opening, plunge, straight, climb, sBends, sweep, spiral, hairpin, runIn,
  swipe, slalom, peg, brake, paint, steps,
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
  tvCameras: [
    // (Out of the dragon's mouth, looking back up into it at the field pouring out.)
    { section: 'Pagoda spiral', at: 0.2, side: 'left', distance: 6, height: 12 },
    { section: 'Pagoda sweep', at: 0.5, side: 'right', distance: 6, height: 6 },
  ],
  billboardFrame: 'plain',
  // The gate on a watchtower terrace on the Wall, a red-columned hipped-roof hall behind the
  // start line; the finish before the Temple of Heaven, its round blue roofs behind the line.
  start: { landmark: 'wudian-hall', scenery: ['battlements'], gate: 'stalls', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'temple-of-heaven', scenery: ['forbidden-city'] },
  designChanges: [
    'Its own layout and opening (Moses, 15 Nov 2026: World Tour re-layouts): out through a gate in the Wall (the tunnel-launch start, the field let go in waves) past the pandas and lanterns, along the Wall and down its steps, a sweep past the pagoda, the board-game run, the fortune-cat hairpin, up over a ridge and through the dragon (the big feature: a long drop through its body, in at the tail and out of the mouth), the pagoda spiral, S-bends past the rice terraces and on to the Temple of Heaven.',
    'A few pandas at the gate (a pile-up), then red lanterns on posts glanced off like slalom gates.',
  ],
  // (The tunnel-launch start: down to a gate in the Wall and through it; let go in jittered waves, a new order every
  // race.)
  opening: opening('tunnel-launch', {
    costumes: { block: 'panda', slalom: 'lantern-pole' },
    names: { portal: 'To the Wall gate', tunnel: 'Through the gate' },
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Along the Wall', shape: straight(70, { grade: 0.15 }), scenery: ['battlements'], billboards: 1,
      features: [brake({ at: 0.03, length: 8, drag: 0.02 }), steps({ from: 0.45, to: 0.85, count: 6 })],
      obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.27, line: 'right' })],
      landmarks: [{ name: 'watchtower', at: 0.2, side: 'left', distance: 20 }],
    },
    {
      name: 'Pagoda sweep', shape: sweep({ side: 'right', radius: 80, degrees: 130, grade: 0.13 }), billboards: 1,
      landmarks: [{ name: 'pagoda', at: 0.4, side: 'left', distance: 30 }],
    },
    {
      // A Go board, then a Xiangqi board, painted on a gently sloping stretch; a few stones and pieces
      // lie on them (glancing hits). It is also the braking zone before the hairpin.
      name: 'Board-game run', shape: straight(90, { grade: 0.14 }), billboards: 1,
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
    { name: 'Up the ridge', shape: climb(12, { grade: -0.05, after: 0.3 }), scenery: ['battlements'] },
    // The track's big feature: a long drop through the dragon, in at the tail and out of the mouth.
    { name: 'Dragon', shape: plunge(100, { grade: 0.38, from: 0.16 }), tunnel: 'dragon' },
    { name: 'Pagoda spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.15 }), around: 'pagoda' },
    {
      name: 'Rice-terrace S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.13 }), billboards: 1,
      landmarks: [{ name: 'rice-terraces', at: 0.3, side: 'right', distance: 30 }],
      obstacles: [peg({ costume: 'lantern-pole', at: 0.3, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'right' })],
    },
    {
      name: 'To the temple', shape: straight(75, { grade: 0.15 }), scenery: ['forbidden-city'], billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.5, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['forbidden-city'] },
  ],
});
