'use strict';

// Kit Proving Ground: the track kit's own test track. It is never raced for
// real (it is not in the database); it shows every kit part working, at the
// preview link /preview/physics?track=kit-proving-ground. Costume names stand
// in until the costume library draws them (step 2).
const {
  track, plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter,
  block, pileUp, curtain, swipe, parked, bump, boost, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'kit-proving-ground',
  name: 'Kit Proving Ground',
  difficulty: 'extreme',
  description: 'The track kit\'s test track: every kit part on one run.',
  surface: 'ice',
  lighting: 'day',
  sections: [
    { name: 'Summit plunge', shape: plunge(80, { grade: 0.8 }), obstacles: [pileUp({ costume: 'panda' })] },
    { name: 'S-bends', shape: sBends({ first: 'left' }), features: [bump()] },
    {
      name: 'Rock splitter', shape: splitter({ side: 'left' }), around: 'big-rock',
      features: [boost({ at: 0.15 }), brake({ at: 0.3 })],
    },
    { name: 'Bay sweep', shape: sweep({ side: 'right' }), features: [boost({ at: 0.06, l: -0.15, halfWidth: 2.2 })], billboards: 2 },
    { name: 'Drop to the hairpin', shape: straight(45, { grade: 0.2 }), billboards: 1 },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'fortune-cat', at: 0.37 })] },
    {
      name: 'Out of the hairpin', shape: plunge(75, { grade: 0.24 }),
      obstacles: [curtain({ costume: 'surfer', at: 0.4, side: 'right' })],
      features: [boost({ at: 0.9, kick: 5 })],
    },
    { name: 'Ridge climb', shape: climb(30, { grade: -0.1, after: 0.22 }) },
    { name: 'Spiral', shape: spiral({ side: 'right' }) },
    {
      name: 'Final plunge', shape: plunge(70),
      obstacles: [parked({ costume: 'ore-cart', at: 0.15, side: 'left' }), block({ costume: 'camel', at: 0.5, size: 'large', line: -0.1 })],
      features: [bump({ at: 0.85 })],
      billboards: 1,
    },
  ],
});
