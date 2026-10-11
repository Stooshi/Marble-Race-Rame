'use strict';

// Ha Long Bay Spins: a coaster over emerald water, spinning between towering limestone
// islands. Off the lift hill past the Fighting Cocks, down to skim the water, round a
// karst island, through a sea cave, a long run on supports standing in the bay, a
// fisherman's oar at the hairpin, round a second island and in to a floating village.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'ha-long-bay-spins',
  name: 'Ha Long Bay Spins',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster over the emerald water of Ha Long Bay: past the Fighting Cocks, spinning round towering limestone islands, through a glowing sea cave and in to a floating fishing village.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  coaster: { height: 14, colours: { support: '#2f8a7a', rail: '#f2efe6', tie: '#3a3d44' } },
  signature: 'Island spin one',
  start: { landmark: 'fighting-cocks' },
  finish: { landmark: 'floating-village', billboards: 1 },
  designChanges: [
    'Built from the funnel-drop opening (the field gathered in the wide funnel at the gate, then the first drop down to the water through floating buoys and bamboo poles) and island spins, the library layout made for this track: a spin first, a straight through the sea cave, the long water run, the hairpin, the second spin, a drop through bamboo poles and the run-in. Its landmark moments are the design\'s: the Fighting Cocks behind the lift hill, the island spins, the sea cave with its stalactites and glowing pools, the water run among junk boats, the fisherman\'s oar at the hairpin and the floating village station.',
    'The fishing-pole slalom is on the drop after the second spin, not in the spin (the layouts keep spirals clear of obstacles); bamboo mooring poles also stand in the sea cave and on the run-in.',
    'The monkeys sit on the second island\'s ledges; the bamboo basket boats are moored at the floating village; the kayak is moored there too, not on the track.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'buoy', slalom: 'mooring-pole' },
    names: { plunge: 'Lift hill and first drop' },
    dress: { plunge: { height: 18 } },
  }),
  sections: layout('island-spins', {
    costumes: { swipe: 'fisherman', slalom: 'mooring-pole', peg: 'mooring-pole' },
    dress: {
      spiral1: { name: 'Island spin one', height: 16, water: true, around: 'limestone-island' },
      caveRun: { name: 'Sea cave', tunnel: 'sea-cave' },
      sweep: { name: 'Water run', height: 8, water: true, landmarks: [{ name: 'karst-bay', at: 0.5, side: 'left', distance: 150 }] },
      sBends: { name: 'Island bends', height: 18, water: true },
      brakingStraight: { name: 'Run to the hairpin', height: 12, water: true },
      hairpin: { name: 'Oar hairpin', height: 12, water: true },
      spiral2: { name: 'Island spin two', height: 14, water: true, around: 'limestone-island' },
      slalomDrop: { name: 'Fishing poles', height: 8, water: true },
      lastStraight: { name: 'Village run', height: 3 },
    },
  }),
});
