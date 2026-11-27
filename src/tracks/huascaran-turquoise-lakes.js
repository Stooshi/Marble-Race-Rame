'use strict';

// Huascarán Turquoise Lakes: Peaks track 12, down a valley of three turquoise glacial lakes one below the
// other, giant flower spikes (Puya) on the slopes, the white tropical peak above at noon. A sweep round each lake,
// then its outflow and a waterfall step down to the next (the track's big feature: three falls in a row), a slalom
// among the Puya, the hairpin and the run-in. A pass cairn at the top; the summit stays scenery only.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'huascaran-turquoise-lakes',
  name: 'Huascarán Turquoise Lakes',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Down a valley of three turquoise glacial lakes below the white tropical peak: a sweep round each lake and a waterfall step down to the next, three falls in a row, then a slalom among giant flower spikes.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  peak: { palette: 'huascaran' },
  coaster: { style: 'alpine', colours: { support: '#7a7468', rail: '#f2eee4', tie: '#4a453c' } },
  signature: 'Second fall',
  tvCameras: [
    { section: 'Second fall', at: 0.9, side: 'left', distance: 10, height: 12 },
    { section: 'Puya slalom', at: 0.7, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'pass-cairn', type: 'straight-lift', gate: 'stalls', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'glacial-lake' },
  designChanges: [
    'Built from the staggered drop and the lake terraces, the library layout made for this track (L100): a sweep round each of three lakes (a peg on the first), each followed by its outflow (a peg) and a waterfall step down to the next (the track\'s big feature, Moses\'s rule of 27 Oct 2026: three falls in a row), a slalom among the Puya, the hairpin and the run-in.',
    'Different from Aoraki Ice Lake Run\'s drops (two plunges down a moraine wall): these are three short waterfalls, a lake between each.',
    'The Puya slalom and the run-in shortened (58 m and 75 m): the slowest of 3,000 races\' last marbles came home at 87.3 s (target under 85 s), and the land showed through just after the line on phones. The three falls are drawn as one mesh of each kind and on phones as their water only, and no spindrift over the moorland: the phone\'s drawing load was 47 calls (target 35).',
    'The parked hut sledge on the run-in further from the hairpin (35% along, not 20%): in one race of 3,000 a marble stopped against it coming out of the hairpin and never finished.',
  ],
  opening: opening('staggered-drop', {
    names: { plunge: 'Off the pass' },
    dress: { plunge: { peak: { zone: 'rock' } } },
  }),
  sections: layout('lake-terraces', {
    costumes: { slalom: 'groundsel', peg: 'groundsel', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      lake1: { peak: { zone: 'moorland' }, landmarks: [{ name: 'glacial-lake', at: 0.5, side: 'left', distance: 50 }] },
      outflow1: { peak: { zone: 'moorland' } },
      fall1: { peak: { zone: 'rock' } },
      lake2: { peak: { zone: 'moorland' }, landmarks: [{ name: 'glacial-lake', at: 0.5, side: 'right', distance: 50 }] },
      outflow2: { peak: { zone: 'moorland' } },
      fall2: { peak: { zone: 'rock' } },
      lake3: { peak: { zone: 'moorland' }, landmarks: [{ name: 'glacial-lake', at: 0.5, side: 'left', distance: 50 }] },
      outflow3: { peak: { zone: 'moorland' } },
      fall3: { peak: { zone: 'rock' } },
      puya: { peak: { zone: 'moorland' }, landmarks: [{ name: 'puya-plants', at: 0.5, side: 'left', distance: 20 }] },
      brakingStraight: { peak: { zone: 'moorland' } },
      hairpin: { peak: { zone: 'moorland' } },
      lastStraight: { name: 'Moraine run-in', peak: { zone: 'rock' } },
    },
  }),
});
