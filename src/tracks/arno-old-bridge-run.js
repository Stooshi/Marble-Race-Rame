'use strict';

// Arno Old Bridge Run (Moses, 13 Nov 2026: five more Rivers tracks, the pack filled to 20; one of the two Wild ones).
// The Arno in Florence on a summer evening: down from a stone tower, through a chicane in the old town, down to the river and
// the stepped weir that crosses the river, along its quays, a bend below the hill, then through the old bridge with
// its shops along the top (the track's big feature: a splitter, the field dividing between two of its arches round
// the middle pier and meeting again past it), S-bends past the palaces, a drop to the water, the hairpin by the
// rowing boats, a sweep under the hill and the last straight. Generic Tuscan architecture only; no names on anything.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, splitter, runIn, peg, slalom, steps,
} = require('../trackKit');

module.exports = track({
  slug: 'arno-old-bridge-run',
  name: 'Arno Old Bridge Run',
  family: 'river',
  difficulty: 'hard',
  description: 'The Arno in Florence on a summer evening: down from a stone tower, through the old town, down the stepped weir and along the quays, then through the arches of the old bridge with its shops along the top, past the palaces and the rowing boats to the last straight.',
  surface: 'ice',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  river: { palette: 'arno', side: 'right', width: 110, banks: 'quay', slope: 0.6, gap: 10 },
  coaster: { colours: { support: '#8a7a5a', rail: '#f2e6cc', tie: '#5a4a36' } },
  signature: 'Through the old bridge',
  tvCameras: [
    // (Just past the bridge, looking back at the field coming out of its two arches.)
    { section: 'Past the palaces', at: 0.15, side: 'left', distance: 10, height: 11 },
    { section: 'Under the hill', at: 0.3, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'stone-weir', type: 'castle-tower', gate: 'barrier', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: { landmark: 'rowing-boats' },
  opening: opening('chicane-start', {
    side: 'left',
    costumes: { block: 'cafe-table', slalom: 'street-lamp', peg: 'mooring-pole' },
    names: { plunge: 'Down from the tower', chicane: 'Through the old town' },
    dress: { plunge: { height: 0, river: 'none', scenery: ['balcony-houses'] }, chicane: { height: 0, river: 'none', scenery: ['balcony-houses'] } },
  }),
  sections: [
    { name: 'Down to the river', shape: plunge(32, { grade: 0.3, from: 0.14 }), height: 0, river: 'right' },
    {
      name: 'The weir steps', shape: straight(75, { grade: 0.16 }), height: 0, river: 'right',
      landmarks: [{ name: 'stone-weir', at: 0.55, river: true, distance: 0 }],
      features: [steps({ from: 0.15, to: 0.8, count: 5, drag: 0.015 })],
    },
    {
      name: 'Along the quays', shape: straight(80, { grade: 0.16 }), height: 0, river: 'right', scenery: ['city-quay'],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.2, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.32, line: 'left' }), slalom({ costume: 'river-stake', from: 0.45, to: 0.85, count: 4, loss: 0.2 })],
    },
    { name: 'Below the hill', shape: sweep({ side: 'right', radius: 75, degrees: 90, grade: 0.15 }), height: 0, river: 'right', billboards: 1 },
    {
      name: 'Through the old bridge',
      shape: splitter({ side: 'right', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: -0.6, left: { drag: 0.8, scrub: 0.8 }, right: { drag: 1.8, scrub: 1.8 } } }),
      around: 'shop-bridge', height: 8, river: 'under',
      obstacles: [peg({ costume: 'mooring-pole', at: 0.06, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.14, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.21, line: 'center' })],
    },
    {
      name: 'Past the palaces', shape: sBends({ first: 'left', radius: 65, degrees: 75, grade: 0.18 }), height: 0, river: 'right', billboards: 2,
      scenery: ['balcony-houses'],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.5, line: 'center' })],
    },
    { name: 'Drop to the river', shape: plunge(45, { grade: 0.28, from: 0.15 }), height: 0, river: 'right' },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 0, river: 'right' },
    { name: 'Rowing club hairpin', shape: hairpin({ side: 'left' }), height: 0, river: 'none', landmarks: [{ name: 'rowing-boats', at: 0.5, side: 'right', distance: 30 }] },
    {
      name: 'Under the hill', shape: sweep({ side: 'right', radius: 70, degrees: 120, grade: 0.15 }), height: 0, river: 'left',
      obstacles: [slalom({ costume: 'river-stake', from: 0.25, to: 0.75, count: 5, loss: 0.2 })],
    },
    {
      name: 'Last straight', shape: straight(60, { grade: 0.15 }), height: 0, river: 'left', billboards: 2,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'left' })],
    },
    { name: 'Finish', shape: runIn(), height: 0, river: 'left' },
  ],
});
