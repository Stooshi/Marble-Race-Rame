'use strict';

/**
 * Tracks built for the new physics (physicsSimulator.js). Each is described as
 * a list of sections, and the waypoints are generated from them, so the shape
 * is easy to tune by eye. The database holds the same track (added by a data
 * update, generated from here by scripts/physics-track-sql.js); a race uses
 * the new physics when its track has `physics` settings.
 *
 * Section: { name, kind: 'straight'|'left'|'right', length (plan metres) or
 * radius + degrees, grade (metres of drop per metre, positive = downhill) }.
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

// San Francisco: a racing channel dressed as a city street. The same slick
// channel as the bobsleigh run (it only looks like asphalt), plunging down the
// steepest streets in town: long steep drops, two short climbs hit at speed
// with a crest jump over the top, Lombard Street's banked hairpins and a long
// sweep along the bay to the pier.
// Over the top of each climb, the slope steepens bit by bit (a crest rounded
// off over about 100 m), so marbles roll over the top and on down rather than
// flying: at 120-150 km/h a sharp crest throws them 20 m up.
const SAN_FRANCISCO_SECTIONS = [
  { name: 'Nob Hill start', kind: 'straight', length: 16, grade: 1.3 },
  { name: 'California Street', kind: 'straight', length: 150, grade: 0.55 },
  // Easing off into each bend: the hill gets gentler (before Lombard it even rises a little), with
  // cobbles across the street (see the features) braking the pack before the bend; the straights stay fast.
  { name: 'California run-in', kind: 'straight', length: 15, grade: 0.2 },
  { name: 'Powell bend', kind: 'right', radius: 60, degrees: 70, grade: 0.15, ease: 15 },
  { name: 'Powell Street', kind: 'straight', length: 60, grade: 0.3 },
  { name: 'Russian Hill', kind: 'straight', length: 35, grade: -0.12 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: -0.08 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: -0.04 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.0 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.04 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.08 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.12 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.16 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.2 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.24 },
  { name: 'Russian Hill crest', kind: 'straight', length: 10, grade: 0.28 },
  { name: 'Hyde Street', kind: 'straight', length: 85, grade: 0.32 },
  { name: 'Hyde run-in', kind: 'straight', length: 10, grade: 0.1 },
  { name: 'Hyde run-in', kind: 'straight', length: 8, grade: -0.03 },
  // Lombard Street: two flowing S-curves (wide, easing in and out), then its one signature
  // hairpin, with a braking zone on the way in (see the features).
  { name: 'Lombard 1', kind: 'left', radius: 60, degrees: 60, grade: 0.18, ease: 15 },
  { name: 'Lombard 2', kind: 'right', radius: 60, degrees: 30, grade: 0.18, ease: 15 },
  { name: 'Lombard 3', kind: 'left', radius: 55, degrees: 90, grade: 0.18, ease: 15 },
  { name: 'Lombard 4', kind: 'right', radius: 22, degrees: 120, grade: 0.18, ease: 8 },
  { name: 'Leavenworth', kind: 'straight', length: 40, grade: 0.3 },
  { name: 'Telegraph Hill', kind: 'straight', length: 25, grade: -0.1 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: -0.06 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: -0.02 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.02 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.06 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.1 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.14 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.18 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.22 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.26 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.3 },
  { name: 'Telegraph Hill crest', kind: 'straight', length: 10, grade: 0.34 },
  { name: 'Filbert Street', kind: 'straight', length: 75, grade: 0.38 },
  { name: 'Filbert run-in', kind: 'straight', length: 14, grade: 0.15 },
  { name: 'Embarcadero', kind: 'left', radius: 45, degrees: 170, grade: 0.15, ease: 15 },
  { name: 'Pier 39', kind: 'straight', length: 50, grade: 0.18 },
  { name: 'Finish', kind: 'straight', length: 30, grade: 0.08 },
];

function sanFrancisco() {
  const g = generate(SAN_FRANCISCO_SECTIONS);
  // A spot `share` of the way along a named stretch (as a share of the whole track).
  const on = (name, share) => {
    const s = g.sections.find((x) => x.name === name);
    return Math.round((s.from + share * (s.to - s.from)) * 10000) / 10000;
  };
  // Metres from the start of one named stretch to the end of another.
  const span = (first, last) => Math.round((g.sections.find((x) => x.name === last).to - g.sections.find((x) => x.name === first).from) * g.length_m * 10) / 10;
  return {
    id: null,
    slug: 'san-francisco',
    name: 'San Francisco',
    difficulty: 'hard',
    description: 'Plunge down the steepest streets in the city: Nob Hill, two crest jumps, the banked hairpins of Lombard Street, a cable car crossing and a long sweep along the bay to the pier.',
    length_m: g.length_m,
    lane_count: 4,
    waypoints: g.waypoints,
    obstacles: [],
    sections: g.sections,
    physics: {
      surface: 'ice',          // slick: the street only looks like asphalt
      look: 'street',          // how the 3D view dresses the channel (physics ignores it)
      pace: 'free',
      // Nearly vertical walls (88° up), so marbles can ride high round the
      // hairpins and the bay sweep at full speed without leaving the channel.
      channel: { radius: 3.6, maxAngle: 88, funnel: { length: 70, radius: 22, spacing: 1.15, stagger: 0.2, release: 0.45 } },
      gate: { countdownMs: 3000 },
      collisions: true,
      noHitBoost: true,        // an obstacle hit never speeds a marble up
      // Boost pads across the whole street (so they favour no line), one out
      // of every slow part (each climb and the hairpins), and the city's
      // obstacles right where the pack rides.
      features: [
        // A cable car parked on its rails part-way down Powell Street, standing in across the left-hand
        // side of the street from beyond the rim (l to l2), where the pack swings across: marbles that
        // hit it bounce off, knocked aside round its open end (a tenth of their speed per hit); the rest
        // run past it.
        { type: 'cable_car', at: on('Powell Street', 0.7), parked: true, l: 1.4, l2: 0.45, length: 6, width: 2.4, height: 3.2, loss: 0.1 },
        // Cobbles across the whole street where it eases off before each bend: they brake every marble
        // alike (harder the faster it goes), so the pack comes into the bends slower; hardest before
        // Lombard's tight hairpins. (The hill alone can't: levelling out barely slows a marble at speed.)
        { type: 'cobbles', at: on('California Street', 0.85), length: 35, drag: 0.01 },
        { type: 'cobbles', at: on('Hyde Street', 0.85), length: 35, drag: 0.005 },
        { type: 'cobbles', at: on('Lombard 3', 0.7), length: 35, drag: 0.015 }, // the braking zone before the hairpin
        { type: 'cobbles', at: on('Filbert Street', 0.85), length: 35, drag: 0.01 },
        // Brick paving right round each bend (Lombard's hairpins are famously brick), braking the
        // marbles gently all the way so they don't pick the speed back up going downhill through it.
        { type: 'cobbles', at: on('Powell bend', 0), length: span('Powell bend', 'Powell bend'), drag: 0.001, look: 'brick' },
        { type: 'cobbles', at: on('Lombard 4', 0), length: span('Lombard 4', 'Lombard 4'), drag: 0.004, look: 'brick' },
        { type: 'cobbles', at: on('Embarcadero', 0), length: span('Embarcadero', 'Embarcadero'), drag: 0.0015, look: 'brick' },
        // Hyde Street: two big trash cans either side of the pack's line, one after the other.
        { type: 'trash_can', at: on('Hyde Street', 0.45), l: 0.25, radius: 0.65, height: 1.43, loss: 0.15 },
        { type: 'trash_can', at: on('Hyde Street', 0.58), l: -0.25, radius: 0.65, height: 1.43, loss: 0.15 },
        { type: 'boost', at: on('Powell Street', 0.95), l: 0, length: 8, halfWidth: 3.6, kick: 5 },     // into the Russian Hill climb
        // Lombard Street's flower beds line both rims (scenery only: in the hairpins
        // they caught slow marbles and left them crawling, ten seconds behind).
        { type: 'flowers', at: on('Lombard 1', 0), to: on('Lombard 4', 1) },
        { type: 'boost', at: on('Leavenworth', 0.05), l: 0, length: 8, halfWidth: 3.6, kick: 5 },       // out of the hairpins
        { type: 'boost', at: on('Leavenworth', 0.9), l: 0, length: 8, halfWidth: 3.6, kick: 5 },        // into the Telegraph Hill climb
        // Filbert Street, once the pack is down from the crest hop: two newspaper boxes either side…
        // (Street furniture costs 40% of the usual speed per hit: plenty of knocks, without a lottery.)
        { type: 'news_box', at: on('Filbert Street', 0.6), l: -0.35, radius: 0.6, height: 1.3, loss: 0.4 },
        { type: 'news_box', at: on('Filbert Street', 0.6), l: 0.35, radius: 0.6, height: 1.3, loss: 0.4 },
        { type: 'hydrant', at: on('Filbert Street', 0.67), l: 0, radius: 0.45, height: 0.9, loss: 0.4 },  // …and a fire hydrant behind them, dead centre
        { type: 'boost', at: on('Pier 39', 0.05), l: 0, length: 8, halfWidth: 3.6, kick: 5 },           // out of the Embarcadero sweep
        // A bus parked along the right-hand wall on the run to the pier, where the pack rides out of the sweep.
        { type: 'bus', at: on('Pier 39', 0.38), l: -1, l2: -0.68, length: 10, radius: 0.4, height: 3, loss: 0.15 }, // from the top of the wall down (like the icicles): nobody gets caught above it
        // Pier 39's sea lion colony on its docks beside the run-in (scenery only)…
        { type: 'sea_lion_colony', at: on('Pier 39', 0.3), to: on('Finish', 0.7), side: -1 },
        // …and two of them flopping from their perches into the street on a timetable (flop: seconds it runs ahead),
        // lying across the pack's line for a few seconds (the first dead centre): plenty of hits, each a soft one.
        { type: 'sea_lion', at: on('Pier 39', 0.58), l: -1.3, reach: 0, flop: 0, radius: 0.8, height: 1.0, loss: 0.3 },
        { type: 'sea_lion', at: on('Pier 39', 0.8), l: -1.3, reach: -0.2, flop: 3.2, radius: 0.8, height: 1.0, loss: 0.3 },
      ],
      runout: { length: 30, halfWidth: 3.5 },
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

// Tracks built with the track kit (src/tracks), after the hand-built ones.
const KIT_TRACKS = require('../tracks');

const PHYSICS_TRACKS = [bobsleighRun(), sanFrancisco(), tableMountainRun(), ...KIT_TRACKS];

function physicsTrack(slug) {
  return PHYSICS_TRACKS.find((t) => t.slug === slug) || null;
}

module.exports = { PHYSICS_TRACKS, physicsTrack, generate, SAN_FRANCISCO_SECTIONS, TABLE_MOUNTAIN_SECTIONS };
