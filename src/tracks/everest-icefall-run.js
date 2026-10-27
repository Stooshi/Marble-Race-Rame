'use strict';

// Everest Icefall Run: Peaks track 1 (test five), the icefall below the world's highest mountain. Off an
// overhanging snow ledge, a clean drop into deep S-bends, then down a staircase of leaning seracs: three short
// drops, each followed by a crossing over a crevasse (two ladder bridges and an ice-arch bridge) and tight S-bends,
// a long glacier sweep down to a flag-free base camp, and the run-in past the tents. The mountain itself
// (Chomolungma) stands untouched in the backdrop with its snow plume: no cairn, sign, flag or religious object.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'everest-icefall-run',
  name: 'Everest Icefall Run',
  family: 'peak',
  difficulty: 'extreme',
  description: 'The icefall below the world\'s highest mountain: off a snow ledge, down a staircase of leaning seracs, over crevasses on ladder and ice-arch bridges, and a long glacier sweep to the base camp, the summit with its snow plume high above.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'high-altitude',
  variants: ['day', 'snow'],
  peak: { palette: 'everest' },
  coaster: { style: 'alpine', colours: { support: '#8f969e', rail: '#e8eef4', tie: '#5b616b' } },
  signature: 'First ladder',
  tvCameras: [
    { section: 'First ladder', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Camp hairpin', at: 0.4, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'serac-field', type: 'ice-ledge', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'peak-camp' },
  designChanges: [
    'Built from the clean drop and the icefall ladders, the library layout made for this track (L89): three short drops down the seracs, the first a slalom between them (four gates: the luck the clean drop\'s waves need further on), each followed by a crossing over a crevasse (a peg) and tight S-bends between the steps, a long glacier sweep (two pegs), the hairpin and the run-in.',
    'The crevasse crossings fly 8 m over a crevasse cut across under the track, on two ladder bridges and an ice-arch bridge (looks only); the seracs are the slalom poles and pegs (looks only).',
    'The summit (Chomolungma) is scenery only, in the far backdrop with its snow plume; nothing of ours on it, no flags anywhere, the base camp flag-free (Moses, 21 Oct 2026).',
  ],
  opening: opening('clean-drop', {
    side: 'left',
    names: { plunge: 'Off the ledge', bends: 'Snowfield S-bends' },
    dress: { plunge: { scenery: ['rocks'] }, bends: { landmarks: [{ name: 'serac-field', at: 0.5, side: 'right', distance: 40 }] } },
  }),
  sections: layout('icefall-ladders', {
    costumes: { slalom: 'serac', peg: 'serac', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      icefall1: { name: 'Serac slalom', peak: { zone: 'ice' } },
      ladder1: { name: 'First ladder', height: 8, peak: { crevasse: 'ladder', zone: 'ice' } },
      bends1: { peak: { zone: 'ice' }, landmarks: [{ name: 'serac-field', at: 0.4, side: 'left', distance: 45 }] },
      icefall2: { peak: { zone: 'ice' } },
      ladder2: { name: 'Second ladder', height: 8, peak: { crevasse: 'ladder', zone: 'ice' } },
      bends2: { peak: { zone: 'ice' } },
      icefall3: { peak: { zone: 'ice' } },
      ladder3: { height: 8, peak: { crevasse: 'ice-arch', zone: 'ice' } },
      glacier: { name: 'Glacier sweep to camp', peak: { zone: 'snow' } },
      brakingStraight: { name: 'Run to the hairpin', peak: { zone: 'snow' } },
      hairpin: { name: 'Camp hairpin', peak: { zone: 'snow' } },
      lastStraight: { name: 'Past the tents', peak: { zone: 'snow' }, landmarks: [{ name: 'peak-camp', at: 0.5, side: 'right', distance: 22 }] },
    },
  }),
});
