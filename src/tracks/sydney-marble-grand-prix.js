'use strict';

// Sydney Marble Grand Prix, its own layout (Moses, 6 Nov 2026, the overnight order: its own layout, clearly
// different from Stockholm's, with two signature Sydney features). Until then it was the same track as Lagos and
// Stockholm (the Grand Prix recipe of 10 Oct 2026, mirrored). Now the field squeezes through the Circular Quay funnel
// at the gate, crosses the Harbour Bridge, threads The Rocks and the Circular Quay S-bends into the Opera House
// splitter (the signature: a channel either side of the sails), spirals down through the Botanic Garden, round the
// Woolloomooloo hairpin, drops to Bondi and rides the Bondi wave (a half-pipe), and along Macquarie Street to the
// line. Its records started again with the new layout (tracks.records_since).
const {
  track, opening, straight, plunge, sBends, spiral, hairpin, splitter, halfPipe, runIn, peg, slalom, swipe, rumble,
} = require('../trackKit');

module.exports = track({
  slug: 'sydney-marble-grand-prix',
  name: 'Sydney Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A harbour race: through the Circular Quay funnel, across the Harbour Bridge, through The Rocks and round both sides of the Opera House, down through the Botanic Garden and round Woolloomooloo to ride the Bondi wave, and along Macquarie Street to the line.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { groupsEvery: 600 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Opera House splitter',
  tvCameras: [
    // (At the splitter's end, looking back at the two channels either side of the sails.)
    { section: 'Opera House splitter', at: 0.85, side: 'right', distance: 8, height: 7 },
  ],
  billboardFrame: 'plain',
  start: { scenery: ['sandstone-terraces'], gate: 'stalls', shots: { countdown: 'above', launch: 'high-behind' } },
  finish: { landmark: 'opera-house', scenery: ['grandstand'] },
  designChanges: [
    'A new layout (6 Nov 2026): until then Sydney was physically the same track as Lagos and Stockholm Marble Grand Prix (the Grand Prix recipe, mirrored). Its old signature, the Arch plunge, goes.',
    'Two Sydney features: the Opera House splitter (big feature one, the signature: a channel either side of the sails) and the Circular Quay funnel at the gate (big feature two: the field squeezes from the wide bowl into the channel, as at the ferry wharves). Then the Harbour Bridge, straight across and steep (0.19), and the Bondi wave, a half-pipe the field rocks along.',
    'No boost pad on the Harbour Bridge: out of the funnel the weakest marbles took it far more often than the strongest (36% against 17%); the bridge is steeper instead. No parked safety car on Macquarie Street (two cones instead): wherever it stood, now and then the slowest marble stalled behind it for over 6 seconds.',
    'The Opera House splitter\'s tip 2 m over and its inside channel a little rougher (1.5): with the proven Grand Prix splitter\'s (0.8 m over), nine marbles in ten took one channel; now about four in ten take the inside one, and both channels share the wins and places fairly. The Bondi wave two gentle swings (15°; at 18° the follow camera jumped as it rocked). Spectator groups every 600 m and less scenery than first drawn: the flyover\'s drawing budget. The Woolloomooloo hairpin comes before the drop to Bondi rather than after the Bondi wave: with the wave last but one, the track came back past it 30 m below, the ground rose between them and its banks crowded the finish shot past the line.',
    'Clearly not Stockholm (a split start, a drop and a splitter): no other track\'s section order is close (Åre Run, the nearest, at 0.63). Its start shots (from above, then high behind) are its own among the Grand Prix tracks.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { plunge: 'Circular Quay funnel' },
    dress: { plunge: { scenery: ['sandstone-terraces'] } },
  }),
  sections: [
    { name: 'Harbour Bridge', shape: straight(80, { grade: 0.19 }), bridge: 'steel' },
    {
      name: 'The Rocks', shape: straight(40, { grade: 0.15 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'left' }), slalom({ costume: 'traffic-cone', from: 0.35, to: 0.65, count: 3, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.85, line: 'center' })],
    },
    { name: 'Circular Quay S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 85, grade: 0.15 }), billboards: 2 },
    {
      name: 'Opera House splitter', shape: splitter({ side: 'left', balance: { tipOffset: -2.0, left: { drag: 1.5, scrub: 1.5 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'opera-house',
    },
    { name: 'Botanic Garden spiral', shape: spiral({ side: 'right', radius: 45, turns: 1.25, grade: 0.17 }), scenery: ['plane-trees'] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 2 },
    { name: 'Woolloomooloo hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Down to Bondi', shape: plunge(45, { grade: 0.28, from: 0.16 }), obstacles: [slalom({ costume: 'traffic-cone', from: 0.3, to: 0.9, count: 4, loss: 0.3 })] },
    { name: 'Bondi wave', shape: halfPipe({ first: 'left', width: 8, swings: 2, radius: 150, degrees: 15, grade: 0.14 }), landmarks: [{ name: 'harbour', at: 0.5, side: 'right', distance: 30 }] },
    {
      name: 'Macquarie Street', shape: straight(70, { grade: 0.15 }), billboards: 2, scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.45, line: 'left' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
