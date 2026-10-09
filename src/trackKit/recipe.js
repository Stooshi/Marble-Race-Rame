'use strict';

/**
 * The track recipe (build plan, "Track recipe: the standard every track must
 * meet"), checked automatically on every kit track. What can be told from the
 * file is checked here, before a single race is run; what only races can tell
 * (pace, fairness, overtakes, gaps, hop heights) is checked by the track report.
 * Each problem names the rule and the section, in plain words.
 */

const { SHARP_RADIUS } = require('./parts');

const MIN_SPIRAL_RADIUS = 40;  // Table Mountain Run's corkscrew
const MIN_SWEEP_RADIUS = 45;   // San Francisco's Embarcadero
const FLAT = 0.02;             // a slope gentler than this counts as flat…
const MAX_FLAT_M = 10;         // …and may last at most one crest step
const STEEPEST_CLIMB = -0.15;  // proven climbs: San Francisco's -0.12 (Russian Hill)
const LONGEST_CLIMB_M = 40;    // San Francisco's 35 m
const BILLBOARDS = [4, 6];
const OBSTACLE_FREE_FINISH_M = 25; // nothing in the marbles' way just before the line
const BRAKING_ZONE_M = 35;
const PARKED_MAX_GRADE = 0.2;     // the braking zone before the sharp bend needs a straight this long

function checkRecipe({ sections, span, generated, owner, placed, total, where }) {
  const problems = [];
  const name = (i) => sections[i].name;
  const names = new Set();
  for (const s of sections) {
    if (names.has(s.name)) problems.push(`${where(s.name)}: two sections share this name; each needs its own.`);
    names.add(s.name);
  }

  // The start: a big steep slope straight after the gate.
  const first = sections[0]?.shape;
  const firstPart = first?.parts?.[0];
  if (!first || first.shape !== 'plunge' || firstPart.grade < 0.5 || firstPart.length < 60) {
    problems.push(`${where(sections[0]?.name ?? 'start')}: the first section must be a big steep plunge (at least 60 m at a grade of 0.5 or more), so the field bursts off the line.`);
  }

  // No dead-flat stretches (except the run-in past the finish), climbs within what's proven.
  let flatRun = 0;
  generated.forEach((p, j) => {
    const i = owner[j];
    if (i === null) return;
    const sec = sections[i];
    const len = p.length ?? (p.radius * p.degrees * Math.PI) / 180 + (p.ease ?? 0);
    if (Math.abs(p.grade) < FLAT && sec.shape.shape !== 'runIn') {
      flatRun += len;
      if (flatRun > MAX_FLAT_M + 1e-9) problems.push(`${where(sec.name)}: a dead-flat stretch (${Math.round(flatRun)} m); the recipe allows none.`);
    } else flatRun = 0;
    if (p.grade < STEEPEST_CLIMB) problems.push(`${where(sec.name)}: a climb steeper than any proven one (grade ${p.grade}; at most ${STEEPEST_CLIMB}): the slowest marble might stall.`);
    if (p.grade < 0 && len > LONGEST_CLIMB_M) problems.push(`${where(sec.name)}: a climb longer than any proven one (${Math.round(len)} m; at most ${LONGEST_CLIMB_M} m).`);
  });

  // Bends: long and flowing, at most one sharp bend, with a braking zone before it.
  const sharp = [];
  generated.forEach((p, j) => {
    const i = owner[j];
    if (i === null || p.kind === 'straight') return;
    const sec = sections[i];
    if (!p.ease) problems.push(`${where(sec.name)}: every bend must ease in and out.`);
    if (p.radius < SHARP_RADIUS) sharp.push(i);
    if (sec.shape.shape === 'spiral' && p.radius < MIN_SPIRAL_RADIUS) problems.push(`${where(sec.name)}: a spiral needs a radius of at least ${MIN_SPIRAL_RADIUS} m to flow (got ${p.radius} m).`);
    if (sec.shape.shape === 'sweep' && p.radius < MIN_SWEEP_RADIUS) problems.push(`${where(sec.name)}: a sweep needs a radius of at least ${MIN_SWEEP_RADIUS} m (got ${p.radius} m).`);
  });
  const sharpSections = [...new Set(sharp)];
  if (sharpSections.length > 1) {
    problems.push(`${where(name(sharpSections[1]))}: a second sharp bend (tighter than ${SHARP_RADIUS} m); the recipe allows one per track, after "${name(sharpSections[0])}".`);
  }
  for (const i of sharpSections) {
    if (!sections[i].shape.sharp) problems.push(`${where(name(i))}: tighter than ${SHARP_RADIUS} m; only a hairpin may be a sharp bend.`);
    const before = sections[i - 1]?.shape;
    const len = before?.parts?.length === 1 && before.parts[0].kind === 'straight' ? before.parts[0].length : 0;
    if (len < BRAKING_ZONE_M) problems.push(`${where(name(i))}: the section before the sharp bend must be a straight of at least ${BRAKING_ZONE_M} m, for its braking zone.`);
  }

  // Obstacles and features: inside the track, never just before the line.
  const finishShare = 1 - OBSTACLE_FREE_FINISH_M / total;
  for (const p of placed) {
    if (!(p.at > 0 && p.at < 1)) problems.push(`${where(name(p.section))}: a ${p.kind} placed off the track.`);
    const solid = ['block', 'pileUp', 'curtain', 'swipe', 'parked', 'slalom', 'peg'].includes(p.kind);
    // Parked objects are proven only on gentle slopes (San Francisco's bus, 0.18): on a
    // steep plunge they stop marbles nearly dead and fling them off the far wall.
    if (p.kind === 'parked' && sections[p.section].shape.parts.some((x) => x.grade > PARKED_MAX_GRADE)) {
      problems.push(`${where(name(p.section))}: a parked object needs a gentle section (a grade of ${PARKED_MAX_GRADE} or less); on steeper ones it stops marbles dead and flings them off the far wall.`);
    }
    if (solid && (p.at > finishShare || sections[p.section].shape.shape === 'runIn')) {
      problems.push(`${where(name(p.section))}: a ${p.kind} within ${OBSTACLE_FREE_FINISH_M} m of the finish line; nothing may stand in the way there.`);
    }
    if (solid && sections[p.section].shape.shape === 'plunge' && p.section === 0 && p.metresIn < 25) {
      problems.push(`${where(name(p.section))}: a ${p.kind} within 25 m of the gate; the field needs room to burst off the line.`);
    }
  }

  // Billboards: 4 to 6 per track, beside straights and sweeps, never at the sharp bend or the finish.
  const boards = sections.reduce((n, s) => n + (s.billboards || 0), 0);
  if (boards < BILLBOARDS[0] || boards > BILLBOARDS[1]) problems.push(`${where('billboards')}: ${boards} billboards; every track has ${BILLBOARDS[0]} to ${BILLBOARDS[1]}.`);
  sections.forEach((s) => {
    if (!s.billboards) return;
    if (s.shape.sharp || s.shape.shape === 'runIn') problems.push(`${where(s.name)}: no billboards at the sharp bend or the finish; put them along a straight or a sweep.`);
  });

  return problems;
}

module.exports = { checkRecipe, MIN_SPIRAL_RADIUS, MIN_SWEEP_RADIUS, BILLBOARDS };
