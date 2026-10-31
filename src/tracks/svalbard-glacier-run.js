'use strict';

// Svalbard Glacier Run: Blocks Series 2 (winter), an Arctic island built from cubes. Off a coast lighthouse round the banked
// turn (big feature one), S-bends down the moraine, the drop into the ice valley and its half-pipe (big feature
// two), along the sea ice past icebergs, the hairpin at the glacier front and a sweep to the station.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'svalbard-glacier-run',
  name: 'Svalbard Glacier Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'An Arctic island built from cubes: from a coast lighthouse round a banked turn, down the moraine into an ice valley half-pipe, along the sea ice past the icebergs to the glacier front.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'polar' },
  coaster: { style: 'blocks', colours: { support: '#4a4e56', rail: '#f4f8fb', tie: '#33363c' } },
  signature: 'The ice-valley half-pipe',
  tvCameras: [
    { section: 'The ice-valley half-pipe', at: 0.5, side: 'left', distance: 10, height: 15 },
    { section: 'Between the icebergs', at: 0.5, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'polar-station', type: 'lighthouse', gate: 'barrier', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'polar-station' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the banked turn off the lighthouse and the half-pipe through the ice valley. Built from the ice valley layout made for this track (L122).',
    'A generic Svalbard landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('banked-turn', {
    side: 'right',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('ice-valley', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      moraineBends: { landmarks: [{ name: 'glacier-front', at: 0.5, side: 'left', distance: 120 }] },
      valley: { landmarks: [{ name: 'ice-seracs', at: 0.3, side: 'left', distance: 22 }, { name: 'ice-seracs', at: 0.75, side: 'right', distance: 22 }] },
      seaIce: { height: 4, water: true, landmarks: [{ name: 'icebergs', at: 0.5, side: 'right', distance: 50 }] },
      bergs: { landmarks: [{ name: 'icebergs', at: 0.5, side: 'left', distance: 40 }] },
      hairpin: { landmarks: [{ name: 'glacier-front', at: 0.5, side: 'high', distance: 90 }] },
      lastStraight: { name: 'Run-in to the station', landmarks: [{ name: 'polar-station', at: 0.4, side: 'right', distance: 26 }] },
    },
  }),
});
