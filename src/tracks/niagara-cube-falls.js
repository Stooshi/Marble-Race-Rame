'use strict';

// Niagara Cube Falls: Blocks Series 2 (rivers), the Niagara River built from cubes. Pegs down off the cliff,
// along the upper river and the rapids, over the horseshoe falls in the mist (big feature one), through the
// whirlpool rapids in a half-pipe down the gorge (big feature two), the hairpin, round the whirlpool and
// along the gorge to the arch bridge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'niagara-cube-falls',
  name: 'Niagara Cube Falls',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'The Niagara River built from cubes: along the rapids, over the horseshoe falls in the mist and down the gorge through the whirlpool rapids in a half-pipe, to the arch bridge.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'falls' },
  coaster: { style: 'blocks', colours: { support: '#7d7a72', rail: '#f2f2ee', tie: '#4a4842' } },
  signature: 'The falls',
  tvCameras: [
    { section: 'Through the mist', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Gorge S-bends', at: 0.6, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'gorge-walls', type: 'cliff', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'steel-arch-cube' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the horseshoe falls (a waterfall) and the whirlpool-rapids half-pipe. Built from the peg drop and horseshoe falls, the library layout made for this track (L107).',
  ],
  opening: opening('peg-drop', {
    costumes: { peg: 'cube-pillar' },
    names: { plunge: 'Off the cliff' },
  }),
  sections: layout('horseshoe-falls', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      upperRiver: { height: 4, water: true },
      rapids: { height: 4, water: true, landmarks: [{ name: 'mist-boat', at: 0.5, side: 'left', distance: 14 }] },
      falls: { landmarks: [{ name: 'horseshoe-falls', at: 0.5, side: 'left', distance: 30 }] },
      mist: { landmarks: [{ name: 'mist-boat', at: 0.5, side: 'right', distance: 14 }] },
      gorge: { landmarks: [{ name: 'gorge-walls', at: 0.3, side: 'left', distance: 26 }, { name: 'gorge-walls', at: 0.7, side: 'right', distance: 26 }] },
      gorgeBends: { landmarks: [{ name: 'gorge-walls', at: 0.5, side: 'left', distance: 24 }] },
      whirlpool: {},
      lastStraight: { name: 'To the arch bridge', landmarks: [{ name: 'gorge-walls', at: 0.5, side: 'left', distance: 24 }] },
    },
  }),
});
