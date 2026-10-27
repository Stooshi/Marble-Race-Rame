'use strict';

// Bullet Hell: space shooters, from the first alien-formation games to the screen-filling
// shooters the community calls bullet hell. Deep space over a planet's curve: the field drops
// in rows like a descending alien formation, races through a curtain of laser beams, spirals
// like the bullet patterns round a ringed planet and a laser turret, over shield bunkers to
// the finish under the mothership.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'bullet-hell',
  name: 'Bullet Hell',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'Deep space over a planet\'s curve: dropped in rows like an alien formation, through a curtain of laser beams, spiralling like bullet patterns round a ringed planet and a laser turret, over shield bunkers to the mothership.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'space', finish: 'BOSS DEFEATED!' },
  signature: 'Laser curtain',
  tvCameras: [
    { section: 'Laser curtain', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Bullet spiral', at: 0.8, side: 'right', distance: 6, height: 8 },
  ],
  start: { landmark: 'alien-formation', gate: 'paddle', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'mothership' },
  designChanges: [
    'Built from the staggered drop (the field leaves the gate in five rows, like an alien formation stepping down the screen, past alien blocks and laser pylons) and bullet spirals, the library layout made for it: a sweep, a first spiral round a ringed planet, a straight through the laser curtain, a slalom drop, the hairpin under a laser turret\'s swinging cannon, a second spiral the other way round the turret, S-bends and shield bunkers (low bumps) on the run to the mothership.',
    'The alien blocks are the pile-up at the start and stand still (a block that moves would race differently from one race to the next). The shield bunkers stay whole: bumps that crumble away would race differently once gone. The mothership hovers past the finish and the high-score table reads BOSS DEFEATED! for the winner; the finish arch itself is the standard one. Every alien, ship and planet is our own design.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'alien-block', slalom: 'laser-pylon' },
    names: { plunge: 'Formation drop' },
  }),
  sections: layout('bullet-spirals', {
    bumps: 'bunkers',
    costumes: { curtain: 'laser-curtain', slalom: 'laser-pylon', swipe: 'turret-cannon', peg: 'laser-pylon' },
    dress: {
      sweep: { name: 'Over the planet', landmarks: [{ name: 'alien-formation', at: 0.5, side: 'right', distance: 44 }] },
      spiral1: { name: 'Ring spiral', around: 'ringed-planet' },
      curtainRun: { name: 'Laser curtain' },
      drop: { name: 'Dive' },
      brakingStraight: { name: 'Run to the turret' },
      hairpin: { name: 'Turret turn' },
      spiral2: { name: 'Bullet spiral', around: 'laser-turret' },
      sBends: { name: 'Dodge bends' },
      lastStraight: { name: 'Shield bunkers' },
    },
  }),
});
