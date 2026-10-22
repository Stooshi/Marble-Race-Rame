'use strict';

// Murray Red Gum Run: Rivers track 9, through the flooded red gum forests of a great Australian river. Out
// of a lock as its gate opens, down the plunge, a slalom low over the flood between the pale trunks of the
// river red gums, back to the bank under the golden limestone cliffs, a spiral by the pelicans, up to a lock
// and over its weir, and round to the landing where the paddle boat waits.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'murray-red-gum-run',
  name: 'Murray Red Gum Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'The flooded red gum forests of a great Australian river: a slalom low over the flood between the pale trunks of the river red gums, under the golden limestone cliffs, past the pelicans, over a lock\'s weir and round to the paddle boat\'s landing.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'murray', side: 'right', width: 110, banks: 'sand', calm: true },
  coaster: { colours: { support: '#7a6450', rail: '#f2eadc', tie: '#40342a' } },
  signature: 'Through the red gums',
  start: { type: 'lock-gate', gate: 'barrier', shots: { countdown: 'side', launch: 'look-back' } },
  finish: { landmark: 'paddle-steamer' },
  designChanges: [
    'Built from the classic opening (out of the lock) and the flooded forest, the library layout made for this track: a slalom straight between the red gums low over the flood, a drop back to the bank, a sweep under the cliffs, a spiral, the hairpin, a short climb up to a lock and a drop over its weir, S-bends, a sweep to the landing and the run-in.',
    'Closer racing (a quick run: gap 18.2 s, last home 85.8 s, the slow marbles losing most among the trunks): the trunk slalom from 110 m at 0.11 to 95 m at 0.14 with five gates at 0.15, the cliff sweep from 120 to 100 degrees.',
    'Looks: the flood reads as water (a calm river: hardly any white water where it falls with the track, its water a dark olive green); the stands of red gums set where they never reach the track (looks only).',
  ],
  opening: opening('classic', {
    costumes: { block: 'log', slalom: 'river-stake' },
    names: { plunge: 'Out of the lock' },
    dress: { plunge: { height: 0, river: 'right' } },
  }),
  sections: layout('flooded-forest', {
    costumes: { slalom: 'red-gum', peg: 'red-gum', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      trunks: { name: 'Through the red gums', height: 7, river: 'under', landmarks: [{ name: 'red-gums', at: 0.25, river: true, distance: 44 }, { name: 'red-gums', at: 0.55, river: true, distance: 56 }, { name: 'red-gums', at: 0.85, river: true, distance: 36 }] },
      offStilts: { name: 'Back to the bank', height: 0, river: 'right' },
      cliffs: { name: 'Under the cliffs', height: 0, river: 'right', landmarks: [{ name: 'limestone-cliffs', at: 0.5, side: 'left', distance: 40 }] },
      spin: { name: 'Pelican spiral', height: 0, river: 'right', landmarks: [{ name: 'pelicans', at: 0.5, river: true, distance: 20 }] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Eagle hairpin', height: 0, river: 'right' },
      lock: { name: 'Up to the lock', height: 0, river: 'left', landmarks: [{ name: 'lock-weir', at: 0.5, side: 'left', distance: 30 }] },
      weir: { name: 'Over the weir', height: 0, river: 'left' },
      sBends: { name: 'S-bends', height: 0, river: 'left', scenery: ['reeds'] },
      landing: { name: 'Sweep to the landing', height: 0, river: 'left' },
      lastStraight: { name: 'Run to the paddle boat', height: 0, river: 'left' },
    },
  }),
});
