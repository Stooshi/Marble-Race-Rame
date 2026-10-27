'use strict';

// Aturi Arcade: the most famous cheat code in gaming, up, up, down, down, left, right, left,
// right, B, A, in an 8-bit side-scrolling world of our own. The track follows the code: over
// the crest (the first UP), up a second climb onto floating platforms (the second), down a
// slalom drop and a steeper drop past a pixel waterfall (DOWN, DOWN), then bends left, right, left, right, the
// hairpin, a long sweep and the B and A buttons past the finish. Strictly original art.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'aturi-arcade',
  name: 'Aturi Arcade',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'An 8-bit side-scrolling world that follows the famous cheat code: up over the crest and a second climb, down a slalom drop and past a pixel waterfall, bends left, right, left, right, then the B and A buttons and 30 LIVES at the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'side-scroller', finish: '30 LIVES' },
  signature: 'Pixel waterfall',
  tvCameras: [
    { section: 'Pixel waterfall', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Hammer turn', at: 0.4, side: 'left', distance: 6, height: 8 },
  ],
  start: { landmark: 'pixel-hills', gate: 'stalls', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'ba-buttons' },
  designChanges: [
    'The design\'s "Up Up Down Down" (A4), under the name in the variety table. Built from the crest start (the first UP, past coin stacks and pixel trees) and up up down down, the library layout made for it: a run, two climbs with floating platforms (low bumps) on the ledge between them, a slalom drop through pixel trees and a second, steeper drop past a pixel waterfall, two sets of S-bends the same way round (left, right, left, right), the hairpin under a swinging pixel hammer, a long sweep and treasure chests on the run to the finish. Big arrow signs spell the code along the way: up, up at the climbs, down, down at the two drops, left, right, left, right at the bends.',
    'The pixel waterfall pours down a cliff of blocks beside the second drop rather than down the track itself: a water chute there added up to nine draw calls on phones while the whole world is in view from the climbs. The floating platforms are low bumps and stay put. The B and A buttons stand past the finish over a screen flashing 30 LIVES, and the high-score table says it too; the finish arch itself is the standard one. No pipes, no question blocks, no plumbers: every tree, coin, chest and hill is our own.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'coin-stack', slalom: 'pixel-tree' },
    names: { climb: 'Up!', drop: 'Over the top' },
    dress: { climb: { landmarks: [{ name: 'arrow-up', at: 0.5, side: 'left', distance: 16 }] } },
  }),
  sections: layout('up-up-down-down', {
    bumps: 'platforms',
    costumes: { slalom: 'pixel-tree', swipe: 'pixel-hammer', parked: 'treasure-chests', peg: 'pixel-tree' },
    dress: {
      run: { name: 'World 1', landmarks: [{ name: 'pixel-hills', at: 0.5, side: 'right', distance: 34 }] },
      climb1: { name: 'Up again', landmarks: [{ name: 'arrow-up', at: 0.5, side: 'right', distance: 16 }] },
      ledge: { name: 'Floating platforms', landmarks: [{ name: 'floating-platforms', at: 0.5, side: 'left', distance: 26 }] },
      climb2: { name: 'Last climb' },
      drop: { name: 'Down', landmarks: [{ name: 'arrow-down', at: 0.3, side: 'left', distance: 16 }] },
      drop2: { name: 'Pixel waterfall', landmarks: [{ name: 'arrow-down', at: 0.3, side: 'right', distance: 16 }, { name: 'pixel-waterfall', at: 0.6, side: 'left', distance: 22 }] },
      sBends1: { name: 'Left, right', landmarks: [{ name: 'arrow-left', at: 0.25, side: 'right', distance: 18 }, { name: 'arrow-right', at: 0.75, side: 'left', distance: 18 }] },
      sBends2: { name: 'Left, right again', landmarks: [{ name: 'arrow-left', at: 0.25, side: 'right', distance: 18 }, { name: 'arrow-right', at: 0.75, side: 'left', distance: 18 }] },
      brakingStraight: { name: 'Run to the hammer' },
      hairpin: { name: 'Hammer turn' },
      sweep: { name: 'Bonus stage' },
      lastStraight: { name: 'B, A, start' },
    },
  }),
});
