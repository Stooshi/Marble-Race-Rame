'use strict';

// Arcade Spins: side-scrolling beat-'em-ups, played shoulder to shoulder with a friend. A neon
// pixel downtown at night: the field bursts out of a subway station onto the street, past oil
// drums and street lamps, GO arrows flashing it onward, a co-op lane splitting off and
// rejoining like player 1 and player 2, a swinging street sign at the hairpin, a spiral round
// a neon plaza, trash cans and roast-chicken crates to the CONTINUE? clock.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'arcade-spins',
  name: 'Arcade Spins',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A neon pixel downtown at night: out of a subway station onto the street, GO arrows flashing, a co-op lane for player 1 and player 2, a swinging street sign at the hairpin and roast-chicken crates to the CONTINUE? clock.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'downtown', finish: 'CONTINUE? YES' },
  signature: 'Co-op lane',
  start: { landmark: 'subway-entrance', gate: 'trapdoor', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'continue-clock' },
  designChanges: [
    'The design\'s "Continue?" (A7), under the name in the variety table. Built from the tunnel launch (out of a subway station: down the stairs past oil drums and through the tiled subway tunnel onto the street) and co-op street, the library layout made for it: a street run with street lamps, S-bends into the co-op lane (the splitter: player 1 one side, player 2 the other), a slalom drop, the hairpin under a swinging street sign, a spiral round a neon plaza, a sweep, more S-bends and trash cans and roast-chicken crates (low bumps) on the run to the finish. Giant GO arrows stand along the way.',
    'The oil drums are the pile-up at the start and stand still. The CONTINUE? clock stands past the finish, frozen at 9 with YES under it, and the high-score table says CONTINUE? YES for the winner; the finish arch itself is the standard one. The city, its shops and its signs are our own, with no famous characters or games.',
  ],
  opening: opening('tunnel-launch', {
    tunnel: 'subway',
    costumes: { block: 'oil-drum', slalom: 'street-lamp' },
    names: { portal: 'Subway stairs', tunnel: 'Subway tunnel' },
  }),
  sections: layout('co-op-street', {
    bumps: 'chicken',
    costumes: { swipe: 'street-sign', slalom: 'street-lamp', parked: 'trash-cans', peg: 'street-lamp' },
    dress: {
      streetRun: { name: 'Main street', landmarks: [{ name: 'storefronts', at: 0.5, side: 'left', distance: 24 }] },
      sBends1: { name: 'Downtown bends', landmarks: [{ name: 'go-arrow', at: 0.5, side: 'right', distance: 16 }] },
      splitter: { name: 'Co-op lane' },
      drop: { name: 'Down the hill' },
      brakingStraight: { name: 'Run to the sign' },
      hairpin: { name: 'Street sign turn' },
      spiral: { name: 'Neon spin', around: 'neon-plaza' },
      sweep: { name: 'Back street', landmarks: [{ name: 'storefronts', at: 0.5, side: 'right', distance: 26 }] },
      sBends2: { name: 'Last bends', landmarks: [{ name: 'go-arrow', at: 0.5, side: 'left', distance: 16 }] },
      lastStraight: { name: 'Chicken run' },
    },
  }),
});
