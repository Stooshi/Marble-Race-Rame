'use strict';

// Sapporo Snow Sculptures: Holiday Season 2026 track (Coasters), Track of the Day on 18 December.
// A snowy day in the northern city: off the foot of a ski jump's in-run, down to the park, a box
// line and a ski jump through the long park past giant snow sculptures (a castle, an owl, a bear, a whale's tail),
// under the lattice TV tower and along the snow lanterns to the line.
const { boostJump, track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, slalom, swipe, peg, rumble, box, rail, boost } = require('../trackKit');

module.exports = track({
  slug: 'sapporo-snow-sculptures',
  name: 'Sapporo Snow Sculptures',
  season: 'holiday-2026',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A snowy day in a northern city: off the top of a ski jump, a box line and a ski jump through the long park past giant snow sculptures (a castle, an owl, a bear, a whale\'s tail), under the lattice TV tower and along the snow lanterns to the line.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'snow',
  coaster: { height: 16, colours: { support: '#e8eef4', rail: '#c8302a', tie: '#3a4a5a' } },
  signature: 'Sculpture park box line',
  tvCameras: [
    { section: 'Sculpture park box line', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Long park sweep', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'tv-tower', scenery: ['pines'], type: 'ski-jump', gate: 'stalls', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'snow-lanterns', scenery: ['birches'] },
  designChanges: [
    'A ski jump (the boost-pad jump, approved by Moses on 19 Oct) at the end of the park\'s box line, its straight longer to fit it; the billboard before the hairpin moved to the park bends, out of the follow camera\'s way.',
    'The gate stands at the foot of a ski jump\'s in-run (a new start type), the start hut high behind it; a steep first drop (a snowball pile-up and a slalom of ice lanterns) takes the field down to the park.',
    'The snow sculptures are generic carved shapes (a castle, an owl, a bear, a whale\'s tail), nothing from any film or brand; the TV tower is a generic lattice tower. No names on anything drawn.',
  ],
  opening: opening('classic', { costumes: { block: 'giant-snowball', slalom: 'ice-lantern' }, names: { plunge: 'Off the in-run' }, dress: { plunge: { height: 18 } } }),
  sections: [
    {
      name: 'Sculpture park box line', shape: straight(190, { grade: 0.1 }), height: 0,
      features: [box({ at: 0.06, length: 12 }), rail({ at: 0.18, length: 10 }), boostJump({ at: 0.4, look: 'ski-jump' })],
      landmarks: [{ name: 'snow-sculptures', side: 'left', at: 0.5, distance: 22 }],
    },
    { name: 'Tower spin', shape: spiral({ side: 'right', radius: 55, turns: 1.1, grade: 0.15 }), height: 14, around: 'clocktower' },
    { name: 'Park bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.12 }), height: 10, billboards: 3, obstacles: [slalom({ costume: 'ice-lantern', from: 0.2, to: 0.8, count: 4, loss: 0.12 })] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 6, obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.32, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), height: 8, obstacles: [swipe({ costume: 'snow-troll', side: 'high' })] },
    { name: 'Snow drop', shape: plunge(50, { grade: 0.17, from: 0.1 }), height: 12, obstacles: [slalom({ costume: 'ice-lantern', from: 0.35, to: 0.95, count: 5, loss: 0.18 })] },
    { name: 'Long park sweep', shape: sweep({ side: 'left', radius: 90, degrees: 150, grade: 0.085 }), height: 14, billboards: 2, features: [boost({ at: 0.08 })] },
    {
      name: 'Lantern run', shape: straight(80, { grade: 0.14 }), height: 3, landmarks: [{ name: 'snow-lanterns', side: 'right', at: 0.5, distance: 8 }],
      obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
