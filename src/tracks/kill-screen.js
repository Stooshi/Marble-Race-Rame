'use strict';

// Kill Screen: maze games, and the legendary point where the most famous one breaks at level 256.
// A huge neon maze of our own seen from above: the screen splits, the left chute through the clean
// maze and the right through a glitched, scrambled half, merging two seconds later; a tight maze
// corner comes early, then long corridors over rows of glowing dots, through maze walls, round a
// glitched tower and through more pixel walls past a bonus prize to the level sign at 256.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kill-screen',
  name: 'Kill Screen',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A huge neon maze at level 256: the screen splits into a clean half and a glitched half, a tight maze corner early, then long corridors over glowing dots, through maze walls and through pixel walls to a level sign breaking into noise.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'maze', finish: 'LEVEL 256' },
  signature: 'Dot corridor',
  start: { landmark: 'neon-maze', gate: 'barrier', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'level-sign' },
  designChanges: [
    'Built from the split start (the screen splits: the left chute runs past the clean maze, the right past the glitch blocks, merging about two seconds later) and maze corridors, the library layout made for it: the maze corner (the hairpin) early, then long corridors: one over a row of glowing dots (low bumps), S-bends, one through maze walls (slalom gates), a drop, a spiral round a glitched tower, one through pixel walls, a sweep and a bonus prize (an original pixel pear on a pedestal) and pixel walls on the run to the finish.',
    'The dots stay lit (bumps that wink out would race differently once gone). The glitch blocks are the pile-up at the start and stand still; one in a corridor left marbles stuck behind it, so that corridor has pixel walls instead. The level counter is the level sign past the finish, its right half breaking into pixel noise, and the high-score table reads LEVEL 256 for the winner; the finish arch itself is the standard one.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'glitch-block', slalom: 'pixel-wall' },
    names: { plunge: 'Into the maze', chutes: 'Clean half, glitched half', after: 'Out of the split' },
  }),
  sections: layout('maze-corridors', {
    bumps: 'dots',
    costumes: { swipe: 'joystick', slalom: 'pixel-wall', parked: 'bonus-prize', peg: 'pixel-wall' },
    dress: {
      brakingStraight: { name: 'Run to the maze corner' },
      hairpin: { name: 'Maze corner' },
      corridor1: { name: 'Dot corridor', landmarks: [{ name: 'neon-maze', at: 0.5, side: 'left', distance: 36 }] },
      sBends: { name: 'Maze bends' },
      corridor2: { name: 'Maze walls' },
      drop: { name: 'Down a level' },
      spiral: { name: 'Glitch spin', around: 'glitch-tower' },
      corridor3: { name: 'Glitch corridor' },
      sweep: { name: 'Long corridor' },
      lastStraight: { name: 'Bonus prize run' },
    },
  }),
});
