'use strict';

// Alaska Tidewater Run: Peaks track 15, a wide glacier flowing all the way to the sea, ending in a tall ice cliff
// that calves into the fjord, the northern lights overhead. Off a ski plane's ramp, a long glacier sweep, the jump
// over a crevasse (the first big feature: the boost-pad jump), a sweep along the top of the ice cliff, the drop to
// the fjord shore (the second), the hairpin and a spiral on the sea ice. Named for its region (Moses, 21 Oct 2026).
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'alaska-tidewater-run',
  name: 'Alaska Tidewater Run',
  family: 'peak',
  difficulty: 'extreme',
  description: 'A wide glacier flowing to the sea under the northern lights: a jump over a crevasse, a sweep along the top of the calving ice cliff, the drop to the fjord shore and a spiral on the sea ice.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night-northern-lights',
  variants: ['snow'],
  peak: { palette: 'alaska' },
  coaster: { style: 'alpine', colours: { support: '#7a8088', rail: '#e4ecf4', tie: '#4a5058' } },
  signature: 'The crevasse jump',
  tvCameras: [
    { section: 'The crevasse jump', at: 0.75, side: 'left', distance: 10, height: 12 },
    { section: 'Sea-ice spiral', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'ski-plane', type: 'ski-plane', gate: 'trapdoor', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'calving-ice' },
  designChanges: [
    'Built from the classic opening and the tidewater layout made for this track (L103): a long glacier sweep (a peg), the jump over a crevasse (the first big feature, Moses\'s rule of 27 Oct 2026: the proven boost-pad jump, the third and last track the kit allows one), a sweep along the top of the ice cliff, the drop to the fjord shore (the second), the hairpin, a spiral on the sea ice, a sweep along the fjord shore (a peg) and the run-in.',
    'The jump\'s launch pad is the one exception to the Peaks plan\'s "no boost pads": it is part of the proven jump (every marble clears it at the pad\'s minimum speed).',
  ],
  opening: opening('classic', {
    names: { plunge: 'Down the ramp' },
  }),
  sections: layout('tidewater', {
    costumes: { slalom: 'serac', peg: 'serac', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      glacier: { peak: { zone: 'ice' } },
      jumpStraight: { peak: { zone: 'ice' } },
      cliffTop: { peak: { zone: 'ice' }, landmarks: [{ name: 'calving-ice', at: 0.5, side: 'right', distance: 60 }] },
      fjordDrop: { peak: { zone: 'rock' } },
      brakingStraight: { peak: { zone: 'rock' } },
      hairpin: { peak: { zone: 'rock' } },
      seaIce: { peak: { zone: 'snow' } },
      fjordS: { peak: { zone: 'snow' } },
      lastStraight: { name: 'Along the fjord', peak: { zone: 'snow' } },
    },
  }),
});
