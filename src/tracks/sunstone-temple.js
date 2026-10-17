'use strict';

// Sunstone Temple: Block Series track 13. A desert temple of sand-coloured cubes: from the top of
// the temple steps, through a launch tunnel into the halls, past colonnades of square columns, the
// hairpin in the entrance court, down two long flights of stairs either side of a spiral round the
// courtyard, past the sun disc and out through the temple gate.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'sunstone-temple',
  name: 'Sunstone Temple',
  family: 'block',
  difficulty: 'extreme',
  description: 'A desert temple of sand-coloured cubes: through a tunnel into its halls, past colonnades of square columns, down two long flights of stairs round the courtyard, past the golden sun disc and out through the temple gate.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'temple' },
  coaster: { style: 'blocks', colours: { support: '#b8955e', rail: '#f4ecdc', tie: '#6a5236' } },
  signature: 'The great stairs',
  start: { landmark: 'sun-temple', type: 'stepped-platform', gate: 'barrier', shots: { countdown: 'front', launch: 'low-chase' } },
  finish: { landmark: 'temple-gate' },
  designChanges: [
    'Built from the tunnel launch (into the temple) and the temple halls, the library layout made for this track: a slalom through the entrance hall, the hairpin early, a straight of steps, a spiral and a quarter round the courtyard, a second straight of steps, S-bends and a sweep.',
    'The gate stands on the new stepped platform, of sandstone (looks only).',
  ],
  opening: opening('tunnel-launch', {
    tunnel: 'rock',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { portal: 'Down the temple steps', tunnel: 'Into the halls' },
  }),
  sections: layout('temple-halls', {
    mirror: true,
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      entryHall: { name: 'The entrance hall', landmarks: [{ name: 'temple-colonnade', at: 0.5, side: 'left', distance: 7 }, { name: 'temple-colonnade', at: 0.5, side: 'right', distance: 7 }] },
      brakingStraight: { name: 'Into the court' },
      hairpin: { name: 'Court hairpin' },
      stairs1: { name: 'The great stairs', height: 10, landmarks: [{ name: 'temple-colonnade', at: 0.6, side: 'right', distance: 8 }] },
      courtyard: { name: 'Round the courtyard', height: 10 },
      stairs2: { name: 'The lower stairs' },
      sanctum: { name: 'Past the sanctum', landmarks: [{ name: 'sun-disc', at: 0.5, side: 'left', distance: 9 }] },
      sunSweep: { name: 'Sun sweep' },
      lastStraight: { name: 'Run to the gate' },
    },
  }),
});
