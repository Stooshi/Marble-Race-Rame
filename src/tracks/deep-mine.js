'use strict';

// Deep Mine: Block Series track 4. Underground, lit by lamps and glowing gem seams: from the mine
// entrance down through a launch tunnel, along the cart rails, through tight bends and a dark
// gallery past the cart depot, round the hairpin, then a plunge down the shaft under its
// headframe and along the lower gallery to the depot.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'deep-mine',
  name: 'Deep Mine',
  family: 'block',
  difficulty: 'extreme',
  description: 'Underground in a mine of stone blocks, lit by lamps and glowing gem seams: through a launch tunnel, along the cart rails and through a dark gallery, then a plunge down the shaft and along the lower gallery to the cart depot.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'cave',
  block: { world: 'mine' },
  coaster: { style: 'blocks', colours: { support: '#6b6f78', rail: '#d8d2c4', tie: '#3a3d44' } },
  signature: 'Down the shaft',
  start: { landmark: 'mine-entrance', type: 'elevator', gate: 'stalls', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'cart-depot' },
  designChanges: [
    'Built from the tunnel launch (a mine tunnel) and the mine shaft, the library layout made for this track: a mogul straight (the sleepers), tight S-bends, a peg straight, the hairpin, a sweep with a boost, the plunge down the shaft, a second peg straight and a second sweep.',
    'Cave light: a dark world lit by the lamps, the gem seams and the rims\' edge light; the marbles glow in their own colours.',
  ],
  opening: opening('tunnel-launch', {
    tunnel: 'mine',
    costumes: { block: 'voxel-cube', slalom: 'gem-pillar' },
    names: { portal: 'Into the mine', tunnel: 'Launch tunnel' },
  }),
  sections: layout('mine-shaft', {
    costumes: { slalom: 'gem-pillar', peg: 'gem-pillar', swipe: 'block-crane', parked: 'ore-cart' },
    dress: {
      railRun: { name: 'Cart rails', landmarks: [{ name: 'gem-seam', at: 0.5, side: 'left', distance: 8 }] },
      tightBends: { name: 'Tight bends' },
      cartRun: { name: 'Dark gallery', tunnel: 'mine', billboards: 0 },
      brakingStraight: { name: 'Run to the hairpin', landmarks: [{ name: 'cart-depot', at: 0.5, side: 'right', distance: 12 }] },
      hairpin: { name: 'Crane hairpin' },
      gallerySweep: { name: 'Gem gallery', landmarks: [{ name: 'gem-seam', at: 0.5, side: 'right', distance: 10 }] },
      shaft: { name: 'Down the shaft', landmarks: [{ name: 'shaft-headframe', at: 0.2, side: 'left', distance: 8 }] },
      lowerGallery: { name: 'Lower gallery', billboards: 1 },
      sweep2: { name: 'Last gallery', landmarks: [{ name: 'gem-seam', at: 0.5, side: 'left', distance: 10 }] },
      lastStraight: { name: 'Run to the depot' },
    },
  }),
});
