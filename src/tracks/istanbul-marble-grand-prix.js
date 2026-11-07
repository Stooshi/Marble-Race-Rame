'use strict';

// Istanbul Marble Grand Prix, its own layout (Moses, 6 Nov 2026; claude/grand-prix-relayout-plan.md). Until then it
// raced the same race as Dubai Marble Grand Prix in practice (the Grand Prix recipe of 10 Oct 2026). Now the crest
// start from the Galata Tower, the Golden Horn S-bends, the pegs across the Galata Bridge, the Grand Bazaar
// spiral (the big feature: down round the clock tower; no jump, Moses: the three jump tracks are
// used), the Topkapı hairpin, the Bosphorus sweep and the Ortaköy S-bends to the Bosphorus Bridge. Its records
// started again with the new layout (tracks.records_since).
const {
  track, opening, straight, sBends, sweep, spiral, hairpin, runIn, peg, slalom, swipe, parked, rumble,
} = require('../trackKit');

module.exports = track({
  slug: 'istanbul-marble-grand-prix',
  name: 'Istanbul Marble Grand Prix',
  difficulty: 'extreme',
  description: 'From the Galata Tower over a crest and down to the Golden Horn, across the Galata Bridge, spiralling down round the clock tower by the Grand Bazaar, past Topkapı Palace and along the Bosphorus to the bridge.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { groupsEvery: 450 }, // (the small groups of spectators further apart than usual: the drawing budget)
  signature: 'Grand Bazaar spiral',
  tvCameras: [
    // (At the foot of the spiral, looking back up it.)
    { section: 'Out of the bazaar', at: 0.3, side: 'right', distance: 6, height: 5 },
  ],
  billboardFrame: 'plain',
  start: { landmark: 'galata-tower', scenery: ['colourful-houses'], gate: 'barrier', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'bosphorus-bridge', scenery: ['grandstand'] },
  designChanges: [
    'A peg, a short slalom and a peg in the Golden Horn S-bends: without them the first 20 seconds raced through the same sequence as Sognefjord\'s and Chiang Mai\'s (the crest start into S-bends).',
    'A new layout (6 Nov 2026): until then Istanbul raced the same race as Dubai Marble Grand Prix in practice (the Grand Prix recipe). No splitter now.',
    'The crest start (the Galata plunge, its pile-up and slalom, then over a rounded crest): no other Grand Prix track opens this way, and its start shots (from the side, then overhead) are its own.',
    'The big feature is the Grand Bazaar spiral: a turn and a half down round the clock tower, open to the sky. Drawn first inside the bazaar\'s vaulted tunnel, its roof came within 0.5 m of the follow camera on the tight turns, and market stalls round it blocked the camera, so it is open, as the plan allowed. Moses\'s other idea, a peg-field descent under Galata, is a drop (Stockholm\'s feature) and ran too slow (59.6 s winner).',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { plunge: 'Galata plunge', climb: 'Galata crest', drop: 'Down to the Golden Horn' },
    dress: { plunge: { scenery: ['colourful-houses'] } },
  }),
  sections: [
    {
      name: 'Golden Horn S-bends', shape: sBends({ first: 'left', radius: 55, degrees: 110, grade: 0.13 }), billboards: 3,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.3, to: 0.6, count: 3, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.75, line: 'right' })],
      landmarks: [{ name: 'harbour', at: 0.5, side: 'right', distance: 26 }],
    },
    {
      name: 'Galata Bridge', shape: straight(40, { grade: 0.15 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.6, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.85, line: 'center' })],
    },
    { name: 'Grand Bazaar spiral', shape: spiral({ side: 'right', radius: 42, turns: 1.5, grade: 0.2 }), around: 'clocktower' },
    { name: 'Out of the bazaar', shape: straight(40, { grade: 0.13 }), obstacles: [slalom({ costume: 'traffic-cone', from: 0.2, to: 0.9, count: 3, loss: 0.15 })] },
    { name: 'Topkapı hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    {
      name: 'Bosphorus sweep', shape: sweep({ side: 'right', radius: 85, degrees: 120, grade: 0.09 }), billboards: 3,
      landmarks: [{ name: 'hagia-sophia', at: 0.2, side: 'left', distance: 45 }, { name: 'blue-mosque', at: 0.55, side: 'left', distance: 45 }],
    },
    { name: 'Ortaköy S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 70, grade: 0.13 }) },
    {
      name: 'Bosphorus straight', shape: straight(60, { grade: 0.18 }), scenery: ['grandstand'],
      obstacles: [parked({ costume: 'simit-cart', at: 0.2, side: 'left', length: 6 })],
      features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
      landmarks: [{ name: 'harbour', at: 0.5, side: 'right', distance: 26 }],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
