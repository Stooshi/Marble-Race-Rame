'use strict';

// Copper Spins: Canyon Series track 5, through the Copper Canyon in Mexico, six canyons joined
// together, larger than the Grand Canyon. Launched from an old mission, the track hops from canyon
// to canyon on timber trestles like the old mining railways, under a railway trestle with its
// train, past homes tucked into the cliffs, to a canyon railway station.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'copper-spins',
  name: 'Copper Spins',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through the Copper Canyon in Mexico, six canyons joined together: launched from an old mission, hopping from canyon to canyon on timber trestles, under a railway trestle and its train, past homes in the cliffs, to a canyon railway station.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  canyon: { palette: 'copper', depth: 40, river: 'left' },
  coaster: { style: 'timber', colours: { support: '#7a5434', rail: '#e8dcc0', tie: '#4f3622' } },
  signature: 'Railway trestle',
  tvCameras: [
    { section: 'Railway trestle', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Fifth canyon spin', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'adobe-mission', scenery: ['rocks'], type: 'station-launch', gate: 'barrier', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'canyon-station' },
  designChanges: [
    'Built from the boost-pad launch (a launch from the mission\'s platform) and six canyons, the library layout made for this track.',
    'The track\'s supports are timber trestle bents, as the old mining railways\' were.',
  ],
  opening: opening('boost-launch', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { drop: 'Launch drop', launch: 'Launch strip', plunge: 'Into the first canyon' },
    dress: { drop: { height: 0 }, launch: { height: 0 }, plunge: { height: 0 } },
  }),
  sections: layout('six-canyons', {
    costumes: { slalom: 'cairn', peg: 'fence-post', swipe: 'falcon', parked: 'ore-cart' },
    dress: {
      hop1: { name: 'Trestle hop', height: 30 },
      canyon2: { name: 'Second canyon', height: 0, landmarks: [{ name: 'cliff-dwellings', at: 0.5, side: 'right', distance: 6 }] },
      hop2: { name: 'Over the ridge', height: 28 },
      drop: { name: 'Into the third canyon', height: 0 },
      canyon3: { name: 'Railway trestle', height: 0, overhead: ['railway-trestle'] },
      hop3: { name: 'Fourth canyon sweep', height: 32 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Hawk hairpin', height: 0 },
      spin: { name: 'Fifth canyon spin', height: 16 },
      lastStraight: { name: 'Sixth canyon run', height: 0 },
    },
  }),
});
