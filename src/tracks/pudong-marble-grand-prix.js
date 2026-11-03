'use strict';

// Pudong Marble Grand Prix (Moses, 3 Nov 2026): a Grand Prix street circuit in Pudong, Shanghai, at dusk turning to
// night. Out of the start lights through a lit underpass into the towers, through the loop with the lit skyline
// behind it (big feature one), along the river with room to overtake, through the pit-lane splitter, round the long
// banked sweep along the Huangpu with the city's lights in the water (big feature two), a hairpin at the ferry pier
// and the waterfront straight to the finish. Our own towers, inspired by the area, never copies of real buildings;
// place names only: no event, circuit, team, sponsor or brand names or logos.
const {
  track, opening, straight, sBends, sweep, splitter, hairpin, runIn, peg, slalom, swipe, parked, rumble, brake, boost, loop,
} = require('../trackKit');

module.exports = track({
  slug: 'pudong-marble-grand-prix',
  name: 'Pudong Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A street race in Pudong at dusk turning to night: through a lit underpass into the towers, a loop with the glittering skyline behind it, the pit lane, and a long banked sweep along the Huangpu with the city lights in the water.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'dusk',
  variants: ['night'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 700 }, // (the small groups of spectators further apart than usual: the towers and the river are the view, and the phone's budget)
  // The Huangpu along the whole circuit on its right, below the street circuit's embankment, on the outside of the long
  // sweep (looks only); dark evening water. The loop's follow camera watches from the river side, looking inland.
  sea: { side: 'right', from: 0, coast: 30, near: '#24345e', far: '#101a38' },
  signature: 'Skyline loop',
  tvCameras: [
    { section: 'Skyline loop', at: 0.85, side: 'right', distance: 10, height: 10 },
    { section: 'Huangpu banked sweep', at: 0.55, side: 'left', distance: 10, height: 12 },
  ],
  billboardFrame: 'led',
  start: { landmark: 'pudong-towers', gate: 'trapdoor', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'pudong-waterfront', scenery: ['grandstand'] },
  designChanges: [
    'The start is the tunnel launch (the field dives into a lit underpass and bursts out among the towers), not the Grand Prix tracks\' usual plunge: the start on screen and the first 20 seconds are this track\'s own.',
    'Big feature one, the loop, stands among the towers with the lit skyline behind it from the follow camera; rough paving at the way into the waterfront S-bends after it bunches the field again, and their pegs and slalom give the overtaking room a loop needs.',
    'The pit-lane splitter comes straight after the waterfront S-bends, as on the other Grand Prix tracks: out of a hairpin the whole field rides one side of the channel and a splitter cannot share it out fairly.',
    'Big feature two is a long banked sweep along the Huangpu, 200 degrees round, the river on its outside and the city lights in the water.',
    'Our own towers, river cruisers and pit garages, inspired by the area; place names only.',
  ],
  opening: opening('tunnel-launch', { costumes: { block: 'tyre-stack', slalom: 'traffic-cone' }, names: { portal: 'Down to the underpass', tunnel: 'Lujiazui underpass' }, tunnel: 'lit-tunnel' }),
  sections: [
    {
      name: 'Tower S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.19 }), billboards: 2, scenery: ['crowd'],
      // (The skyline beyond the bends, behind the loop as its TV camera looks back at it.)
      landmarks: [{ name: 'pudong-skyline', at: 0.55, side: 'left', distance: 150 }],
      // (Out of the underpass over a strip of rough paving, then a cone chicane through the bends: the race's luck, and room to pass.)
      features: [brake({ at: 0.04, length: 12, drag: 0.012 })],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.14, line: 'right' }), slalom({ costume: 'traffic-cone', from: 0.3, to: 0.85, count: 4, loss: 0.15, first: 'right' })],
    },
    {
      name: 'Skyline loop', shape: straight(130, { grade: 0.12 }), features: [loop({ at: 0.25, viewSide: 26 })], // (the follow camera a little closer in, as on Saint-Tropez: from 30 m the channel's near rim hid the marbles on the run-out)
      // (The skyline inland, behind the loop as its follow camera sees it from the river side.)
      landmarks: [{ name: 'pudong-towers', at: 0.42, side: 'left', distance: 90 }],
    },
    {
      name: 'Waterfront S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.19 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.12, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.3, to: 0.8, count: 4, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.92, line: 'left' })],
      // (Rough paving at the way in: the loop strings the field out in single file; the paving bunches it again for the overtaking.)
      features: [brake({ at: 0.04, length: 14, drag: 0.016 })],
      billboards: 1,
    },
    {
      name: 'Pit-lane splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'pit-garages',
    },
    {
      name: 'Huangpu banked sweep', shape: sweep({ side: 'left', radius: 75, degrees: 200, grade: 0.1 }), features: [boost({ at: 0.06 })], billboards: 2,
      landmarks: [{ name: 'river-lights', at: 0.5, side: 'right', distance: 70 }, { name: 'river-cruisers', at: 0.25, side: 'right', distance: 55 }, { name: 'far-bank-skyline', at: 0.45, side: 'right', distance: 240 }, { name: 'pudong-towers', at: 0.6, side: 'left', distance: 95 }],
    },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    {
      name: 'Ferry pier hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })],
    },
    {
      name: 'Waterfront straight', shape: straight(80, { grade: 0.16 }),
      obstacles: [parked({ costume: 'safety-car', at: 0.15, side: 'right', length: 5 })],
      features: [rumble({ from: 0.55, to: 0.95, count: 4 })], billboards: 1, scenery: ['grandstand'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
