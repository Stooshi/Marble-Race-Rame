'use strict';

/**
 * Tracks that exist only in the physics preview (not in the database, never
 * used by real races). Each is described as a list of sections, and the
 * waypoints are generated from them, so the shape is easy to tune by eye.
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

// Bobsleigh Olympics (working name): an icy run built for speed. Always
// downhill, never flat. A game, not a simulation: tuned to look fast.
const BOBSLEIGH_SECTIONS = [
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

function bobsleigh() {
  const g = generate(BOBSLEIGH_SECTIONS);
  const runIn = g.sections.find((s) => s.name === 'Run to the splitter');
  const merge = g.sections.find((s) => s.name === 'Merge');
  return {
    id: null,
    slug: 'bobsleigh-olympics',
    name: 'Bobsleigh Olympics',
    difficulty: 'extreme',
    description: 'An icy bobsleigh run built for speed: a splitter, a banked sweep, a hairpin, a corkscrew and a final plunge.',
    length_m: g.length_m,
    lane_count: 4,
    waypoints: g.waypoints,
    obstacles: [],
    sections: g.sections,
    // What makes it a bobsleigh run (only this track switches these on).
    physics: {
      surface: 'ice',          // very low rolling resistance
      pace: 'free',            // as fast as the slope allows: no drag added to pad the clock
      channel: { radius: 3.6, maxAngle: 80 }, // U-shaped ice channel (metres, degrees up the wall)
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
        insideScrub: 4.1,
        outsideDrag: 1,
      },
    },
    preview: true,
  };
}

const PREVIEW_TRACKS = [bobsleigh()];

function previewTrack(slug) {
  return PREVIEW_TRACKS.find((t) => t.slug === slug) || null;
}

module.exports = { PREVIEW_TRACKS, previewTrack, generate };
