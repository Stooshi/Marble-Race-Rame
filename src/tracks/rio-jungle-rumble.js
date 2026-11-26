'use strict';

// Rio Jungle Rumble: from the jungle below Corcovado down the Selarón Steps to
// Copacabana beach. Moses's design ("New Track Designs", 2), built with the track kit.
// The figure on Corcovado appears only as a distant, stylised silhouette in the background.
const {
  track, opening, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  block, curtain, slalom, peg, brake, steps,
} = require('../trackKit');

module.exports = track({
  slug: 'rio-jungle-rumble',
  name: 'Rio Jungle Rumble',
  difficulty: 'extreme',
  description: 'From the Tijuca jungle below Corcovado, past an anaconda and down the Selarón Steps, to Copacabana beach.',
  surface: 'stone',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  // The water of Guanabara Bay beside the bay turn, the hillside falling to it as cliffs (looks only; Moses, 16 Nov
  // 2026: the bay turn should show the bay).
  sea: { side: 'left', from: 0.5123, to: 0.6383, coast: 8 },
  signature: 'Guanabara Bay turn',
  tvCameras: [
    // (At the end of the turn, looking back round it at the field coming round the bay.)
    { section: 'Guanabara Bay turn', at: 0.85, side: 'left', distance: 6, height: 10 },
    { section: 'Jungle S-bends', at: 0.6, side: 'right', distance: 6, height: 6 },
  ],
  billboardFrame: 'plain',
  // The gate in the Tijuca jungle, Corcovado far behind with its distant silhouette and a
  // monkey in a tree beside the gate; the finish on Copacabana's promenade, Sugarloaf behind.
  start: { landmark: 'corcovado', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'sugarloaf' },
  designChanges: [
    'Its own layout and opening (Moses, 15 Nov 2026: World Tour re-layouts): a rumble start down the jungle path (the field let go in waves), S-bends through the Tijuca jungle, the hairpin, down the Selarón Steps and the Lapa plunge, the turn high round Guanabara Bay under the cable car (the big feature: a dramatic banked turn), the city spiral and the beach.',
    'Football corner flags down the start after the rumble strips, glanced off like slalom gates.',
    'A straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
  ],
  // (The rumble start: down the rough jungle path, then the corner flags; let go in jittered waves, a new order
  // every race.)
  opening: opening('rumble-start', {
    costumes: { slalom: 'corner-flag' },
    names: { plunge: 'Jungle path' },
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Jungle S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.12 }), billboards: 1, figures: ['monkey'],
      landmarks: [{ name: 'parrot-tree', at: 0.5, side: 'left', distance: 18 }],
      obstacles: [peg({ costume: 'corner-flag', at: 0.3, line: 'left' }), peg({ costume: 'corner-flag', at: 0.7, line: 'right' })],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(55, { grade: 0.13 }), scenery: ['colourful-houses'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'football', line: 'left' })], scenery: ['colourful-houses'] },
    {
      name: 'Selarón Steps', shape: straight(90, { grade: 0.13 }), billboards: 1, scenery: ['colourful-houses'],
      // (The stadium off across the city, seen from the steps and the bay turn: since 16 Nov 2026 the water of the bay
      // lies where it stood beyond the turn.)
      landmarks: [{ name: 'maracana', at: 0.5, side: 'left', distance: 150 }],
      features: [steps({ from: 0.5, to: 0.88, count: 6, tiles: 'mosaic' })],
      obstacles: [slalom({ costume: 'corner-flag', from: 0.08, to: 0.3, count: 3, loss: 0.3 })],
    },
    // (The design's steep plunge after the steps, which picks the speed back up.)
    { name: 'Lapa plunge', shape: plunge(60, { grade: 0.35, from: 0.15 }) },
    // The track's big feature: a dramatic banked turn right round the bay, under the cable car.
    {
      name: 'Guanabara Bay turn', shape: sweep({ side: 'right', radius: 45, degrees: 180, grade: 0.12 }), overhead: ['cable-car'],
    },
    { name: 'To the city', shape: straight(40, { grade: 0.13 }), billboards: 1 },
    { name: 'City spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.15 }) },
    {
      name: 'Beach straight', shape: straight(80, { grade: 0.13 }), billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [curtain({ costume: 'surfer', at: 0.3, side: 'left' }), slalom({ costume: 'corner-flag', from: 0.5, to: 0.9, count: 4, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn(), landmarks: [{ name: 'copacabana', at: 0.5, side: 'left', distance: 16 }] },
  ],
});
