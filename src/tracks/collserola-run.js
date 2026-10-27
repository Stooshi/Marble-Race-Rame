'use strict';

// Collserola Run: from the Tibidabo hilltop over the Collserola woods down to the city
// and the sea. Off the hill past the temple and the Collserola tower, through a Park Güell
// mosaic tunnel, high over the city, round the Gaudí chimney at the hairpin and the
// Sagrada Família in the spin, to a station on the beach at Barceloneta.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'collserola-run',
  name: 'Collserola Run',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster from the Tibidabo hilltop down to the sea: through a Park Güell mosaic tunnel, high over the city, round a twisting Gaudí chimney and the Sagrada Família to a station on the beach at Barceloneta.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 18, colours: { support: '#c8442f', rail: '#f2efe6', tie: '#3a3d44' } },
  signature: 'Sagrada spin',
  tvCameras: [
    { section: 'Sagrada spin', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Seafront splitter', at: 0.6, side: 'left', distance: 6, height: 5 },
  ],
  start: { landmark: 'tibidabo', scenery: ['pines'], type: 'curving-lift', gate: 'barrier', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'barceloneta-beach', billboards: 1, scenery: ['palms'] },
  designChanges: [
    'Built from the libraries: the tunnel launch (the first drop off Tibidabo through boulder-sized pine cones and street lamps, straight into the Park Güell mosaic tunnel) and the late-splitter layout. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the temple and the Collserola tower at the lift hill, the forest swoops, the Park Güell tunnel and its terrace, the long sweep high over the city, the Gaudí chimney at the hairpin, the spin round the Sagrada Família and the beach station.',
    'The Park Güell tunnel comes first, as the launch tunnel: its mosaic terrace and the tiled lizard stand at its portal.',
    'The layout adds a splitter on the seafront just before the station (two sets of rails on a wider frame), and a short run down the terraces out of the hairpin past street lamps.',
    'No boost pad on the city sweep (the layout has none there), no wild boar and no parked beach kiosk: the kiosk stands on the beach behind the station.',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'pine-cone', slalom: 'street-lamp' },
    tunnel: 'mosaic',
    names: { portal: 'Lift hill and first drop', tunnel: 'Park Güell tunnel' },
    dress: { portal: { height: 22 }, tunnel: { landmarks: [{ name: 'park-guell-terrace', at: 0.2, side: 'right', distance: 26 }] } },
  }),
  sections: layout('late-splitter', {
    costumes: { swipe: 'gaudi-chimney', slalom: 'street-lamp' },
    dress: {
      sweep: { name: 'City view sweep', height: 40, landmarks: [{ name: 'barcelona-city', at: 0.5, side: 'left', distance: 190 }] },
      brakingStraight: { name: 'Forest swoops', height: 0, scenery: ['pines'] },
      hairpin: { name: 'Gaudí hairpin', height: 18 },
      outOfHairpin: { name: 'Down the terraces', height: 22 },
      spiral: { name: 'Sagrada spin', height: 14, around: 'sagrada-familia' },
      sBends: { name: 'Eixample bends', height: 22 },
      splitter: { name: 'Seafront splitter', height: 16 },
      lastStraight: { name: 'Barceloneta run', height: 3 },
    },
  }),
});
