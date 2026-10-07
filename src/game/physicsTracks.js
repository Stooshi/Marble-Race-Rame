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

const PHYSICS_TRACKS = [bobsleighRun()];

function physicsTrack(slug) {
  return PHYSICS_TRACKS.find((t) => t.slug === slug) || null;
}

module.exports = { PHYSICS_TRACKS, physicsTrack, generate };
