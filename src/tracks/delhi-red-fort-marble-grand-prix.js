'use strict';

// Delhi Red Fort Marble Grand Prix, its own layout (Moses, 7 Nov 2026: four more Grand Prix tracks re-laid the same
// way as Lagos, Istanbul and Sydney; Delhi second). Until then it was the Grand Prix recipe of 10 Oct 2026 (the same
// track as Dubai). Now the field drops from the Red Fort's ramparts through the Lahori Gate (big feature one: the
// tunnel launch, through the fort's walls), threads the Chandni Chowk S-bends, spirals down round the Qutub Minar
// (big feature two, the signature), sweeps past the Jama Masjid, banks round through Lutyens' Delhi to the Connaught
// hairpin, drops to Raj Ghat, takes the Lodhi S-bends and runs down Kartavya Path to India Gate. Its records started
// again with the new layout (tracks.records_since).
const {
  track, opening, straight, plunge, sBends, sweep, spiral, hairpin, runIn, peg, slalom, swipe, rumble,
} = require('../trackKit');

module.exports = track({
  slug: 'delhi-red-fort-marble-grand-prix',
  name: 'Delhi Red Fort Marble Grand Prix',
  difficulty: 'extreme',
  description: 'From the Red Fort\'s ramparts and out through the Lahori Gate, through the bustle of Chandni Chowk, spiralling down round the Qutub Minar, past the Jama Masjid and round Lutyens\' Delhi, down to Raj Ghat and along Kartavya Path to India Gate.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { barrier: 'marigolds', groupsEvery: 650 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Qutub Minar spiral',
  tvCameras: [
    // (At the foot of the spiral, looking back up it round the tower.)
    { section: 'Qutub Minar spiral', at: 0.85, side: 'right', distance: 10, height: 12 },
  ],
  billboardFrame: 'plain',
  start: { landmark: 'red-fort', scenery: ['grandstand'], gate: 'paddle', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'india-gate', scenery: ['grandstand'] },
  designChanges: [
    'A new layout (7 Nov 2026): until then Delhi was physically the Grand Prix recipe of 10 Oct 2026 (the same track as Dubai Marble Grand Prix). Its old signature, the Rampart plunge, goes, and so do the Garden splitter and the boost pad on the Mosque sweep.',
    'Two Delhi features: the Lahori Gate (big feature one: the tunnel launch, the drop from the ramparts diving through the fort\'s walls) and the Qutub Minar spiral (big feature two, the signature: a turn and a half down round the tower, a new landmark, looks only). Then a banked turn through Lutyens\' Delhi (160°) and the drop to Raj Ghat. No jump: the three jump tracks are used.',
    'The opening a tunnel launch, its first bend to the right (Pudong Marble Grand Prix\'s turns left): the latest re-layouts opened with a split start, a crest, a pipe drop, a funnel drop and a banked turn. Its start shots (from above, then a low chase) and its paddle gate are its own among the Grand Prix tracks.',
    'The Chandni Chowk S-bends\' slalom before their two cones, not a cone and then the slalom: the other way round, the first 20 seconds were too like Pudong Marble Grand Prix\'s (0.88).',
    'Plane trees on the Qutub Minar spiral, the Lodhi S-bends and Kartavya Path only (not on the Lutyens bank or the drop to Raj Ghat): with them everywhere, and the small groups of spectators at the usual spacing, the flyover\'s first frame on a computer drew 151k triangles, over the 150k budget; the groups are 650 m apart and the Chandni Chowk S-bends have market stalls but no crowd.',
  'Each bend\'s direction chosen out of the 64 ways the six could turn so that no stretch runs close under another (the nearest, the Connaught hairpin, 24 m aside of the spiral and 78 m below it): on the first drawing the Jama Masjid sweep ran 7 m aside of the Chandni Chowk S-bends, 77 m below them, where the follow camera would have gone into the bank between them (as on Nairobi\'s first drawing).',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { portal: 'Rampart drop', tunnel: 'Lahori Gate' },
    tunnel: 'city-wall',
    dress: { portal: { scenery: ['battlements'] } },
  }),
  sections: [
    {
      name: 'Chandni Chowk S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.17 }), billboards: 2, scenery: ['market-stalls'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.12, to: 0.5, count: 4, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.65, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.85, line: 'right' })],
    },
    { name: 'Qutub Minar spiral', shape: spiral({ side: 'right', radius: 42, turns: 1.5, grade: 0.2 }), around: 'qutub-minar', scenery: ['plane-trees'] },
    {
      name: 'Jama Masjid sweep', shape: sweep({ side: 'left', radius: 80, degrees: 120, grade: 0.1 }), billboards: 1,
      landmarks: [{ name: 'jama-masjid', at: 0.5, side: 'right', distance: 40 }],
    },
    { name: 'Lutyens bank', shape: sweep({ side: 'left', radius: 60, degrees: 160, grade: 0.12 }) },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1, scenery: ['market-stalls'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'right' })],
    },
    { name: 'Connaught hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })], scenery: ['grandstand'] },
    { name: 'Down to Raj Ghat', shape: plunge(45, { grade: 0.28, from: 0.16 }), obstacles: [slalom({ costume: 'traffic-cone', from: 0.3, to: 0.9, count: 4, loss: 0.3 })] },
    {
      name: 'Lodhi S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 85, grade: 0.16 }), scenery: ['plane-trees'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.4, to: 0.75, count: 3, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.9, line: 'right' })],
    },
    {
      name: 'Kartavya Path', shape: straight(60, { grade: 0.15 }), billboards: 2, scenery: ['grandstand', 'plane-trees'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.45, line: 'left' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
