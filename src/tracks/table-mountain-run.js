'use strict';

// Table Mountain Run (re-laid 16 Nov 2026, Moses: its own layout like the other World Tour tracks; the track before
// it is frozen for the tests in src/game/referenceTracks.js). Still a hand-built track to look at: Cape Town on a
// bright summer day, the channel dressed as sand, its baboons, elephant, zebras and giraffe (the 3D view's
// 'cape-town' theme by slug, with Table Mountain, Lion's Head, the Bo-Kaap, the stadium and the bay). Off the edge
// of the table top into the first S-bends (the clean-drop start, the field let go in waves), along the top to the
// head of Platteklip Gorge and straight down it (the track's big feature: the gorge path down the mountain's face, a
// long steep drop), the hairpin at Kloof Nek, S-bends down the Nek, up Signal Hill and all the way round Lion's Head
// (a wide spiral), through the Bo-Kaap's S-bends, past the stadium and down to the Waterfront. Place names only.
const {
  track, handBuilt, onSection, opening, straight, plunge, climb, sBends, spiral, hairpin, runIn,
  block, curtain, swipe, slalom, peg, brake, moguls,
} = require('../trackKit');

const built = track({
  slug: 'table-mountain-run',
  name: 'Table Mountain Run',
  difficulty: 'extreme',
  description: 'Down Table Mountain into Cape Town: off the edge of the table top, straight down Platteklip Gorge, the hairpin at Kloof Nek, up Signal Hill and right round Lion\'s Head, through the Bo-Kaap and past the stadium to the Waterfront.',
  surface: 'sand',
  biome: 'meadow',
  lighting: 'day',
  signature: 'Down Platteklip Gorge',
  tvCameras: [
    // (At the foot of the gorge, looking back up it at the field coming down the mountain's face.)
    { section: 'Run to Kloof Nek', at: 0.15, side: 'left', distance: 8, height: 10 },
    { section: 'Round Lion\'s Head', at: 0.9, side: 'right', distance: 8, height: 8 },
  ],
  start: { gate: 'barrier', shots: { countdown: 'chase', launch: 'high-behind' } },
  designChanges: [
    'Its own layout (16 Nov 2026): the clean-drop start off the table top, then straight down Platteklip Gorge (the big feature), Kloof Nek, Signal Hill, round Lion\'s Head and through the Bo-Kaap.',
    'No splitters and no bumps across the whole field any more.',
  ],
  // (The clean-drop start: off the edge of the table top with nothing in the way, into deep S-bends; let go in waves.)
  opening: opening('clean-drop', {
    side: 'right',
    names: { plunge: 'Off the table top', bends: 'Along the cliff edge' },
    waves: { groups: 5, gap: 0.13, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'To the head of the gorge', shape: straight(55, { grade: 0.14 }), billboards: 1,
      obstacles: [slalom({ from: 0.35, to: 0.9, count: 4, loss: 0.3 })],
    },
    // The track's big feature: straight down Platteklip Gorge, the path down the mountain's face.
    { name: 'Down Platteklip Gorge', shape: plunge(80, { grade: 0.36, from: 0.16 }), obstacles: [block({ costume: 'baboon', at: 0.4, line: 'right' })] },
    {
      name: 'Run to Kloof Nek', shape: straight(50, { grade: 0.13 }), billboards: 1,
      features: [brake({ at: 0.45, length: 15, drag: 0.02 })],
    },
    { name: 'Kloof Nek', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'elephant', at: 0.4 })] },
    {
      name: 'Down the Nek', shape: sBends({ first: 'left', radius: 60, degrees: 80, grade: 0.14 }), billboards: 1,
      obstacles: [slalom({ from: 0.3, to: 0.7, count: 3, loss: 0.3 })],
    },
    { name: 'Up Signal Hill', shape: climb(12, { grade: -0.04, after: 0.3 }) },
    { name: 'Round Lion\'s Head', shape: spiral({ side: 'right', radius: 40 }) },
    {
      name: 'Through the Bo-Kaap', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.14 }), billboards: 1,
      obstacles: [peg({ costume: 'rock', at: 0.25, line: 'right' }), curtain({ costume: 'zebras', at: 0.5, side: 'left' }), peg({ costume: 'rock', at: 0.75, line: 'left' })],
    },
    {
      name: 'Past the stadium', shape: straight(80, { grade: 0.14 }), billboards: 1,
      features: [moguls({ from: 0.42, to: 0.62, count: 4 })],
      obstacles: [block({ costume: 'giraffe', at: 0.8, line: 'center', size: 'large' })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});

const on = (name, share) => onSection(built, name, share);

const tableMountainRun = handBuilt(built, {
  // Where Cape Town's landmarks stand along the run (the 3D view's scenery; physics ignores it).
  landmarks: {
    forest: [0, on('Along the cliff edge · 1', 0)],                    // the mountain forest round the start
    boKaap: [on('Through the Bo-Kaap · 1', 0), on('Through the Bo-Kaap · 2', 1)], // the colourful houses
    stadium: on('Past the stadium', 0.5),                                   // Cape Town Stadium alongside
    city: on('Kloof Nek', 0),                                               // the city below, from Kloof Nek on
  },
});
// The penguins beside the run-in at the Waterfront (scenery only: the race engine has no solid for them).
tableMountainRun.physics.features.push({ type: 'penguins', at: on('Finish', 0), to: on('Finish', 1), side: 1 });

module.exports = tableMountainRun;
