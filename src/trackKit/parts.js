'use strict';

/**
 * The track kit's building blocks: section shapes, obstacles and features.
 * Each helper returns a plain description; track() (./index.js) turns a list of
 * them into a finished track. Every number here is copied from a track that
 * has already passed its fairness batches (Bobsleigh Run, San Francisco or
 * Table Mountain Run), so a new track starts from proven physics and only its
 * placement needs tuning.
 */

const SHARP_RADIUS = 35; // metres: a bend tighter than this is a sharp bend (the recipe allows one per track)
const EASE = 15;         // metres a flowing bend takes to tighten and loosen (Table Mountain Run)

// ── Section shapes ──────────────────────────────────────────────────────────
// Each shape is one or more generated sections ('parts'): { kind, length or
// radius + degrees, grade, ease }. `grade` is metres of drop per metre.

const turn = (side) => {
  if (side !== 'left' && side !== 'right') throw new Error(`a bend needs side: 'left' or 'right' (got ${JSON.stringify(side)})`);
  return side;
};

/** A steep straight drop. The first section after the gate must be one (the recipe's big starting slope). */
function plunge(length, { grade = 0.34 } = {}) {
  return { shape: 'plunge', parts: [{ kind: 'straight', length, grade }] };
}

/** A gentler straight. */
function straight(length, { grade = 0.13 } = {}) {
  return { shape: 'straight', parts: [{ kind: 'straight', length, grade }] };
}

/**
 * A short climb hit at speed, rounded off over the top (San Francisco's crests)
 * so marbles roll over and on down instead of flying: the slope steepens 0.04
 * every 10 m from the climb's grade to `after`.
 */
function climb(length, { grade = -0.1, after = 0.3 } = {}) {
  const parts = [{ kind: 'straight', length, grade }];
  for (let g = grade + 0.04; g < after - 1e-9; g += 0.04) parts.push({ kind: 'straight', length: 10, grade: Math.round(g * 100) / 100 });
  return { shape: 'climb', parts };
}

/** Two flowing bends, one each way (Table Mountain Run's S-bends). */
function sBends({ first = 'left', radius = 70, degrees = 50, grade = 0.17 } = {}) {
  const second = turn(first) === 'left' ? 'right' : 'left';
  return {
    shape: 'sBends',
    parts: [
      { kind: first, radius, degrees, grade, ease: EASE },
      { kind: second, radius, degrees, grade, ease: EASE },
    ],
  };
}

/** A long banked sweep. */
function sweep({ side, radius = 75, degrees = 130, grade = 0.1 } = {}) {
  return { shape: 'sweep', side: turn(side), parts: [{ kind: side, radius, degrees, grade, ease: EASE }] };
}

/** A wide flowing spiral (Table Mountain Run's corkscrew: 40 m radius, easing in and out). */
function spiral({ side, radius = 40, turns = 1, grade = 0.21 } = {}) {
  return { shape: 'spiral', side: turn(side), parts: [{ kind: side, radius, degrees: 360 * turns, grade, ease: EASE }] };
}

/**
 * The track's one sharp bend. The kit puts a braking zone on the section before
 * it automatically (Table Mountain Run's), so that section must be a straight.
 */
function hairpin({ side, radius = 20, degrees = 180, grade = 0.16 } = {}) {
  return { shape: 'hairpin', side: turn(side), sharp: true, parts: [{ kind: side, radius, degrees, grade, ease: 8 }] };
}

/**
 * A splitter: the field divides round something and rejoins. Three parts: the
 * straight in, the bend (or a straight, with degrees 0) where the channels run
 * apart, and the straight where they merge. The wedge stands 62% of the way
 * along the straight in; the channels rejoin halfway along the merge, as on
 * Bobsleigh Run and Table Mountain Run. `balance` overrides the channel
 * settings (tipOffset, insideScrub, outsideDrag) once fairness batches say so.
 */
function splitter({ side = 'left', radius = 90, degrees = 120, grade = 0.12, approach = 90, merge = 45, balance = {} } = {}) {
  const middle = degrees ? { kind: turn(side), radius, degrees, grade, ease: EASE } : { kind: 'straight', length: 80, grade };
  // Proven starting settings: Table Mountain Run's left-hand splitter, and its right-hand one.
  const proven = side === 'right'
    ? { radius: 2.5, apart: 6, tipOffset: 2.2, insideScrub: 0.3, outsideDrag: 1.4 }
    : { radius: 2.5, apart: 6, tipOffset: -0.8, insideScrub: 1, outsideDrag: 0.6 };
  return {
    shape: 'splitter',
    side: degrees ? side : null,
    parts: [{ kind: 'straight', length: approach, grade: 0.13 }, middle, { kind: 'straight', length: merge, grade }],
    fork: { ...proven, ...balance },
  };
}

/** The run-in to the finish line. Added automatically if a track doesn't end with one. */
function runIn() {
  return { shape: 'runIn', parts: [{ kind: 'straight', length: 30, grade: 0.08 }] };
}

// The starting ramp every track opens with, straight after the gate (Bobsleigh Run's 16 m ramp).
const START_RAMP = { kind: 'straight', length: 16, grade: 1.3 };

// ── Obstacles ───────────────────────────────────────────────────────────────
// `at`: share of the way along the section (0 to 1). `line`: 'center', 'left',
// 'right', or 'high' (the outside of the section's bend). `side` for things
// that stand at a wall: 'left' or 'right' (or 'high'). `costume`: what it looks
// like (a name from the costume library); it never changes how it races.

const obstacle = (kind, fields) => ({ obstacle: kind, ...fields });

/** A block in the pack's line (an ice block on Bobsleigh Run, a baboon on Table Mountain Run). size 'large' = the snowman / giraffe. */
function block({ costume, at = 0.5, line = 'center', size = 'normal', ...tune } = {}) {
  return obstacle('block', { costume, at, line, size, tune });
}

/** Three blocks across the pack, two side by side and one 10 m behind just off centre: the first pile-up of the race. */
function pileUp({ costume, at = 0.5, ...tune } = {}) {
  return obstacle('pileUp', { costume, at, tune });
}

/** A curtain of thin solids across the high line (icicles, zebras); marbles are knocked out round them. */
function curtain({ costume, at = 0.5, side = 'high', ...tune } = {}) {
  return obstacle('curtain', { costume, at, side, tune });
}

/** Stands on the rim and swipes into the channel on a fixed timetable (polar bear, elephant). */
function swipe({ costume, at = 0.5, side = 'high', ...tune } = {}) {
  return obstacle('swipe', { costume, at, side, tune });
}

/** Parked along a wall, `length` metres down the track; marbles glance off its flank (San Francisco's bus). */
function parked({ costume, at = 0.5, side, length = 10, ...tune } = {}) {
  return obstacle('parked', { costume, at, side, length, tune });
}

// ── Features ────────────────────────────────────────────────────────────────

/** A low speed bump across the channel: the whole field hops. */
function bump({ at = 0.5 } = {}) {
  return { feature: 'bump', at };
}

/** A boost pad across the whole floor, so it favours no line. */
function boost({ at = 0.3, l = 0, length = 8, halfWidth = 3.6, kick } = {}) {
  return { feature: 'boost', at, l, length, halfWidth, ...(kick !== undefined && { kick }) };
}

/** A short, sharp braking zone (rough surface): the field bunches up, then fans out again (Table Mountain Run). */
function brake({ at = 0.7, length = 15, drag = 0.02 } = {}) {
  return { feature: 'brake', at, length, drag };
}

module.exports = {
  SHARP_RADIUS, EASE, START_RAMP,
  plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter, runIn,
  block, pileUp, curtain, swipe, parked,
  bump, boost, brake,
};
