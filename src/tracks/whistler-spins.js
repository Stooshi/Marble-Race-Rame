'use strict';

// Whistler Spins: a winter coaster spinning down Whistler's mountains to the village.
// Off the summit past a stone inukshuk, high across the valley under the red gondola,
// two wide spins (the second round a frozen waterfall), a grizzly at the hairpin and a
// swoop through snowy cedars into the village.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'whistler-spins',
  name: 'Whistler Spins',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A winter coaster spinning down Whistler\'s mountains: off the summit past a stone inukshuk, high across the valley under the gondola, two wide spins, a grizzly at the hairpin and a swoop through snowy cedars to the village.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  coaster: { height: 18, colours: { support: '#2f6f4a', rail: '#e8eef2', tie: '#3a3d44' } },
  signature: 'Spin two',
  tvCameras: [
    { section: 'Spin two', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Spin one', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'inukshuk', scenery: ['pines'], type: 'elevator', gate: 'paddle', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'whistler-village', billboards: 1, scenery: ['chalets'] },
  designChanges: [
    'Built from the libraries: the staggered drop (the field let go in waves off the summit, through giant snowballs and ski gates) and the twin-spirals layout, mirrored. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the inukshuk on the summit, the flight across the valley under the gondola, the two spins, the grizzly at the hairpin, the frozen waterfall with its mountain goat beside the second spin, the swoop through the snowy cedars and the village station.',
    'The ski-pole slalom is in the first drop and on the ski run between the spins (the layout\'s peg field), not in the first spin: the layouts keep spirals clear of obstacles.',
    'The frozen waterfall stands beside the second spin rather than in its middle: there it stood in the follow camera\'s view on the run into the hairpin. Its mountain goat stands on a ledge, as scenery, not an obstacle.',
    'The snowmobile is parked in the village, not on the track; the village run has the layout\'s banner gantry over it.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'giant-snowball', slalom: 'slalom-gate' },
    names: { plunge: 'Lift hill and first drop' },
    dress: { plunge: { height: 24 } },
  }),
  sections: layout('twin-spirals', {
    mirror: true,
    costumes: { swipe: 'grizzly', peg: 'slalom-gate', curtain: 'banner-gantry' },
    dress: {
      sBends: { name: 'Gondola valley', height: 40, overhead: ['gondola'] },
      spiral1: { name: 'Spin one', height: 22 },
      pegRun: { name: 'Ski run', height: 0, scenery: ['pines'] },
      brakingStraight: { name: 'Frozen creek', height: 0 },
      hairpin: { name: 'Grizzly hairpin', height: 16 },
      spiral2: { name: 'Spin two', height: 14, landmarks: [{ name: 'frozen-waterfall', at: 0.6, side: 'right', distance: 70 }] },
      sweep: { name: 'Cedar swoops', height: 12, scenery: ['pines'] },
      lastStraight: { name: 'Village run', height: 3 },
    },
  }),
});
