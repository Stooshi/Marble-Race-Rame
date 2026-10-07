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

const HEIGHT_SCALE = 1.4; // the 3D view and physics stretch heights by this (trackGeometry.TRACK_STYLE)
const STEP = 8;           // plan metres between generated waypoints

function generate(sections) {
  // Walk the sections, collecting points every STEP metres.
  const pts = [];
  let x = 0;
  let y = 0;
  let heading = 0;
  let height = sections.reduce((h, s) => h + s.grade * (s.length ?? (s.radius * s.degrees * Math.PI) / 180), 0);
  const marks = [];
  let travelled3d = 0;
  pts.push({ x, y, h: height });
  for (const s of sections) {
    const length = s.length ?? (s.radius * s.degrees * Math.PI) / 180;
    const startMark = travelled3d;
    const steps = Math.max(1, Math.round(length / STEP));
    const turn = s.kind === 'straight' ? 0 : ((s.kind === 'left' ? 1 : -1) * (s.degrees * Math.PI) / 180) / steps;
    const d = length / steps;
    for (let k = 0; k < steps; k += 1) {
      // Arcs: advance along the chord at the mid heading.
      heading += turn / 2;
      x += Math.cos(heading) * d;
      y += Math.sin(heading) * d;
      heading += turn / 2;
      height -= s.grade * d;
      travelled3d += d * Math.sqrt(1 + s.grade * s.grade);
      pts.push({ x, y, h: height });
    }
    marks.push({ name: s.name, start: startMark, end: travelled3d });
  }
  let plan = 0;
  for (let i = 1; i < pts.length; i += 1) plan += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const total3d = travelled3d;
  return {
    // Rounded so the data reads cleanly; z is stored pre-divided by the height stretch.
    waypoints: pts.map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, z: Math.round((p.h / HEIGHT_SCALE) * 1000) / 1000 })),
    length_m: Math.round(plan * 100) / 100,
    sections: marks.map((m) => ({ name: m.name, from: m.start / total3d, to: m.end / total3d })),
  };
}

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
  { name: 'Powell bend', kind: 'right', radius: 60, degrees: 70, grade: 0.15 },
  { name: 'Powell Street', kind: 'straight', length: 80, grade: 0.3 },
  { name: 'Russian Hill', kind: 'straight', length: 45, grade: -0.12 },
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
  { name: 'Hyde Street', kind: 'straight', length: 95, grade: 0.32 },
  { name: 'Hyde run-in', kind: 'straight', length: 10, grade: 0.1 },
  { name: 'Hyde run-in', kind: 'straight', length: 8, grade: -0.03 },
  { name: 'Lombard 1', kind: 'left', radius: 22, degrees: 120, grade: 0.18 },
  { name: 'Lombard 2', kind: 'right', radius: 22, degrees: 120, grade: 0.18 },
  { name: 'Lombard 3', kind: 'left', radius: 22, degrees: 120, grade: 0.18 },
  { name: 'Lombard 4', kind: 'right', radius: 22, degrees: 120, grade: 0.18 },
  { name: 'Leavenworth', kind: 'straight', length: 50, grade: 0.3 },
  { name: 'Telegraph Hill', kind: 'straight', length: 35, grade: -0.1 },
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
  { name: 'Filbert Street', kind: 'straight', length: 100, grade: 0.38 },
  { name: 'Filbert run-in', kind: 'straight', length: 14, grade: 0.15 },
  { name: 'Embarcadero', kind: 'left', radius: 45, degrees: 170, grade: 0.15 },
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
        { type: 'cable_car', at: on('Powell Street', 0.7), parked: true, l: 1.4, l2: 0.25, length: 6, width: 2.4, height: 3.2, loss: 0.1 },
        // Cobbles across the whole street where it eases off before each bend: they brake every marble
        // alike (harder the faster it goes), so the pack comes into the bends slower; hardest before
        // Lombard's tight hairpins. (The hill alone can't: levelling out barely slows a marble at speed.)
        { type: 'cobbles', at: on('California Street', 0.85), length: 35, drag: 0.01 },
        { type: 'cobbles', at: on('Hyde Street', 0.85), length: 35, drag: 0.015 },
        { type: 'cobbles', at: on('Filbert Street', 0.85), length: 35, drag: 0.01 },
        // Brick paving right round each bend (Lombard's hairpins are famously brick), braking the
        // marbles gently all the way so they don't pick the speed back up going downhill through it.
        { type: 'cobbles', at: on('Powell bend', 0), length: span('Powell bend', 'Powell bend'), drag: 0.002, look: 'brick' },
        { type: 'cobbles', at: on('Lombard 1', 0), length: span('Lombard 1', 'Lombard 4'), drag: 0.004, look: 'brick' },
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
        { type: 'bus', at: on('Pier 39', 0.38), l: -1, l2: -0.8, length: 10, radius: 0.4, height: 3, loss: 0.15 }, // from the top of the wall down (like the icicles): nobody gets caught above it
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

const PHYSICS_TRACKS = [bobsleighRun(), sanFrancisco()];

function physicsTrack(slug) {
  return PHYSICS_TRACKS.find((t) => t.slug === slug) || null;
}

module.exports = { PHYSICS_TRACKS, physicsTrack, generate };
