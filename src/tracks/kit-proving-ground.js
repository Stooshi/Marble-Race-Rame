'use strict';

// Kit Proving Ground: the track kit's own test track. It is never raced for
// real (it is not in the database); it shows every kit part working, at the
// preview link /preview/physics?track=kit-proving-ground. It wears a costume
// of every kind the library has, on every kind of obstacle.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter,
  waterfall, block, pileUp, curtain, swipe, parked, slalom, peg, bump, boost, brake, moguls, steps,
} = require('../trackKit');

module.exports = track({
  slug: 'kit-proving-ground',
  name: 'Kit Proving Ground',
  difficulty: 'extreme',
  description: 'The track kit\'s test track: every kit part on one run.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset', 'midnight-sun', 'night-northern-lights', 'fog', 'snow', 'rain'],
  start: { landmark: 'mountain-hut' },
  finish: { landmark: 'church' },
  sections: [
    { name: 'Summit plunge', shape: plunge(80, { grade: 0.8 }), obstacles: [pileUp({ costume: 'panda' })] },
    { name: 'S-bends', shape: sBends({ first: 'left' }), features: [bump()], tunnel: 'ice-cave' },
    { name: 'Gate run', shape: plunge(50, { grade: 0.3 }), obstacles: [slalom({ from: 0.2, to: 0.9 })] },
    { name: 'Mogul field', shape: straight(45, { grade: 0.2 }), features: [moguls({ from: 0.15, to: 0.85, count: 4 })], billboards: 1, figures: ['skier', 'snowboarder', 'skier'] },
    {
      name: 'Rock splitter', shape: splitter({ side: 'left' }), around: 'big-rock',
      features: [boost({ at: 0.15 }), brake({ at: 0.3 })],
    },
    {
      name: 'Bay sweep', shape: sweep({ side: 'right', degrees: 100 }), features: [boost({ at: 0.06, l: -0.15, halfWidth: 2.2 })], billboards: 1, billboardFrame: 'column',
      overhead: ['gondola'], landmarks: [{ name: 'lighthouse', side: 'left', at: 0.6 }],
    },
    { name: 'Pool', shape: straight(30, { grade: 0.12 }), surface: 'water', billboards: 1, billboardFrame: 'wood' },
    { name: 'Falls', shape: waterfall(35, { grade: 0.5, curtain: true }), surface: 'water' },
    {
      name: 'Harbour straight', shape: straight(45, { grade: 0.18 }), bridge: 'wood',
      obstacles: [parked({ costume: 'ore-cart', at: 0.38, side: 'left' }), peg({ costume: 'go-stone', at: 0.8, line: 'right' })],
    },
    { name: 'Steps', shape: straight(40, { grade: 0.15 }), features: [steps({ from: 0.1, to: 0.8, count: 5 })], surface: 'stone' },
    { name: 'Drop to the hairpin', shape: straight(45, { grade: 0.2 }), billboards: 1, billboardFrame: 'crates', figures: ['spectator', 'reindeer', 'spectator'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'elephant', at: 0.37 })] },
    {
      name: 'Out of the hairpin', shape: plunge(60, { grade: 0.24 }), tunnel: 'mine',
      obstacles: [curtain({ costume: 'zebras', at: 0.4, side: 'right' })],
    },
    { name: 'Spiral', shape: spiral({ side: 'right' }) },
    { name: 'Dragon', shape: straight(40, { grade: 0.26 }), tunnel: 'dragon' },
    {
      name: 'Final plunge', shape: plunge(70),
      obstacles: [block({ costume: 'camel', at: 0.4, size: 'large', line: -0.1 })],
      features: [bump({ at: 0.85 })],
      billboards: 1, billboardFrame: 'led',
    },
  ],
});
