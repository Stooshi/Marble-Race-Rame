'use strict';

// Okavango Park: a coaster over the flooded Okavango Delta. Off a lift tower beside a giant
// baobab on a dry island, a long skim low over a clear channel beside the mokoros, a drop
// onto an island among wildflowers and an elephant herd, a long sweep high over the
// floodplain, channel bends, a hippo at the hairpin, a spin round a tall umbrella acacia and
// down to a safari lodge on stilts over the water.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'okavango-park',
  name: 'Okavango Park',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster over the flooded Okavango Delta: off a baobab island, skimming a clear channel beside the mokoros, onto an island of wildflowers and elephants, high over the floodplain, round a tall acacia and down to a safari lodge on stilts.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 16, colours: { support: '#c8a24a', rail: '#f2ead6', tie: '#5a4a32' } },
  signature: 'Channel skim',
  start: { landmark: 'baobab', scenery: ['savannah'], type: 'spiral-tower', gate: 'barrier', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'stilt-lodge', billboards: 1 },
  designChanges: [
    'Built from the funnel drop (the first drop off the baobab island, termite mounds in the bowl and a slalom of papyrus stakes) and delta skim, the library layout made for this track. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the baobab at the lift, the channel skim beside the mokoros, the island of wildflowers and elephants, the sweep high over the floodplain, the hippo at the hairpin, the acacia spin with a giraffe beside it and the stilt lodge over the water.',
    'The start is a lift tower beside the baobab (the varied starts), rather than a straight lift hill.',
    'The floating water lilies of the channel skim are a slalom of papyrus stakes (the kit\'s river stakes): water lilies flat on the water would not stand in the marbles\' way. Lilies float beside the channel with the mokoros.',
    'After the acacia spin a last drop runs down to the water, and two papyrus stakes stand in the run to the lodge, for overtakes.',
    'The safari vehicle is a plain olive vehicle with no maker\'s name, parked at the edge of the run-in.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'termite-mound', slalom: 'river-stake' },
    names: { plunge: 'Lift hill and first drop' },
    dress: { plunge: { height: 18, landmarks: [{ name: 'elephant-herd', at: 0.7, side: 'right', distance: 50 }] } },
  }),
  sections: layout('delta-skim', {
    costumes: { slalom: 'river-stake', swipe: 'hippo', parked: 'safari-jeep', peg: 'river-stake' },
    dress: {
      skim: { name: 'Channel skim', height: 4, water: true, landmarks: [{ name: 'mokoros', at: 0.5, side: 'left', distance: 26 }] },
      islandDrop: { name: 'Island swoop', height: 0, landmarks: [{ name: 'elephant-herd', at: 0.6, side: 'left', distance: 34 }] },
      sweep: { name: 'Floodplain sweep', height: 26, water: true },
      sBends: { name: 'Channel bends', height: 14, water: true },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Hippo hairpin', height: 8, water: true },
      spiral: { name: 'Acacia spin', height: 14, around: 'acacia' },
      lastDrop: { name: 'Down to the water', height: 8, water: true },
      lastStraight: { name: 'Run-in to the lodge', height: 3, water: true },
    },
  }),
});
