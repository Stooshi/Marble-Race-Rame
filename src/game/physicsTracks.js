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

// Bobsleigh Run and Table Mountain Run: hand-built tracks to look at, laid out with the track kit since 16 Nov 2026
// (src/tracks/bobsleigh-run.js, src/tracks/table-mountain-run.js; their tracks before that are frozen for the tests
// in referenceTracks.js).
const bobsleighRun = () => require('../tracks/bobsleigh-run');
const tableMountainRun = () => require('../tracks/table-mountain-run');

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
      // How its start looks (drawing only, as a kit track's start.gate and start.shots): its own gate and first camera shots.
      startLook: { gate: 'stalls', shots: { countdown: 'above', launch: 'overhead' } },
      // Its TV camera (drawing only): Lombard Street's second hairpin (the Telegraph Hill crests have no clear spot for one).
      tv: [{ p: 0.5124, side: -1, distance: 6, height: 12 }],
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

// Tracks built with the track kit (src/tracks), after the hand-built ones.
const KIT_TRACKS = require('../tracks');

const PHYSICS_TRACKS = [bobsleighRun(), sanFrancisco(), tableMountainRun(), ...KIT_TRACKS];

function physicsTrack(slug) {
  return PHYSICS_TRACKS.find((t) => t.slug === slug) || null;
}

module.exports = { PHYSICS_TRACKS, physicsTrack, generate, SAN_FRANCISCO_SECTIONS };
