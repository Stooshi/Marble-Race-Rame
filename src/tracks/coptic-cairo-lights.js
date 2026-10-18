'use strict';

// Coptic Cairo Lights: Holiday Season 2026 track (World Tour), Track of the Day on 15 December. A warm
// evening in the old quarter in the run-up to Coptic Christmas: down through the old gate's tunnel, a
// box line through lanes hung with coloured lanterns, past an old church and its courtyard (architecture
// only) and the palms, out to the river.
const { track, opening, straight, sBends, sweep, spiral, splitter, hairpin, plunge, runIn, peg, slalom, swipe, rumble, box } = require('../trackKit');

module.exports = track({
  slug: 'coptic-cairo-lights',
  name: 'Coptic Cairo Lights',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A warm evening in Cairo\'s old quarter before Coptic Christmas: through the old gate\'s tunnel, a box line through lanes hung with coloured lanterns, past an old church courtyard and the palms, out to the river.',
  surface: 'stone',
  biome: 'desert',
  lighting: 'sunset',
  variants: ['night'],
  signature: 'Lantern lanes',
  tvCameras: [
    { section: 'Lantern lanes', at: 0.6, side: 'left', distance: 8, height: 14 },
    { section: 'Run to the hairpin', at: 0.6, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'old-church-courtyard', gate: 'stalls', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'nile-station', scenery: ['palms'] },
  designChanges: [
    'A tunnel launch at the gate, through the old quarter\'s gate (the bazaar tunnel), then a box through the lantern lanes (one box rather than the planned box line, so the start differs from every other track\'s).',
    'The old church is generic architecture (pale walls, low domes, square bell towers) with no symbols or figures; the lanterns are coloured metal-and-glass lanterns hung across the lanes. No names of real churches or shops.',
  ],
  opening: opening('tunnel-launch', { tunnel: 'bazaar', costumes: { block: 'barrel', slalom: 'lantern-pole' }, names: { portal: 'Old gate steps', tunnel: 'Old gate tunnel' } }),
  sections: [
    { name: 'Palm bends', shape: sBends({ first: 'left', radius: 65, degrees: 60, grade: 0.12 }), scenery: ['palms'], obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 4, loss: 0.2 })] },
    {
      name: 'Lantern lanes', shape: straight(110, { grade: 0.12 }), scenery: ['merchant-houses'], billboards: 1,
      features: [box({ at: 0.3, length: 14 })],
      landmarks: [{ name: 'hanging-lanterns', side: 'right', at: 0.7, distance: 20 }],
    },
    {
      name: 'Courtyard sweep', shape: sweep({ side: 'left', radius: 80, degrees: 100, grade: 0.11 }), billboards: 2,
      landmarks: [{ name: 'old-church-courtyard', side: 'high', at: 0.5, distance: 24 }],
    },
    { name: 'Minaret spiral', shape: spiral({ side: 'left', radius: 48, turns: 1, grade: 0.16 }), around: 'bell-tower' },
    {
      name: 'River splitter', shape: splitter({ side: 'right', balance: { tipOffset: 2.0, left: { drag: 0.3, scrub: 0.5 }, right: { drag: 1.8, scrub: 1.8 } } }),
      around: 'river-island',
    },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.32, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'falcon', side: 'high' })] },
    { name: 'Quarter drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: 'lantern-pole', from: 0.35, to: 0.95, count: 5, loss: 0.3 })] },
    { name: 'Run to the river', shape: straight(65, { grade: 0.14 }), billboards: 1, scenery: ['palms'], obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
