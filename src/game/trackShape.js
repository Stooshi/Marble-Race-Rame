'use strict';

/**
 * Turning a list of track sections into waypoints: the shape engine shared by
 * the tracks in physicsTracks.js and the track kit (src/trackKit). Moved here
 * unchanged from physicsTracks.js; the race and scene fingerprints prove every
 * track still comes out exactly the same.
 *
 * Section: { name, kind: 'straight'|'left'|'right', length (plan metres) or
 * radius + degrees, grade (metres of drop per metre, positive = downhill),
 * ease? (metres a bend takes to tighten and loosen) }.
 */

const HEIGHT_SCALE = 1.4; // the 3D view and physics stretch heights by this (trackGeometry.TRACK_STYLE)
const STEP = 8;           // plan metres between generated waypoints

// A bend with `ease` (metres) tightens gradually from straight to its radius
// over that distance, holds it, and loosens again over the same distance at the
// end: marbles sweep in and out instead of slamming into the wall. Its length
// grows by `ease`, so it still turns through its full angle at that radius.
function sectionLength(s) {
  if (s.length !== undefined) return s.length;
  return (s.radius * s.degrees * Math.PI) / 180 + (s.ease ?? 0);
}

// How much a section turns on each of its steps.
function stepTurns(s, steps) {
  if (s.kind === 'straight') return new Array(steps).fill(0);
  const total = ((s.kind === 'left' ? 1 : -1) * (s.degrees * Math.PI) / 180);
  if (!s.ease) return new Array(steps).fill(total / steps);
  // Curvature along the bend: up a ramp, flat, down a ramp (a trapezoid); each
  // step turns by the area under it, so the whole bend turns by `total`.
  const length = sectionLength(s);
  const ramp = Math.min(s.ease, length / 2);
  const area = (u) => {
    // Integral of the trapezoid (peak 1) from 0 to u.
    if (u <= ramp) return (u * u) / (2 * ramp);
    if (u <= length - ramp) return ramp / 2 + (u - ramp);
    const r = length - u;
    return length - ramp - (r * r) / (2 * ramp);
  };
  const full = area(length);
  return Array.from({ length: steps }, (_, k) => (total * (area(((k + 1) * length) / steps) - area((k * length) / steps))) / full);
}

function generate(sections) {
  // Walk the sections, collecting points every STEP metres.
  const pts = [];
  let x = 0;
  let y = 0;
  let heading = 0;
  let height = sections.reduce((h, s) => h + s.grade * sectionLength(s), 0);
  const marks = [];
  let travelled3d = 0;
  pts.push({ x, y, h: height });
  for (const s of sections) {
    const length = sectionLength(s);
    const startMark = travelled3d;
    const steps = Math.max(1, Math.round(length / STEP));
    const turns = stepTurns(s, steps);
    const d = length / steps;
    for (let k = 0; k < steps; k += 1) {
      // Arcs: advance along the chord at the mid heading.
      const turn = turns[k];
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

module.exports = { generate, sectionLength, HEIGHT_SCALE, STEP };
