'use strict';

// Sky Islands: Block Series track 11. Islands of cubes floating over a sea of cloud, waterfalls
// pouring off their edges: from a cottage at the edge of the first island, over block bridges
// from island to island, round a spin on the second, down a waterfall off the last and on to a
// garden island at the end.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'sky-islands',
  name: 'Sky Islands',
  family: 'block',
  difficulty: 'extreme',
  description: 'Islands of cubes floating over a sea of cloud, waterfalls pouring off their edges: over block bridges from island to island, round a spin, down a waterfall off the last island to a garden at the end.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'sky' },
  coaster: { style: 'blocks', colours: { support: '#8a7a64', rail: '#f4f2ec', tie: '#5a4a3a' } },
  signature: 'Second bridge',
  start: { landmark: 'island-house', type: 'cliff', gate: 'paddle', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'island-garden' },
  designChanges: [
    'Built from the classic start (a steep plunge off the island\'s edge, a pile-up, a slalom) and the island hops, the library layout made for this track: block bridges between the islands, a sweep, a drop, a spin, the hairpin, a waterfall off an island and a last sweep.',
    'The floating islands stand beside the track with nothing holding them up; their waterfalls are see-through (looks only).',
    'The bridges fly at 10 to 12 m on block pillars; round the islands the track runs on the land (flying there too, the pillars\' cubes cost computers 155k triangles, over the 150k budget).',
  ],
  opening: opening('classic', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('island-hops', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      bridge1: { name: 'First bridge', height: 12, landmarks: [{ name: 'floating-island', at: 0.5, side: 'right', distance: 14 }] },
      island1: { name: 'Round the first island', height: 0, landmarks: [{ name: 'big-floating-island', at: 0.5, side: 'right', distance: 45 }] },
      hop: { name: 'Hop down', height: 6 },
      bridge2: { name: 'Second bridge', height: 10, landmarks: [{ name: 'floating-island', at: 0.5, side: 'left', distance: 14 }] },
      island2: { name: 'Island spin', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0, landmarks: [{ name: 'big-floating-island', at: 0.5, side: 'left', distance: 45 }] },
      hairpin: { name: 'Crane hairpin', height: 0 },
      toTheEdge: { name: 'To the edge', height: 0 },
      islandFall: { name: 'Off the island', height: 0 },
      bridge3: { name: 'Third bridge', height: 0, landmarks: [{ name: 'floating-island', at: 0.5, side: 'right', distance: 16 }] },
      sweep2: { name: 'Cloud sweep', height: 3, landmarks: [{ name: 'big-floating-island', at: 0.4, side: 'right', distance: 50 }, { name: 'floating-island', at: 0.8, side: 'left', distance: 22 }] },
      lastStraight: { name: 'Run to the garden', height: 0 },
    },
  }),
});
