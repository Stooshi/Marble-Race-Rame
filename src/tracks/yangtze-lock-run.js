'use strict';

// Yangtze Lock Run: Rivers track 5, at a great river's ship locks among green mountains. Out of the top
// lock as its gate opens, down a staircase of five locks beside the ships waiting in them, over the dam
// crest, a slalom down under a long cable-stayed bridge, a wide sweep down the river, round a hairpin past
// the river boats and down to the quay below the green peaks.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'yangtze-lock-run',
  name: 'Yangtze Lock Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great river\'s ship locks among green mountains: out of the top lock as its gate opens, down a staircase of five locks beside the waiting ships, a slalom under a long bridge, a wide sweep down the river and down to the quay below the green peaks.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'dawn',
  variants: ['day'],
  river: { palette: 'yangtze', side: 'right', width: 160, banks: 'rock', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#8a8a86', rail: '#f2f0ea', tie: '#4a4a48' } },
  signature: 'The lock staircase',
  start: { landmark: 'green-peaks', scenery: ['rocks'], type: 'lock-gate', gate: 'paddle', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'river-ferry' },
  designChanges: [
    'Built from the clean drop and the lock staircase, the library layout made for this track: a straight down five lock steps, a climb over the dam crest, a steep slalom drop under a long bridge, a river sweep, S-bends, a spiral, the hairpin and the run-in.',
    'The ship locks stand beside the staircase, the steps level with their gates (looks only).',
    'Looks, from the portrait review (approved 23 Oct 2026): the river 10 m from the track beside the ground stretches with a low, gentle shore (`gap`), the land rising at most 0.8 beside another stretch (`slope`), green hills in patches away from the water (`hillside`), wavelets on the water and white water only at real rapids; the S-bends and the spiral fly on supports, so no viaduct of earth stands where the S-bends cross over the spiral (looks only).',
  ],
  opening: opening('clean-drop', {
    names: { plunge: 'Out of the lock', bends: 'Below the gate' },
    dress: { plunge: { height: 0, river: 'right' }, bends: { height: 0, river: 'right' } },
  }),
  sections: layout('lock-staircase', {
    costumes: { slalom: 'mooring-pole', peg: 'bollard', swipe: 'fisherman', parked: 'river-ferry' },
    dress: {
      locks: { name: 'The lock staircase', height: 0, river: 'right', landmarks: [{ name: 'ship-locks', at: 0.5, side: 'left', distance: 24 }] },
      damCrest: { name: 'Over the dam crest', height: 0, river: 'right' },
      riverSweep: { name: 'Down the river', height: 0, river: 'right', landmarks: [{ name: 'green-peaks', at: 0.5, side: 'left', distance: 140 }, { name: 'river-cruiser', at: 0.6, river: true, distance: 40 }] },
      bridgeRun: { name: 'Under the long bridge', height: 0, river: 'right', overhead: ['cable-stayed-bridge'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Boatman hairpin', height: 0, river: 'right' },
      sBends: { name: 'S-bends', height: 14, river: 'left', scenery: ['reeds'] },
      spin: { name: 'Spiral', height: 12, river: 'none' },
      lastStraight: { name: 'Run to the quay', height: 0, river: 'left', landmarks: [{ name: 'river-barge', at: 0.5, river: true, distance: 24 }] },
    },
  }),
});
