'use strict';

// Buenos Aires Summer Christmas: Holiday Season 2026 track (Grand Prix), Track of the Day on 12 December.
// A warm summer evening turning to midnight, fireworks bursting over the rooftops all race long: over a
// crest at the gate, along wide avenues lined with flowering jacaranda trees, round the obelisk at the
// hairpin and past the fountains and the coloured houses to the line.
const { track, opening, straight, sBends, sweep, spiral, splitter, hairpin, plunge, runIn, peg, slalom, swipe, rumble } = require('../trackKit');

module.exports = track({
  slug: 'buenos-aires-summer-christmas',
  name: 'Buenos Aires Summer Christmas',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A warm summer evening turning to midnight, fireworks bursting over the rooftops all race long: along wide avenues lined with flowering jacaranda trees, round the obelisk at the hairpin and past the fountains and the coloured houses to the line.',
  surface: 'stone',
  biome: 'city',
  lighting: 'fireworks-night',
  variants: ['sunset'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 600 },
  signature: 'Jacaranda avenue',
  billboardFrame: 'led',
  tvCameras: [
    { section: 'Jacaranda avenue', at: 0.6, side: 'left', distance: 8, height: 14 },
    { section: 'Fountain sweep', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'fountains', gate: 'paddle', shots: { countdown: 'front', launch: 'low-chase' } },
  finish: { scenery: ['jacarandas', 'grandstand'] },
  designChanges: [
    'A plunge into a banked turn round the plaza at the gate (tyres and a slalom of cones) rather than the planned pipe drop, which leaves the field too spread out for its overtakes.',
    'The fireworks burst over the rooftops all race long (the fireworks-night sky, looks only). The obelisk stands in the hairpin, a monument between the plaza splitter\'s two channels. No names on anything drawn.',
  ],
  opening: opening('banked-turn', { side: 'left', costumes: { block: 'tyre-stack', slalom: 'traffic-cone' }, names: { plunge: 'Rooftop drop', turn: 'Banked plaza turn' } }),
  sections: [
    {
      name: 'Jacaranda avenue', shape: straight(110, { grade: 0.135 }), scenery: ['jacarandas', 'crowd'], billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.12, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.24, line: 'right' })],
      features: [rumble({ from: 0.45, to: 0.7, count: 3 })],
    },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.32, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.5, line: 'right' })] },
    { name: 'Obelisk hairpin', shape: hairpin({ side: 'right' }), around: 'obelisk', obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Rooftop spiral', shape: spiral({ side: 'right', radius: 50, turns: 0.9, grade: 0.16 }), around: 'clocktower' },
    { name: 'Fountain sweep', shape: sweep({ side: 'left', radius: 85, degrees: 100, grade: 0.1 }), billboards: 2, landmarks: [{ name: 'fountains', side: 'high', at: 0.5, distance: 22 }] },
    {
      name: 'Plaza splitter', shape: splitter({ side: 'right', balance: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.32, scrub: 1.32 } } }),
      around: 'roundabout-monument',
    },
    { name: 'Midnight run', shape: straight(90, { grade: 0.165 }), scenery: ['jacarandas', 'grandstand'], billboards: 1, obstacles: [peg({ costume: 'traffic-cone', at: 0.1, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.22, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.34, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.46, line: 'center' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
