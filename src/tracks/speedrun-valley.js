'use strict';

// Speedrun Valley: Block Series track 2. Long fast straights through a valley of cube hills: a
// launch from the station, a long straight past a beam tower, a wide sweep over the valley on
// block pillars, a slalom straight, the hairpin, a back straight and a long run to the line under
// the split-time board.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'speedrun-valley',
  name: 'Speedrun Valley',
  family: 'block',
  difficulty: 'extreme',
  description: 'Long fast straights through a valley of cube hills: launched from the station, past a beam tower, over the valley on block pillars and down a long back straight to the line, under the split-time board.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'valley' },
  coaster: { style: 'blocks', colours: { support: '#a39a8c', rail: '#f2ede2', tie: '#5b616b' } },
  signature: 'Long straight',
  start: { landmark: 'cube-windmill', type: 'station-launch', gate: 'barrier', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'block-hall' },
  designChanges: [
    'Built from the boost-pad launch and the speedrun straights, the library layout made for this track: a long straight (a boost, moguls), a wide sweep, a peg straight, S-bends, the hairpin, a back straight, a drop and a long run to the line; boosts on three straights keep the field together.',
    'The wide sweep flies over the valley on block pillars; the split-time board stands beside the run to the line, its lamps lighting as the leader passes each quarter.',
  ],
  opening: opening('boost-launch', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { drop: 'Launch drop', launch: 'Launch strip', plunge: 'After the launch' },
  }),
  sections: layout('speedrun-straights', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      longStraight: { name: 'Long straight', landmarks: [{ name: 'beam-tower', at: 0.6, side: 'left', distance: 14 }] },
      wideSweep: { name: 'Valley sweep', height: 16 },
      slalomStraight: { name: 'Cottage straight', landmarks: [{ name: 'cube-cottage', at: 0.5, side: 'right', distance: 18 }] },
      sBends: { name: 'Valley bends' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      backStraight: { name: 'Back straight', landmarks: [{ name: 'cube-farm', at: 0.5, side: 'left', distance: 16 }] },
      drop: { name: 'Valley drop' },
      lastStraight: { name: 'Run to the line', landmarks: [{ name: 'split-board', at: 0.8, side: 'right', distance: 6 }] },
    },
  }),
});
