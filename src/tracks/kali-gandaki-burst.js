'use strict';

// Kali Gandaki Burst: Canyon Series track 7, down the Kali Gandaki gorge in Nepal between two of the
// highest mountains on Earth, one on either side. From chortens on the trail, past the twin peaks,
// under prayer flags and a swaying footbridge, past a yak at the hairpin, a spin and a drop, to a
// trail village of stone houses and apple orchards.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kali-gandaki-burst',
  name: 'Kali Gandaki Burst',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Down the Kali Gandaki gorge in Nepal, between two giant snow peaks, one on either side: under prayer flags and a swaying footbridge, past a yak and through a spin, to a trail village of stone houses and apple trees.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  canyon: { palette: 'himalaya', depth: 50, river: 'left' },
  coaster: { colours: { support: '#5a6a7a', rail: '#f2ede2', tie: '#3a302a' } },
  signature: 'Between the giants',
  start: { landmark: 'chorten-row', scenery: ['rocks'], type: 'spiral-tower', gate: 'paddle', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'trail-village' },
  designChanges: [
    'Built from the funnel drop (a long bowl at the gate) and twin peaks, the library layout made for this track.',
    'The wind-blown dust of the design is left out: on phones it would cost more drawing than it adds.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'mossy-boulder', slalom: 'mani-post' },
    names: { plunge: 'The bowl' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('twin-peaks', {
    costumes: { slalom: 'mani-post', peg: 'mani-post', swipe: 'musk-ox', parked: 'river-raft' },
    dress: {
      windRun: { name: 'Between the giants', height: 0, landmarks: [{ name: 'giant-peak', at: 0.3, side: 'left', distance: 470 }, { name: 'giant-peak', at: 0.3, side: 'right', distance: 470 }] },
      sweep1: { name: 'Prayer-flag sweep', height: 30, overhead: ['prayer-flags'] },
      sBends: { name: 'Footbridge bends', height: 0, overhead: ['suspension-bridge'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Yak hairpin', height: 0 },
      spin: { name: 'Gorge spin', height: 14 },
      drop: { name: 'Drop', height: 0 },
      sweep2: { name: 'Mule-trail sweep', height: 0, landmarks: [{ name: 'mule-train', at: 0.5, side: 'right', distance: 6 }] },
      lastStraight: { name: 'Run to the village', height: 0 },
    },
  }),
});
