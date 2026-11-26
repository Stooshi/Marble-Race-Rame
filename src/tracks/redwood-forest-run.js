'use strict';

// Redwood Forest Run: a coaster weaving between the tallest trees on Earth, down to the
// Pacific. Off the lift hill beside a drive-through redwood, a banked turn between the
// giants, through the trunk of a fallen redwood, high in the canopy, down a fern swoop to
// the forest floor, a black bear at the hairpin, a spin round a giant trunk and out to a
// misty beach of sea stacks.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'redwood-forest-run',
  name: 'Redwood Forest Run',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster weaving between the tallest trees on Earth: through the trunk of a fallen giant, high in the canopy, down a fern swoop to the forest floor, round a giant redwood and out to a misty beach of sea stacks.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 18, colours: { support: '#6a4a2a', rail: '#e2dcc8', tie: '#3a2a20' } },
  signature: 'Through the trunk',
  tvCameras: [
    { section: 'Through the trunk', at: 0.8, side: 'left', distance: 6, height: 12 },
    { section: 'Trunk spin', at: 0.4, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'drive-through-redwood', scenery: ['pines'], type: 'elevator', gate: 'paddle', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'sea-stacks-beach' },
  designChanges: [
    'Built from the banked first turn (the first drop between the giants through fallen logs and toadstools, straight into a steep banked turn) and canopy run, the library layout made for this track: a straight run through the fallen trunk, the canopy sweep, the fern swoop with its toadstool slalom, creek bends, the hairpin late, a spin and a quarter round a giant redwood and a toadstool run to the coast. Its landmark moments are the design\'s: the drive-through redwood at the lift hill, the run through the trunk, the canopy run, the fern swoop touching the forest floor, the black bear at the hairpin, the trunk spin with an elk on the bank and the sea-stack beach station.',
    'The slalom is of tall toadstools rather than mushrooms on the ground, so marbles race between them.',
    'The ranger\'s truck is parked on the beach, not on the track; banana slugs crawl on the giant redwood in the spin.',
    'No billboard on the station roof: its frame stood in the follow camera\'s view at the line. Five boards stand on the support towers instead.',
    'Daylight rather than the design\'s mist: in fog the giants and the coast were lost from every view.',
    'The second TV camera moved from late in the Trunk spin to its middle, 67% of the way, so the track has a mid-race camera for the pack shot (30 Oct 2026); looks only.',
  ],
  opening: opening('banked-turn', {
    costumes: { block: 'log', slalom: 'toadstool' },
    names: { plunge: 'Lift hill and first drop', turn: 'Between the giants' },
    dress: { plunge: { height: 24, landmarks: [{ name: 'redwood-grove', at: 0.6, side: 'right', distance: 60 }] }, turn: { height: 18 } },
  }),
  sections: layout('canopy-run', {
    costumes: { swipe: 'black-bear', slalom: 'toadstool', peg: 'toadstool' },
    dress: {
      trunkRun: { name: 'Through the trunk', tunnel: 'redwood-trunk' },
      sweep: { name: 'Canopy run', height: 40, landmarks: [{ name: 'redwood-grove', at: 0.5, side: 'right', distance: 90 }] },
      fernDrop: { name: 'Fern swoop', height: 0 },
      sBends: { name: 'Creek bends', height: 12 },
      brakingStraight: { name: 'Run to the hairpin', height: 10 },
      hairpin: { name: 'Bear hairpin', height: 12 },
      spiral: { name: 'Trunk spin', height: 16, around: 'giant-redwood' },
      lastStraight: { name: 'Coast run', height: 3 },
    },
  }),
});
