'use strict';

// Chiang Mai: a coaster from the golden mountain temple above the city, through cloud forest
// and over rice terraces, round a hilltop temple under floating lanterns and down into the
// old city. Off a curving lift beside Wat Phra That Doi Suthep, swoops under hanging moss,
// past a tall waterfall on high supports, a long sweep over the terraces, the temple spin,
// an elephant at the hairpin, a drop through a slalom of paper lanterns and the run-in
// past the moat to the red-brick city gate.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'chiang-mai',
  name: 'Chiang Mai',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster from the golden mountain temple above Chiang Mai: through cloud forest and past a tall waterfall, over the rice terraces, round a hilltop temple under floating lanterns and down to the red-brick gate of the old city.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'sunset',
  coaster: { height: 18, colours: { support: '#9a2f2a', rail: '#ecdcae', tie: '#4a3a2a' } },
  signature: 'Temple spin',
  start: { landmark: 'doi-suthep', scenery: ['palms'], type: 'curving-lift', gate: 'stalls', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'chiang-mai-gate', billboards: 1, scenery: ['market-stalls'] },
  designChanges: [
    'Built from the crest start (its first drop into the cloud forest over fallen branches, a slalom of lantern poles and a camelback) and terrace run, the library layout made for this track. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the golden temple behind the lift, the cloud forest swoops under hanging moss, the waterfall run on high supports, the long sweep over the rice terraces, the temple spin round a hilltop chedi under floating lanterns, the elephant at the hairpin and the old city gate by the moat.',
    'The temple spin comes before the hairpin, not after it: the layout keeps the sharp bend late, after a braking run through the teak forest, and its slalom of paper lanterns is on the drop out of the hairpin rather than in the spin (no obstacles in a spin).',
    'The start is a curving lift hill (the varied starts): the climb curves round the temple terrace.',
    'The tuk-tuk is the kit\'s auto-rickshaw, parked at the edge of the run-in.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'log', slalom: 'lantern-pole' },
    names: { plunge: 'Lift hill and first drop', climb: 'Mountain crest', drop: 'Into the cloud forest' },
    dress: { plunge: { height: 24 }, climb: { height: 18 }, drop: { height: 26 } },
  }),
  sections: layout('terrace-run', {
    mirror: true,
    costumes: { curtain: 'vines', swipe: 'elephant', slalom: 'lantern-pole', parked: 'auto-rickshaw' },
    dress: {
      swoops: { name: 'Cloud forest swoops', height: 0 },
      straightRun: { name: 'Waterfall run', height: 30, waterCurtain: true, landmarks: [{ name: 'waterfall-cliff', at: 0.5, side: 'right', distance: 42 }] },
      sweep: { name: 'Rice terrace sweep', height: 24, landmarks: [{ name: 'rice-terraces', at: 0.5, side: 'right', distance: 60 }], scenery: ['stilt-houses'] },
      spiral: { name: 'Temple spin', height: 14, around: 'lantern-chedi' },
      brakingStraight: { name: 'Teak forest run', height: 0 },
      hairpin: { name: 'Elephant hairpin', height: 10 },
      slalomDrop: { name: 'Lantern drop', height: 10 },
      sweep2: { name: 'Moat bend', height: 6 },
      lastStraight: { name: 'Run-in to the old city', height: 3 },
    },
  }),
});
