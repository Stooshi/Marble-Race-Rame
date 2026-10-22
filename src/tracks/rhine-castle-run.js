'use strict';

// Rhine Castle Run: Rivers track 9, through a great river's castle gorge. Off a castle tower, through
// the twin chutes, round the castle on its island in the river, along the barge reach, up the vineyard
// terraces below a hilltop castle, down under a railway bridge and back along the barges.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'rhine-castle-run',
  name: 'Rhine Castle Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great river\'s castle gorge: round the white castle on its island in the river, up past the vineyard terraces below a hilltop castle, down under a railway bridge and out over the water past the barges.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'rhine', side: 'right', width: 120, banks: 'rock', slope: 0.8 },
  coaster: { colours: { support: '#8a8478', rail: '#f2f0ea', tie: '#4a4640' } },
  signature: 'Round the island castle',
  start: { landmark: 'hilltop-castle', type: 'castle-tower', gate: 'trapdoor', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'river-barge' },
  designChanges: [
    'Built from the split start and the island castle, the library layout made for this track: a straight down to the river, a spiral round the castle island, a sweep along the barge reach, a short climb and S-bends up the vineyard terraces, a drop under a railway bridge, the hairpin, a sweep flying out over the river past the barges and the run-in.',
    'The castle stands on its island in the middle of the spiral, the river round it; the railway bridge crosses high over the drop (looks only).',
    'Tuned on the layout\'s test track: the first draft\'s winner-to-last gap was 18.3 s and its last marble 85.6 s, so the S-bends turn 70 degrees (85), the barge sweep 100 (120) and the run-in is 90 m (95); the straight down to the river has a peg, two slalom poles and a peg (the draft\'s slalom and moguls kept the gap high; three pegs made its first 20 seconds too like Combo Drop\'s).',
    'The finish is at a moored barge, not the vineyard terraces: a terraced slope right behind the line would close the finish camera\'s view (looks only).',
    'Out of the chutes and the barge reach fly on supports (12 m and 8 m): the chutes cross 40 m above the barge reach, and on the ground their bank stood where the follow camera passes below (looks only).',
    'Looks, from the portrait review (October 2026): a second island castle stands in the river just ahead of the straight down to the river, where the follow camera looks (the one in the spiral\'s middle is beside the camera, never in a tall picture); the land rises at most 0.8 beside another stretch (`slope`) and the hills are vineyard green (`hillside`), not bare walls (looks only).',
  ],
  opening: opening('split-start', {
    costumes: { block: 'stone-block', slalom: 'river-stake' },
    names: { plunge: 'Down from the tower', chutes: 'Twin chutes', after: 'Out of the chutes' },
    dress: { plunge: { height: 0, river: 'right' }, chutes: { height: 0, river: 'right' }, after: { height: 12, river: 'right' } },
  }),
  sections: layout('island-castle', {
    costumes: { slalom: 'mooring-pole', peg: 'bollard', swipe: 'stag', parked: 'river-ferry' },
    dress: {
      toTheRiver: { name: 'Down to the river', height: 0, river: 'right' },
      island: { name: 'Round the island castle', height: 0, river: 'right', around: 'island-castle', landmarks: [{ name: 'island-castle', at: 0.12, side: 'right', distance: 26 }] },
      bargeReach: { name: 'Barge reach', height: 8, river: 'under', landmarks: [{ name: 'river-barge', at: 0.5, river: true, distance: 20 }] },
      vineyardClimb: { name: 'Up to the vineyards', height: 0, river: 'right' },
      switchbacks: { name: 'Vineyard terraces', height: 0, river: 'none', landmarks: [{ name: 'vineyard-terraces', at: 0.3, side: 'left', distance: 24 }, { name: 'hilltop-castle', at: 0.7, side: 'left', distance: 70 }] },
      railBridge: { name: 'Under the railway bridge', height: 0, river: 'right', overhead: ['truss-bridge'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Stag hairpin', height: 0, river: 'none' },
      bargeSweep: { name: 'Out past the barges', height: 10, river: 'under', landmarks: [{ name: 'river-barge', at: 0.4, river: true, distance: 30 }] },
      lastStraight: { name: 'Run to the vineyards', height: 0, river: 'right' },
    },
  }),
});
