'use strict';

// Pyramid Run: a coaster racing between the pyramids over the desert at golden hour.
// Off the lift hill past the Great Sphinx, straight through a passage in a pyramid,
// low over the dunes, high between the three pyramids, round a pharaoh's statue at the
// hairpin, past the obelisk to a Nile-side station with palms and feluccas.
const { track, opening, layout } = require('../trackKit');
const { peg } = require('../trackKit/parts');

module.exports = track({
  slug: 'pyramid-run',
  name: 'Pyramid Run',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster between the pyramids at golden hour: off the lift hill past the Great Sphinx, through a torch-lit passage in a pyramid, low over the dunes, high between the three pyramids of Giza and down to a station on the Nile.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'sunset',
  coaster: { height: 18, colours: { support: '#b8863a', rail: '#f2e6c8', tie: '#5a3a22' } },
  signature: 'Pyramid passage',
  start: { landmark: 'sphinx', type: 'straight-lift', gate: 'stalls', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'nile-station', billboards: 1, scenery: ['palms'] },
  designChanges: [
    'Built from the libraries: the tunnel launch (the first drop through fallen stone blocks and broken columns, straight into the passage through a pyramid) and the two-splitters layout. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the Sphinx with the Great Pyramid behind the lift hill, the run through the pyramid, the swoops low over the dunes past a camel caravan, the long sweep high between the three pyramids, the pharaoh\'s statue at the hairpin, the obelisk and the Nile station.',
    'The run through the pyramid comes first, as the launch tunnel: a torch-lit passage of sandstone and hieroglyphs.',
    'No obelisk spin: the two-splitters layout has no spiral. The obelisk stands beside the second S-bends instead.',
    'Both splitters retuned from batches: the first one\'s inside ice a little rougher than the layout\'s, the second one\'s a little smoother, with a broken column early on its run-in to mix the lanes (out of the S-bends the leaders otherwise all take its inside channel).',
    'No kneeling camels on the line and no parked market cart: the caravan crosses the dunes beside the track, and the layout has no parked object.',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'stone-block', slalom: 'broken-pillar' },
    tunnel: 'pyramid',
    names: { portal: 'Lift hill and first drop', tunnel: 'Pyramid passage' },
    dress: { portal: { height: 22 } },
  }),
  sections: layout('two-splitters', {
    costumes: { swipe: 'pharaoh-statue', slalom: 'broken-pillar' },
    dress: {
      sBends1: { name: 'Dune swoops', height: 0, landmarks: [{ name: 'caravan', at: 0.5, side: 'right', distance: 80 }] },
      splitter1: { name: 'Dune splitter', height: 14, balance: { left: { drag: 1.65, scrub: 1.65 } } },
      sweep: { name: 'Pyramids sweep', height: 40, landmarks: [{ name: 'giza-pyramids', at: 0.5, side: 'left', distance: 230 }] },
      brakingStraight: { name: 'Temple run', height: 20 },
      hairpin: { name: 'Pharaoh hairpin', height: 18 },
      outOfHairpin: { name: 'Down the colonnade', height: 22 },
      sBends2: { name: 'Obelisk bends', height: 24, landmarks: [{ name: 'obelisk', at: 0.5, side: 'right', distance: 26 }] },
      splitter2: {
        name: 'Palm splitter', height: 14,
        balance: { left: { drag: 2.5, scrub: 2.5 } },
        addObstacles: [peg({ costume: 'broken-pillar', at: 0.05, line: 0.25 })],
      },
      lastStraight: { name: 'Nile run', height: 3 },
    },
  }),
});
