'use strict';

// Aoraki Ice Lake Run: Peaks track 10, down the moraine wall of the great glacier to its lake where icebergs
// float, under a sky thick with stars. A clean drop off an ice ledge on the moraine crest, a two-step drop down the
// wall (the first big feature), a slalom among the icebergs, the splitter on a bend round the biggest one (the
// second: two curving channels), lake S-bends, the hairpin and a lakeshore spiral. Aoraki itself (an ancestor to
// Ngāi Tahu, who ask climbers not to stand on its summit) appears only in the far backdrop: never touched, no cairn.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'aoraki-ice-lake-run',
  name: 'Aoraki Ice Lake Run',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Down the moraine wall of the great glacier to its lake under a sky thick with stars: a two-step drop down the wall, a slalom among floating icebergs and a split round the biggest one.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'night',
  variants: ['dawn'],
  peak: { palette: 'aoraki' },
  coaster: { style: 'alpine', colours: { support: '#7a8088', rail: '#e4ecf4', tie: '#4a5058' } },
  signature: 'Round the big berg',
  tvCameras: [
    { section: 'Round the big berg', at: 0.9, side: 'left', distance: 10, height: 12 },
    { section: 'Second drop', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'glacier-tongue', type: 'ice-ledge', gate: 'barrier', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'icebergs' },
  designChanges: [
    'Built from the clean drop and the iceberg lake, the library layout made for this track (L98): a two-step drop down the moraine wall (a peg on the shelf between the steps: the first big feature), a slalom among the icebergs (five gates: the luck the clean drop\'s waves need), the splitter on a bend round the biggest iceberg (the second, Moses\'s rule of 27 Oct 2026), lake S-bends, the hairpin, a lakeshore spiral and the run-in.',
    'Aoraki is scenery only, far in the backdrop: nothing of ours on it (the Peaks rules, from Ngāi Tahu\'s request).',
    'The splitter round the big berg turns left with its inside channel much rougher: turning right, the leaders (off the slalom on the left) took its outside channel and won 65% of 3,000 races from 43% of the marbles.',
  ],
  opening: opening('clean-drop', {
    side: 'right',
    names: { plunge: 'Off the moraine crest', bends: 'Crest S-bends' },
  }),
  sections: layout('iceberg-lake', {
    costumes: { slalom: 'serac', peg: 'serac', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      wall1: { peak: { zone: 'rock' } },
      shelf: { peak: { zone: 'rock' } },
      wall2: { peak: { zone: 'rock' } },
      lake: { peak: { zone: 'ice' }, landmarks: [{ name: 'icebergs', at: 0.5, side: 'left', distance: 40 }] },
      splitter: { peak: { zone: 'ice' }, around: 'mountain-hut', landmarks: [{ name: 'icebergs', at: 0.5, side: 'right', distance: 45 }] },
      sBends: { peak: { zone: 'ice' } },
      brakingStraight: { peak: { zone: 'rock' } },
      hairpin: { peak: { zone: 'rock' } },
      spin: { peak: { zone: 'heath' } },
      lastStraight: { name: 'Along the lakeshore', peak: { zone: 'heath' }, landmarks: [{ name: 'glacial-lake', at: 0.5, side: 'left', distance: 50 }] },
    },
  }),
});
