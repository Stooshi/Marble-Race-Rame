'use strict';

// Wyrmwood Hollow Marble Grand Prix, its own layout (Moses, 7 Nov 2026: four more Grand Prix tracks re-laid the same
// way as Lagos, Istanbul and Sydney; Wyrmwood last, its two features from its own fantasy world). Until then it was
// the Grand Prix recipe of 10 Oct 2026 (the same track as Dubai). Now the field drops clean off the ruined castle's
// rampart into the Ruins S-bends, down the Arch drop through a slalom of broken pillars, banks round the sleeping
// dragon on the Dragon's coil (big feature one, the signature), crosses the chasm on the old stone bridge, rounds the
// Watchtower hairpin, dives down the Wyrm's throat (big feature two: a drop through a tunnel of the old wood's roots, where the wyrm burrowed), sweeps
// along the valley, threads the Ember S-bends and runs to the ruined amphitheatre. Its records started again with the
// new layout (tracks.records_since).
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, swipe, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'wyrmwood-hollow-marble-grand-prix',
  name: 'Wyrmwood Hollow Marble Grand Prix',
  difficulty: 'extreme',
  description: 'Our own valley of ancient ruins where an old dragon sleeps: a clean drop off a ruined castle wall, a banked coil round the sleeping dragon, over a chasm on an old stone bridge, down the wyrm\'s burrow through the roots of the old wood and along the valley to a ruined amphitheatre.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['fog', 'day'],
  grandPrix: { crowd: 'villagers', barrier: 'stone', groupsEvery: 650 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Dragon\'s coil',
  tvCameras: [
    // (Near the end of the coil, looking back round it at the field banking past the sleeping dragon.)
    { section: 'Dragon\'s coil', at: 0.85, side: 'right', distance: 8, height: 10 },
  ],
  billboardFrame: 'banner',
  start: { landmark: 'ruined-castle', gate: 'stalls', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'amphitheatre' },
  designChanges: [
    'A new layout (7 Nov 2026): until then Wyrmwood Hollow was physically the Grand Prix recipe of 10 Oct 2026 (the same track as Dubai Marble Grand Prix). Its old signature, the Dragon hairpin, goes; so do the Statue splitter, the spiral and the boost pad on the Valley sweep.',
    'Two features from its own world: the Dragon\'s coil (big feature one, the signature: a 160° banked turn round the sleeping dragon) and the Wyrm\'s throat (big feature two: a drop through a tunnel of the old wood\'s roots, the wyrm\'s burrow; drawn first as a dragon\'s-mouth tunnel, but the follow camera passed 0.25 m from its jaw where the Valley sweep turns away at its mouth). The Chasm bridge stays, now with two broken pillars on it. No jump: the three jump tracks are used.',
    'The opening a clean drop off the rampart (its first use on a Grand Prix track), so its luck comes later, on the Arch drop: a broken pillar and a slalom of six, no pile-up. With a pile-up there (on a 50 m straight, then on a drop), the marbles it stopped crawled round the coil: 25 s from first to last (18 allowed) and 40 overtakes (60 needed). The coil 160°, not 220°, and steeper (0.16) for the same reason.',
    'The Valley sweep 170° with a pillar and a short slalom, the Amphitheatre run 85 m and two pillars on the bridge: without them the winner took 47 s (target 48–55 s) and the races had 56 overtakes. The Arch drop at 0.3, not 0.4: steeper, the marbles hopped 1.24 m in 1 race in 100 (about 1 m allowed).',
    'Spectator groups every 650 m and no crowd on the Valley sweep: with them, a computer drew 152k triangles in the flyover\'s first frame (150k allowed).',
    'A pillar before the Arch drop\'s slalom: without it the first 20 seconds were too like Volga Port Burst\'s (0.86). Each bend\'s direction chosen out of the 32 ways they could turn so that no stretch runs close under another (the nearest, the start under the finish, 32 m aside).',
  ],
  opening: opening('clean-drop', {
    side: 'right',
    names: { plunge: 'Rampart drop', bends: 'Ruins S-bends' },
  }),
  sections: [
    {
      name: 'Arch drop', shape: plunge(55, { grade: 0.3, from: 0.2 }),
      obstacles: [peg({ costume: 'broken-pillar', at: 0.12, line: 'center' }), slalom({ costume: 'broken-pillar', from: 0.3, to: 0.95, count: 6, loss: 0.3 })],
    },
    {
      name: 'Dragon\'s coil', shape: sweep({ side: 'right', radius: 60, degrees: 160, grade: 0.16 }),
      landmarks: [{ name: 'sleeping-dragon', at: 0.5, side: 'right', distance: 26 }],
    },
    {
      name: 'Chasm bridge', shape: straight(50, { grade: 0.12 }), bridge: 'stone',
      obstacles: [peg({ costume: 'broken-pillar', at: 0.3, line: 'left' }), peg({ costume: 'broken-pillar', at: 0.6, line: 'right' })],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'broken-pillar', at: 0.3, line: 'right' })],
    },
    { name: 'Watchtower hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'dragon-tail', side: 'high' })] },
    {
      name: 'Wyrm\'s throat', shape: plunge(45, { grade: 0.28, from: 0.16 }), tunnel: 'roots',
      obstacles: [slalom({ costume: 'broken-pillar', from: 0.3, to: 0.9, count: 4, loss: 0.3 })],
    },
    {
      name: 'Valley sweep', shape: sweep({ side: 'right', radius: 80, degrees: 170, grade: 0.1 }), billboards: 2,
      obstacles: [peg({ costume: 'broken-pillar', at: 0.2, line: 'right' }), slalom({ costume: 'broken-pillar', from: 0.45, to: 0.8, count: 3, loss: 0.15 })],
      landmarks: [{ name: 'dragon-mountain', at: 0.5, side: 'left', distance: 260 }],
    },
    {
      name: 'Ember S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 85, grade: 0.16 }), billboards: 2,
      obstacles: [peg({ costume: 'broken-pillar', at: 0.2, line: 'center' }), slalom({ costume: 'broken-pillar', from: 0.4, to: 0.75, count: 3, loss: 0.15 }), peg({ costume: 'broken-pillar', at: 0.9, line: 'left' })],
    },
    {
      name: 'Amphitheatre run', shape: straight(85, { grade: 0.15 }), billboards: 2, scenery: ['grandstand'],
      obstacles: [curtain({ costume: 'battle-banners', at: 0.2, side: 'left' }), peg({ costume: 'broken-pillar', at: 0.45, line: 'right' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
