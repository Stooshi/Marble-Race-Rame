'use strict';

// Lalibela Genna Spins: Holiday Season 2026 track (Canyons), Track of the Day on 22 December and again
// on 7 January, Ethiopian Christmas (Genna). A clear dawn in warm light over the highland town: down from
// a rock-hewn tower, through trenches and passages cut down into the red rock past the churches hewn in
// it (architecture only), pilgrims in white gathered above, to the line.
const { track, opening, straight, sBends, sweep, spiral, halfPipe, hairpin, plunge, runIn, peg, swipe, curtain, rumble } = require('../trackKit');

module.exports = track({
  slug: 'lalibela-genna-spins',
  name: 'Lalibela Genna Spins',
  season: 'holiday-2026',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'A clear dawn over the highland town at Genna: through trenches and passages cut down into the red rock, past churches hewn in it, pilgrims in white gathered above, to the line.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'sunset',
  canyon: { palette: 'mujib', depth: 26, river: 'right' },
  coaster: { colours: { support: '#a8644a', rail: '#f2ede2', tie: '#4a2e24' } },
  signature: 'Rock trench half-pipe',
  start: { landmark: 'pilgrims', scenery: ['rocks'], type: 'castle-tower', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'pilgrims' },
  designChanges: [
    'The church trench comes first and the rock trench half-pipe later (the first 20 seconds were too like Queenstown\'s); a curtain of vines hangs over the passage bends (it gives the weakest marbles their chances).',
    'The gate stands on top of a round tower of the red rock (a new start type); a peg drop lets the field go in waves into the trenches.',
    'The churches are hewn down into the rock, shown as architecture only (no figures, no symbols); the pilgrims in white stand at the start, by the Church trench and past the line. No names on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'cairn' }, names: { plunge: 'Down into the rock' }, dress: { plunge: { height: 0 } } }),
  sections: [
    {
      name: 'Church trench', shape: straight(100, { grade: 0.11 }), height: 0, billboards: 1,
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'left' }), peg({ costume: 'cairn', at: 0.45, line: 'right' }), peg({ costume: 'cairn', at: 0.6, line: 'center' })],
      landmarks: [{ name: 'rock-hewn-church', side: 'right', at: 0.5, distance: 28 }, { name: 'pilgrims', side: 'left', at: 0.6, distance: 14 }],
    },
    { name: 'Spire spiral', shape: spiral({ side: 'right', radius: 50, turns: 1.1, grade: 0.15 }), height: 0, around: 'basalt-spire' },
    { name: 'Passage bends', shape: sBends({ first: 'right', radius: 60, degrees: 85, grade: 0.12 }), height: 0, billboards: 2, obstacles: [curtain({ costume: 'vines', at: 0.5, side: 'left' })] },
    { name: 'Into the trench', shape: straight(40, { grade: 0.12 }), height: 0 },
    { name: 'Rock trench half-pipe', shape: halfPipe({ first: 'left', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }), height: 0 },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), height: 0, obstacles: [peg({ costume: 'cairn', at: 0.15, line: 'center' }), peg({ costume: 'cairn', at: 0.32, line: 'left' }), peg({ costume: 'cairn', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), height: 0, obstacles: [swipe({ costume: 'falcon', side: 'high' })] },
    { name: 'Over the rock', shape: sweep({ side: 'left', radius: 85, degrees: 110, grade: 0.09 }), height: 22, billboards: 2 },
    { name: 'Drop back in', shape: plunge(45, { grade: 0.2, from: 0.1 }), height: 0, obstacles: [peg({ costume: 'cairn', at: 0.4, line: 'left' }), peg({ costume: 'cairn', at: 0.6, line: 'right' }), peg({ costume: 'cairn', at: 0.8, line: 'center' })] },
    {
      name: 'Run to the line', shape: straight(100, { grade: 0.12 }), height: 0,
      obstacles: [peg({ costume: 'cairn', at: 0.12, line: 'center' }), peg({ costume: 'cairn', at: 0.24, line: 'left' }), peg({ costume: 'cairn', at: 0.36, line: 'right' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
