'use strict';

// Joystick Spins: the coin-op era itself, a giant 1980s arcade hall at night. The marbles drop like
// coins through a giant coin slot and spiral down its funnel into the machine, then take wide
// sweeps past the rows of cabinets past token-pusher shelves, a drop through pixel walls,
// the claw machine's claw at the hairpin and the air-hockey tables on the run to the high-score
// table, by the prize counter.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'joystick-spins',
  name: 'Joystick Spins',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A giant 1980s arcade hall at night: dropped like coins down the coin slot, token pushers, wide sweeps past the rows of cabinets, the claw machine at the hairpin and the air-hockey tables to the high-score table.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'coin-op', finish: 'NEW HIGH SCORE!' },
  signature: 'Past the cabinet rows',
  tvCameras: [
    { section: 'Past the cabinet rows', at: 0.8, side: 'right', distance: 6, height: 8 },
    { section: 'Claw machine hairpin', at: 0.4, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'arcade-hall', gate: 'trapdoor', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'prize-counter' },
  designChanges: [
    'The design\'s "Insert Coin" (A2), under the name in the variety table. Built from the funnel drop (the giant coin slot\'s funnel, past a pile-up of token-pusher shelves and a slalom of pixel walls) and cabinet rows, the library layout made for it: wide sweeps past the rows of cabinets with a pixel wall in the aisle between them, a slalom drop through pixel walls, the claw machine\'s claw at the hairpin, a third sweep, S-bends and the air-hockey tables and pixel walls on the run to the high-score table.',
    'The token pushers are the pile-up at the foot of the coin slot and stand still (a block that slides would race differently from one race to the next); a block in the aisle left marbles stuck behind it, so the aisle has a pixel wall instead. The claw swings across the hairpin as its swipe. The ticket streams are scenery at the prize counter past the finish, where the high-score table shows the winner\'s initials.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'token-pusher', slalom: 'pixel-wall' },
    names: { plunge: 'Coin slot' },
  }),
  sections: layout('cabinet-rows', {
    costumes: { slalom: 'pixel-wall', swipe: 'claw-arm', parked: 'air-hockey', peg: 'pixel-wall' },
    dress: {
      row1: { name: 'Past the cabinet rows', landmarks: [{ name: 'cabinet-row', at: 0.5, side: 'right', distance: 30 }] },
      aisle: { name: 'Token pusher aisle' },
      row2: { name: 'Second row', landmarks: [{ name: 'cabinet-row', at: 0.5, side: 'left', distance: 30 }] },
      drop: { name: 'Pixel wall drop' },
      brakingStraight: { name: 'Run to the claw' },
      hairpin: { name: 'Claw machine hairpin', around: 'claw-tower' },
      row3: { name: 'Back past the cabinets' },
      sBends: { name: 'Change machine bends' },
      lastStraight: { name: 'Air hockey run' },
    },
  }),
});
