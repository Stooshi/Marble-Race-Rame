'use strict';

/**
 * Frozen copies of Bobsleigh Run and Table Mountain Run as they were up to
 * 16 Nov 2026, kept for tests only (Moses, 16 Nov 2026, option (a)). The race
 * fingerprints (scripts/race-fingerprints.js) and the engine and track-kit
 * tests use these as reference tracks, so the live tracks in physicsTracks.js
 * can get new layouts without changing the engine's fingerprints.
 * Never edit this file: a change here changes the fingerprints.
 */

const { generate } = require('./trackShape');


// Bobsleigh Run: an icy run built for speed. Always downhill, never flat. A
// game, not a simulation: tuned to look fast.
const BOBSLEIGH_SECTIONS = [
  { name: 'Starting ramp', kind: 'straight', length: 16, grade: 1.3 }, // steep: a burst off the line
  { name: 'Start plunge', kind: 'straight', length: 80, grade: 0.8 },
  { name: 'S-bend', kind: 'left', radius: 70, degrees: 50, grade: 0.15 },
  { name: 'S-bend', kind: 'right', radius: 70, degrees: 50, grade: 0.15 },
  { name: 'Run to the splitter', kind: 'straight', length: 170, grade: 0.13 },
  { name: 'Splitter', kind: 'left', radius: 90, degrees: 120, grade: 0.12 },
  { name: 'Merge', kind: 'straight', length: 45, grade: 0.12 },
  { name: 'Long banked sweep', kind: 'right', radius: 75, degrees: 200, grade: 0.1 },
  { name: 'Drop to the hairpin', kind: 'straight', length: 60, grade: 0.2 },
  { name: 'Hairpin', kind: 'left', radius: 20, degrees: 180, grade: 0.08 },
  { name: 'Drop to the corkscrew', kind: 'straight', length: 50, grade: 0.22 },
  { name: 'Corkscrew', kind: 'right', radius: 24, degrees: 450, grade: 0.2 },
  { name: 'Final plunge', kind: 'straight', length: 160, grade: 0.34 },
  { name: 'Finish', kind: 'straight', length: 30, grade: 0.08 },
];

function bobsleighRun() {
  const g = generate(BOBSLEIGH_SECTIONS);
  const runIn = g.sections.find((s) => s.name === 'Run to the splitter');
  const merge = g.sections.find((s) => s.name === 'Merge');
  return {
    id: null,
    slug: 'bobsleigh-run',
    name: 'Bobsleigh Run',
    difficulty: 'extreme',
    description: 'An icy bobsleigh run built for speed: a paddle gate, a splitter, a banked sweep, a hairpin, a corkscrew and a final plunge into the catch area.',
    length_m: g.length_m,
    lane_count: 4,
    waypoints: g.waypoints,
    obstacles: [],
    sections: g.sections,
    // What makes it a bobsleigh run (only this track switches these on).
    physics: {
      surface: 'ice',          // very low rolling resistance
      pace: 'free',            // as fast as the slope allows: no drag added to pad the clock
      // U-shaped ice channel (metres, degrees up the wall). It starts as a wide,
      // shallow funnel (walls the same height as the channel's) so the whole
      // field lines up side by side: nobody starts behind anybody. The outer
      // places start a little further on (stagger, metres at the very edge),
      // like a running track's lanes, since they have further to come in, and
      // the starting gate releases each marble at its own moment within
      // `release` seconds, in a random order each race, so no place has an
      // edge. Tuned on thousands of races (stagger 2.2 m until physics-preview-2,
      // whose cleaner start needs less: see the 2026-10-06 start data update).
      channel: { radius: 3.6, maxAngle: 80, funnel: { length: 70, radius: 22, spacing: 1.15, stagger: 0.2, release: 0.45 } },
      // The starting gate: a row of paddles, one in front of each marble, that
      // sink into the ice after a countdown, each at its own moment (the
      // funnel's `release`), a quick ripple in a random order each race.
      // How its start looks (drawing only, as a kit track's start.gate and start.shots): its own gate and first camera shots.
      startLook: { gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
      // Its TV cameras (drawing only, as a kit track's tvCameras; client tvMoments.js tvSpots): facing back up
      // the track at the oncoming marbles, after the splitter and at the hairpin (p: share of the track; side 1 left, -1 right).
      tv: [{ p: 0.3866, side: -1, distance: 10, height: 5 }, { p: 0.6773, side: -1, distance: 6, height: 8 }],
      gate: { countdownMs: 3000 },
      collisions: true,        // marbles bump into each other
      // Boost pads, speed bumps and obstacles marbles really slam into
      // (trackFeatures.js): `at` is the share of the way down the track, `l`
      // the share of the way up the wall (positive: the left wall; `l2` makes
      // it a stretch across). Built for chaos: right where the pack rides,
      // mostly on steep drops so marbles get going again quickly.
      features: [
        { type: 'ice_block', at: 0.056, l: -0.35, radius: 0.75, height: 1.2 }, // start plunge: two blocks either side
        { type: 'ice_block', at: 0.056, l: 0.35, radius: 0.75, height: 1.2 },  // across the pack, one dead centre
        { type: 'ice_block', at: 0.068, l: 0, radius: 0.8, height: 1.2 },     // behind them: the first pile-up of the race
        { type: 'bump', at: 0.13 },                                            // S-bends: the whole field hops
        { type: 'boost', at: 0.21, l: 0, length: 8, halfWidth: 3.6 },        // run to the splitter: the whole floor (so it favours neither channel)
        { type: 'boost', at: 0.445, l: -0.15, length: 8, halfWidth: 2.2 },   // out of the merge
        { type: 'polar_bear', at: 0.675, l: -1.25, reach: -0.55, radius: 0.7, height: 1.5 }, // hairpin: swats the high line
        { type: 'icicles', at: 0.718, l: -1, l2: -0.5, radius: 0.35 },       // drop to the corkscrew: a curtain across the high line
        { type: 'boost', at: 0.73, l: -0.5, length: 8, halfWidth: 2.6 },     // …and a boost out of the pile-up
        { type: 'snowman', at: 0.9, l: -0.1, radius: 0.9, height: 2.4 },     // final plunge: in the middle of the pack's line
        { type: 'bump', at: 0.95 },                                           // last hop before the finish
      ],
      runout: { length: 30, halfWidth: 3.5 }, // the catch area past the finish line (metres)
      // The splitter: a wedge divides the channel into a left and a right
      // channel on the inside and outside of a long left-hand curve; they
      // merge again before the next straight.
      fork: {
        // The wedge stands on the straight before the bend, where lines differ;
        // the channels rejoin partway down the straight after it.
        from: runIn.from + 0.62 * (runIn.to - runIn.from),
        to: merge.from + 0.5 * (merge.to - merge.from),
        radius: 2.5,           // each channel's own U radius
        apart: 6,              // metres from the middle to each channel's centre at the widest
        // Balanced by simulating thousands of races, on what matters: a
        // channel's share of wins matches its share of marbles, and marbles
        // from either side finish in the same places on average. The
        // tight inside is quicker through the splitter but its rough ice makes
        // marbles skid and come out slower (handling helps); the long outside
        // is slower through but carries its speed.
        // With the start-plunge pile-ups knocking marbles about, the wedge
        // stands 0.7 m towards the inside to split the field evenly (it stood
        // 1.2 m towards the outside before the obstacles came). Marbles held up
        // in the pile-ups tend to come in on the inside line, so the inside's
        // ice is now smooth and the outside's draggier: each channel wins its
        // fair share (balanced on thousands of races).
        tipOffset: 0.7,
        insideScrub: 1,
        outsideDrag: 1.7,
      },
    },
  };
}

// Table Mountain Run (Cape Town): Bobsleigh Run's run and physics, through
// Cape Town. The surface looks like sand but is as slippery as the ice. Per
// the track recipe its bends are long and flowing, easing in and out: the
// hairpin is its one sharp bend (with a braking zone before it) and the
// corkscrew is a wide spiral. A second splitter divides the field around
// Lion's Head.
const TABLE_MOUNTAIN_SECTIONS = [
  { name: 'Starting ramp', kind: 'straight', length: 16, grade: 1.3 },   // high on Table Mountain, in the forest
  { name: 'Start plunge', kind: 'straight', length: 80, grade: 0.8 },    // the baboons
  { name: 'S-bend', kind: 'left', radius: 70, degrees: 50, grade: 0.17, ease: 15 },  // down the rocky mountainside
  { name: 'S-bend', kind: 'right', radius: 70, degrees: 50, grade: 0.17, ease: 15 },
  { name: 'Run to the splitter', kind: 'straight', length: 90, grade: 0.13 },
  { name: 'Splitter', kind: 'left', radius: 90, degrees: 120, grade: 0.12, ease: 15 }, // round a big rock
  { name: 'Merge', kind: 'straight', length: 45, grade: 0.12 },
  { name: 'Long banked sweep', kind: 'right', radius: 75, degrees: 130, grade: 0.1, ease: 15 }, // over the city and the bay
  { name: 'Drop to the hairpin', kind: 'straight', length: 45, grade: 0.2 },
  { name: 'Hairpin', kind: 'left', radius: 20, degrees: 180, grade: 0.16, ease: 8 }, // the one sharp bend: the elephant
  { name: 'Out of the hairpin', kind: 'straight', length: 75, grade: 0.24 }, // room to get going again before Lion's Head
  { name: "Lion's Head splitter", kind: 'right', radius: 75, degrees: 80, grade: 0.18, ease: 15 },
  { name: 'Merge below Lion\'s Head', kind: 'straight', length: 30, grade: 0.2 },
  { name: 'Drop to the corkscrew', kind: 'straight', length: 35, grade: 0.22 }, // the zebras
  { name: 'Corkscrew', kind: 'right', radius: 40, degrees: 360, grade: 0.21, ease: 15 }, // past the Bo-Kaap
  { name: 'Final plunge', kind: 'straight', length: 60, grade: 0.34 },  // Cape Town Stadium alongside: the giraffe
  { name: 'Finish', kind: 'straight', length: 30, grade: 0.08 },         // the V&A Waterfront
];

function tableMountainRun() {
  const g = generate(TABLE_MOUNTAIN_SECTIONS);
  const sec = (name) => g.sections.find((s) => s.name === name);
  const on = (name, share) => {
    const s = sec(name);
    return Math.round((s.from + share * (s.to - s.from)) * 10000) / 10000;
  };
  return {
    id: null,
    slug: 'table-mountain-run',
    name: 'Table Mountain Run',
    difficulty: 'extreme',
    description: 'Down Table Mountain into Cape Town: a paddle gate in the forest, baboons, a splitter round a big rock, a sweep over the bay, an elephant at the hairpin, a second splitter round Lion\'s Head, zebras, a corkscrew past the Bo-Kaap and a plunge to the V&A Waterfront.',
    length_m: g.length_m,
    lane_count: 4,
    waypoints: g.waypoints,
    obstacles: [],
    sections: g.sections,
    physics: {
      surface: 'ice',          // as slippery as Bobsleigh Run's ice…
      look: 'sand',            // …though it looks like sand (the 3D view; physics ignores it)
      pace: 'free',
      channel: { radius: 3.6, maxAngle: 80, funnel: { length: 70, radius: 22, spacing: 1.15, stagger: 0.2, release: 0.45 } },
      // How its start looks (drawing only, as a kit track's start.gate and start.shots): its own gate and first camera shots.
      startLook: { gate: 'barrier', shots: { countdown: 'chase', launch: 'high-behind' } },
      // Its TV cameras (drawing only): the end of the splitter, and of the Lion's Head splitter.
      tv: [{ p: 0.345, side: -1, distance: 10, height: 5 }, { p: 0.7072, side: 1, distance: 10, height: 5 }],
      gate: { countdownMs: 3000 },
      collisions: true,
      // Bobsleigh Run's obstacles, as Cape Town's animals (`look`). They stand in
      // place; only the elephant's trunk reaches in, on the polar bear's
      // timetable. The elephant and the zebras knock marbles aside (`parked`:
      // round their open side, a fifth of the usual cost) rather than stopping
      // them dead, so nobody is left far behind.
      features: [
        { type: 'ice_block', look: 'baboon', at: on('Start plunge', 0.5), l: -0.35, radius: 0.75, height: 1.2 }, // the start plunge: two baboons either side
        { type: 'ice_block', look: 'baboon', at: on('Start plunge', 0.5), l: 0.35, radius: 0.75, height: 1.2 },  // across the pack, one dead centre
        { type: 'ice_block', look: 'baboon', at: on('Start plunge', 0.5) + 0.012, l: 0.12, radius: 0.8, height: 1.2 }, // (a touch off centre: no starting place has an edge)
        { type: 'bump', at: on('S-bend', 0.5) },
        // Short, sharp braking zones (rough sand) before the bends: they slow the fast marbles most,
        // so the field bunches up there and fans out again after: closer racing, more overtaking.
        { type: 'cobbles', at: on('Run to the splitter', 0.72), length: 15, drag: 0.02 },
        { type: 'cobbles', at: on('Merge', 0.25), length: 15, drag: 0.02 },
        { type: 'cobbles', at: on('Drop to the corkscrew', 0.05), length: 15, drag: 0.02 },
        { type: 'boost', at: on('Run to the splitter', 0.3), l: 0, length: 8, halfWidth: 3.6 },
        { type: 'boost', at: on('Long banked sweep', 0.06), l: -0.15, length: 8, halfWidth: 2.2 },     // out of the merge, into the sweep
        { type: 'cobbles', at: on('Drop to the hairpin', 0.35), length: 35, drag: 0.004 },              // the braking zone before the hairpin
        { type: 'polar_bear', look: 'elephant', at: on('Hairpin', 0.37), l: -1.25, reach: -0.55, radius: 0.7, height: 1.5, parked: true, loss: 0.2 }, // swings its trunk across the high line, shoving marbles aside
        { type: 'icicles', look: 'zebras', at: on('Drop to the corkscrew', 0.4), l: -1, l2: -0.5, radius: 0.35, parked: true, loss: 0.2 }, // standing on the high line: marbles are knocked out round them
        { type: 'boost', at: on('Drop to the corkscrew', 0.7), l: -0.5, length: 8, halfWidth: 2.6 },
        { type: 'snowman', look: 'giraffe', at: on('Final plunge', 0.45), l: -0.1, radius: 0.9, height: 2.4 },
        { type: 'bump', at: on('Final plunge', 0.85) },
        { type: 'penguins', at: on('Finish', 0), to: on('Finish', 1), side: 1 },  // beside the run-in (scenery only)
      ],
      runout: { length: 30, halfWidth: 3.5 },
      // Where Cape Town's landmarks stand along the run (the 3D view's scenery; physics ignores it).
      landmarks: {
        forest: [0, on('S-bend', 0)],                                 // the mountain forest round the start
        boKaap: [on('Corkscrew', 0), on('Corkscrew', 1)],            // the colourful houses round the corkscrew
        stadium: on('Final plunge', 0.5),                             // Cape Town Stadium alongside
        city: on('Long banked sweep', 0),                             // the city below, from the sweep on
      },
      // Two splitters: round a big rock (as on Bobsleigh Run), and round Lion's Head.
      // Balanced so the route never decides a race: marbles that reach the wedge
      // in the same place finish in the same place on average, whichever channel
      // they take (on thousands of races). Win shares by route differ on Lion's
      // Head because the leaders come out of the hairpin on the right-hand side.
      forks: [
        {
          from: on('Run to the splitter', 0.62),
          to: on('Merge', 0.5),
          radius: 2.5, apart: 6, tipOffset: -0.8, insideScrub: 1, outsideDrag: 0.6,
        },
        {
          from: on('Out of the hairpin', 0.85),
          to: on('Merge below Lion\'s Head', 0.5),
          // A right-hand bend: the engine's "inside" channel (the left one) is the long
          // way round here, so its ice is the smooth one and the short right-hand
          // channel's the draggy one.
          radius: 2.5, apart: 6, tipOffset: 2.2, insideScrub: 0.3, outsideDrag: 1.4,
        },
      ],
    },
  };
}


const REFERENCE_TRACKS = [bobsleighRun(), tableMountainRun()];

/** The frozen copy of 'bobsleigh-run' or 'table-mountain-run'. */
function referenceTrack(slug) {
  return REFERENCE_TRACKS.find((t) => t.slug === slug) || null;
}

module.exports = { REFERENCE_TRACKS, referenceTrack, BOBSLEIGH_SECTIONS, TABLE_MOUNTAIN_SECTIONS };
