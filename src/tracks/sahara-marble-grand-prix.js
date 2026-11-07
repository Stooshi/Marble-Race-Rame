'use strict';

// Sahara Marble Grand Prix, its own layout (Moses, 7 Nov 2026: four more Grand Prix tracks re-laid the same way as
// Lagos, Istanbul and Sydney; Sahara third). Until then it was the Grand Prix recipe of 10 Oct 2026 (the same track as
// Dubai). Now the field leaves the kasbah in waves, like a caravan setting out (the staggered drop), threads the Erg
// S-bends and crosses the salt flat, rides the Dune wave (big feature one, the signature: a half-pipe over the dunes,
// four swings), sweeps round with the caravan, splits either side of the oasis (big feature two: the Oasis splitter),
// runs through the red rock canyon to the Erg Chebbi hairpin, drops down the dune and runs along the Mosque straight to
// the great mud-brick mosque. Its records started again with the new layout (tracks.records_since).
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, splitter, halfPipe, runIn, peg, slalom, swipe, rumble,
} = require('../trackKit');

module.exports = track({
  slug: 'sahara-marble-grand-prix',
  name: 'Sahara Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A desert Grand Prix: out of a kasbah of earthen towers like a caravan setting out, over the salt flat, riding the dune wave, either side of an oasis, through a red rock canyon and down the dunes to a great mud-brick mosque.',
  surface: 'asphalt',
  biome: 'desert',
  lighting: 'day',
  variants: ['fog', 'sunset'],
  grandPrix: { crowd: 'desert-folk', groupsEvery: 650 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Dune wave',
  tvCameras: [
    // (Near the end of the wave, looking back along it as the field rocks over the dunes.)
    { section: 'Dune wave', at: 0.85, side: 'right', distance: 8, height: 12 },
  ],
  billboardFrame: 'crates',
  start: { landmark: 'kasbah', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'mud-mosque' },
  designChanges: [
    'A new layout (7 Nov 2026): until then Sahara was physically the Grand Prix recipe of 10 Oct 2026 (the same track as Dubai Marble Grand Prix). Its old signature, the Canyon run, stays as the braking straight before the hairpin; the spiral and the boost pad on the sweep go.',
    'Two Sahara features: the Dune wave (big feature one, the signature: a half-pipe over the dunes, four gentle swings of 15°, as on Sydney\'s Bondi wave, where 18° made the follow camera jump) and the Oasis splitter (big feature two: a channel either side of the oasis, the proven Grand Prix splitter). No jump: the three jump tracks are used.',
    'The opening a staggered drop, like a caravan setting out (the field let go from the kasbah in five waves), its first bend to the right: Zermatt Marble Grand Prix\'s, the only other Grand Prix track with this opening, turns left. The latest re-layouts opened with a split start, a crest, a pipe drop, a funnel drop, a banked turn and a tunnel launch. Its start shots (a chase, then from overhead) and its trapdoor gate are its own among the Grand Prix tracks.',
    'The Dune wave four swings and a drop down the dune after the hairpin: with two swings and no drop the winner took 46 s (target 48–55 s). The salt flat straight before the wave is its run-in (a half-pipe needs at least 20 m of straight or a drop before it). No spiral: with one, some stretches ran close under others; without it no stretch runs within 30 m beside another one above it, and the field races over open desert.',
    'The Dune wave\'s TV camera 12 m up (not 7): lower, the dunes\' banks stood between it and the wave. Spectator groups every 650 m, no caravan beside the sweep and no palms round the oasis: with them, a computer drew 160k triangles in the flyover\'s first frame and 152k at the race\'s busiest (150k allowed).',
    'Clearly not the Grand Prix recipe or any other track: no other track\'s section order is close (Belgrade Badnjak Run, the nearest, at 0.63).',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { plunge: 'Kasbah drop' },
  }),
  sections: [
    {
      name: 'Erg S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.16 }), billboards: 2,
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.15, to: 0.5, count: 3, loss: 0.15 }), peg({ costume: 'traffic-cone', at: 0.7, line: 'center' })],
    },
    {
      name: 'Salt flat straight', shape: straight(60, { grade: 0.15 }), billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.6, line: 'right' })],
    },
    { name: 'Dune wave', shape: halfPipe({ first: 'right', width: 8, swings: 4, radius: 150, degrees: 15, grade: 0.14 }) },
    { name: 'Caravan sweep', shape: sweep({ side: 'right', radius: 80, degrees: 120, grade: 0.1 }), billboards: 2 },
    {
      name: 'Oasis splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'oasis',
    },
    { name: 'Canyon run', shape: straight(50, { grade: 0.12 }), tunnel: 'canyon' },
    { name: 'Erg Chebbi hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Down the dune', shape: plunge(45, { grade: 0.28, from: 0.16 }), obstacles: [slalom({ costume: 'traffic-cone', from: 0.3, to: 0.9, count: 4, loss: 0.3 })] },
    {
      name: 'Mosque straight', shape: straight(60, { grade: 0.15 }), billboards: 2, scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.45, line: 'left' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
