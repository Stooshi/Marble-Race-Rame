'use strict';

// Li River Karst Run: Blocks Series 2 (rivers), the Li River in southern China built from cubes. Down off a lift
// among the karst towers, along the river, splitting round one karst tower and then another (the track's two
// big features: a straight splitter and a curving one), past bamboo rafts and rice terraces, through the
// village and on to the river landing.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'li-river-karst-run',
  name: 'Li River Karst Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'The Li River built from cubes: along the water between steep karst towers, splitting round one tower and then another, past bamboo rafts and rice terraces to the village landing.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['fog'],
  block: { world: 'karst' },
  coaster: { style: 'blocks', colours: { support: '#7b8a6a', rail: '#f2f1ea', tie: '#4f5a44' } },
  signature: 'First karst tower',
  tvCameras: [
    { section: 'First karst tower', at: 0.9, side: 'left', distance: 10, height: 12 },
    { section: 'Second karst tower', at: 0.9, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'karst-towers', type: 'elevator', gate: 'trapdoor', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'river-village' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, a straight splitter round the first karst tower and a splitter curving 40° round the second. Built from the clean drop and karst splits, the library layout made for this track (L105).',
  ],
  opening: opening('clean-drop', {
    side: 'right',
    names: { plunge: 'Off the lift', bends: 'Among the towers' },
  }),
  sections: layout('karst-splits', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      riverStraight: { height: 4, water: true, landmarks: [{ name: 'bamboo-rafts', at: 0.5, side: 'left', distance: 12 }, { name: 'karst-towers', at: 0.6, side: 'right', distance: 40 }] },
      raftSweep: { landmarks: [{ name: 'karst-towers', at: 0.5, side: 'left', distance: 45 }] },
      terraces: { landmarks: [{ name: 'bamboo-rafts', at: 0.4, side: 'right', distance: 14 }] },
      split2: { around: 'karst-tower' },
      village: { landmarks: [{ name: 'river-village', at: 0.5, side: 'left', distance: 34 }] },
      hairpin: { landmarks: [{ name: 'karst-towers', at: 0.5, side: 'high', distance: 40 }] },
      lastStraight: { name: 'To the landing', landmarks: [{ name: 'karst-towers', at: 0.5, side: 'right', distance: 45 }] },
    },
  }),
});
