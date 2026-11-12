'use strict';

// Lapland Ice Race (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the second of four Easy ones). An
// ice race on a frozen lake in Finnish Lapland in the polar night, under the northern lights: a clean drop off the
// shore into the Shoreline S-bends, along the lake past an ice lantern slalom, the Snow island splitter (the big
// feature, the signature: two straight channels either side of a snow island out on the ice), round the lake's
// sweep and the Reindeer hairpin, down through the birch forest and back across the ice to the line. Generic
// racing pieces only: no real series, team or sponsor.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'lapland-ice-race',
  name: 'Lapland Ice Race',
  difficulty: 'easy',
  description: 'An ice race on a frozen lake in Lapland in the polar night, under the northern lights: a clean drop off the shore, along the ice past glowing ice lanterns, either side of a snow island, round the lake and the hairpin, down through the birch forest and back across the ice to the line.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night-northern-lights',
  variants: ['snow'],
  grandPrix: { crowd: 'fans', barrier: 'snow', groupsEvery: 1000 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Fell drop',
  tvCameras: [
    // (At the foot of the drop off the fell, looking back up it at the field coming down onto the lake.)
    { section: 'Fell drop', at: 0.95, side: 'left', distance: 9, height: 8 },
  ],
  start: { landmark: 'mountain-hut', gate: 'stalls', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'church', scenery: ['grandstand'] },
  opening: opening('clean-drop', {
    side: 'left',
    names: { plunge: 'Shore drop', bends: 'Shoreline S-bends' },
    dress: { bends: { scenery: ['birches'] } },
  }),
  sections: [
    {
      name: 'Lantern run', shape: straight(95, { grade: 0.13 }), billboards: 1, scenery: ['frozen-lake'],
      obstacles: [slalom({ costume: 'ice-lantern', from: 0.1, to: 0.5, count: 6, loss: 0.3 }), peg({ costume: 'traffic-cone', at: 0.62, line: 'right' })],
    },
    { name: 'Reindeer hairpin', shape: hairpin({ side: 'right' }) },
    {
      name: 'Lake sweep', shape: sweep({ side: 'left', radius: 65, degrees: 130, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'center' }), slalom({ costume: 'ice-lantern', from: 0.45, to: 0.75, count: 3, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.9, line: 'high' })],
    },
    {
      name: 'Fell run', shape: straight(40, { grade: 0.12 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.7, line: 'left' })],
    },
    {
      name: 'Fell drop', shape: plunge(65, { grade: 0.3, from: 0.12 }),
      obstacles: [slalom({ costume: 'ice-lantern', from: 0.55, to: 0.9, count: 3, loss: 0.15 })],
    },
    {
      name: 'Birch forest S-bends', shape: sBends({ first: 'right', radius: 60, degrees: 80, grade: 0.14 }), billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'center' }), slalom({ costume: 'ice-lantern', from: 0.5, to: 0.8, count: 3, loss: 0.15 })],
    },
    {
      name: 'Back across the ice', shape: sweep({ side: 'left', radius: 75, degrees: 130, grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'center' }), curtain({ costume: 'banner-gantry', at: 0.4, side: 'high' }), slalom({ costume: 'ice-lantern', from: 0.6, to: 0.85, count: 3, loss: 0.15 })],
    },
    {
      name: 'Shore S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 70, grade: 0.15 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.5, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.8, line: 'right' })],
    },
    {
      name: 'Home straight', shape: straight(60, { grade: 0.15 }), billboards: 1, scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.4, line: 'right' })],
      features: [rumble({ from: 0.6, to: 0.88, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
