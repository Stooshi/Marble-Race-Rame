'use strict';

// Rainier Ice Block Run: Blocks Series 2 (mountains), a great snow volcano built from cubes. Off a ski-jump in-run down the classic plunge, the
// glacier half-pipe (big feature one), crevasse S-bends, the two-step drop off the glacier snout (big feature two),
// the wildflower meadow, the hairpin by an old lodge and a sweep into the forest.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'rainier-ice-block-run',
  name: 'Rainier Ice Block Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A great snow volcano built from cubes: off a ski-jump in-run, down the glacier in a half-pipe, through the crevasses and in two drops off the glacier snout to the wildflower meadows and an old lodge.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'cascade' },
  coaster: { style: 'blocks', colours: { support: '#6a6e74', rail: '#f4f6f8', tie: '#4a4e54' } },
  signature: 'The glacier half-pipe',
  tvCameras: [
    { section: 'The glacier half-pipe', at: 0.5, side: 'left', distance: 10, height: 15 },
    { section: 'Wildflower meadow', at: 0.5, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'snow-volcano', type: 'ski-jump', gate: 'barrier', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'old-lodge' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the half-pipe down the glacier and the two-step drop off the glacier snout. Built from the glacier snout layout made for this track (L118).',
    'A generic Mount Rainier landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('classic', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Off the in-run' },
  }),
  sections: layout('glacier-snout', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      moraine: { landmarks: [{ name: 'snow-volcano', at: 0.5, side: 'left', distance: 420 }] },
      glacier: { landmarks: [{ name: 'ice-seracs', at: 0.3, side: 'left', distance: 22 }, { name: 'ice-seracs', at: 0.75, side: 'right', distance: 22 }] },
      crevasses: { landmarks: [{ name: 'ice-seracs', at: 0.5, side: 'right', distance: 24 }] },
      meadow: { landmarks: [{ name: 'snow-volcano', at: 0.5, side: 'right', distance: 440 }] },
      hairpin: { landmarks: [{ name: 'old-lodge', at: 0.5, side: 'high', distance: 20 }] },
      lastStraight: { name: 'To the old lodge', landmarks: [{ name: 'old-lodge', at: 0.4, side: 'right', distance: 22 }] },
    },
  }),
});
