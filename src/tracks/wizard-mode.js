'use strict';

// Wizard Mode: a castle-siege pinball table, the final boss of pinball. Off the crest of the
// castle hill past a bank of castle-gate drop targets, a sweep round the walls, the siege route
// splitting in two, round the keep, over the lowered drawbridge across the moat, a flipper at
// the hairpin and a slalom of bumper posts to the flippers, where the display reads WIZARD MODE LIT.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'wizard-mode',
  name: 'Wizard Mode',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A castle-siege pinball table: off the castle hill past the castle-gate drop targets, a siege route splitting and rejoining, round the keep and over the lowered drawbridge across the moat to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'castle', display: 'WIZARD MODE', finish: 'WIZARD MODE LIT' },
  signature: 'Drawbridge',
  start: { landmark: 'siege-castle', gate: 'barrier', shots: { countdown: 'side', launch: 'overhead' } },
  finish: {},
  designChanges: [
    'Built from the crest start (off the castle hill: a pile-up of castle-gate drop targets, a slalom of bumper posts, a climb and over the crest) and siege routes, the library layout made for this table: a sweep round the walls, the siege route (a splitter), a spiral round the keep, the drawbridge over the moat as the run to the hairpin, the hairpin late with a flipper, a slalom drop through the bumper posts and the run to the flippers.',
    'One siege route, not two: a second splitter (after the hairpin, before or after S-bends, or before the hairpin) could not be balanced, the leaders always taking one channel, so the table swaps to the nearest pairing that passes, as the design allows. Its layout is proven with the crest start, the opening the table races.',
    'The drop targets stand in the crest start\'s pile-up; they knock marbles aside like any block and stay up (sinking as they are hit would need hit times the replay does not keep).',
    'The catapults and the knights stand round the castle as scenery; the hairpin\'s swipe is a flipper, flapping on its fixed timetable like every swipe.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'drop-targets', slalom: 'bumper-post' },
    names: { plunge: 'Castle hill', climb: 'Up to the walls', drop: 'Over the crest' },
  }),
  sections: layout('siege-routes', {
    costumes: { swipe: 'flipper-bat', slalom: 'bumper-post', peg: 'bumper-post' },
    dress: {
      approach: { name: 'Round the walls' },
      splitter: { name: 'Siege route' },
      spiral: { name: 'Round the keep', around: 'castle-keep' },
      brakingStraight: { name: 'Drawbridge', bridge: 'wood' },
      hairpin: { name: 'Flipper hairpin' },
      outOfHairpin: { name: 'Through the bumpers' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
