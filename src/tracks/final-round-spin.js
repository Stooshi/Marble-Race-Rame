'use strict';

// Final Round Spin: fighting games. A neon rooftop stage in a rainy pixel city, a crowd of
// our own pixel spectators behind the barriers. The field circles out of the banked first turn
// like two fighters sizing each other up; each splitter is a bracket matchup, the halves
// rejoining like winners advancing; punching bags swing at the hairpin, crates line the
// drop, and the dented bonus-stage car waits on the run to the health-bar gantry.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'final-round-spin',
  name: 'Final Round Spin',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A neon rooftop stage in a rainy pixel city: a banked first turn like fighters circling, two splitters as bracket matchups, punching bags at the hairpin, a dented bonus-stage car and a crowd cheering to the health-bar gantry.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'fighter', finish: 'PERFECT!' },
  signature: 'The final',
  start: { landmark: 'rooftop-stage', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'health-bars' },
  designChanges: [
    'The design\'s "Final Round" (A5), under the name in the variety table. Built from the banked first turn (the fighters circling, past wooden crates and rope posts) and bracket splits, the library layout made for it: S-bends into the first splitter (the semi-finals), the hairpin under a swinging punching bag, a drop through rope posts into the second splitter the other way (the final), a spiral round a rooftop water tower and the dented bonus-stage car on the run to the finish.',
    'The crates are the pile-up at the start and stand still. The health-bar gantry stands past the finish, the bars full on one side and empty on the other, and the high-score table reads PERFECT! for the winner; the finish arch itself is the standard one. The fighters are nowhere: the crowd, the city and the car are our own, with no famous characters or stages.',
  ],
  opening: opening('banked-turn', {
    costumes: { block: 'wooden-crate', slalom: 'rope-post' },
    names: { plunge: 'Round one', turn: 'Circling' },
    dress: { turn: { landmarks: [{ name: 'pixel-crowd', at: 0.5, side: 'right', distance: 22 }] } },
  }),
  sections: layout('bracket-splits', {
    costumes: { swipe: 'punching-bag', slalom: 'rope-post', parked: 'bonus-car', peg: 'rope-post' },
    dress: {
      sBends: { name: 'Rooftop bends', landmarks: [{ name: 'pixel-crowd', at: 0.5, side: 'left', distance: 24 }] },
      splitter1: { name: 'Semi-finals' },
      brakingStraight: { name: 'Run to the bag' },
      hairpin: { name: 'Punching bag turn' },
      outOfHairpin: { name: 'Down a floor' },
      splitter2: { name: 'The final' },
      spiral: { name: 'Water tower spin', around: 'water-tower' },
      lastStraight: { name: 'Bonus stage' },
    },
  }),
});
