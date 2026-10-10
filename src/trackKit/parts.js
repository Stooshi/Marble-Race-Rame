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

/**
 * A steep straight drop. The first section after the gate must be one (the recipe's big starting slope).
 * `from`: the grade it steepens from (the section before's), in gentle steps of 0.06 every 10 m
 * (steps that small never throw a marble, even coming off a bend at speed), so a steep plunge can
 * follow a gentle stretch; `length` is the whole of it.
 */
function plunge(length, { grade = 0.34, from = null } = {}) {
  const parts = [];
  let left = length;
  if (from !== null) {
    for (let g = from + RAMP_STEP; g < grade - 1e-9 && left > RAMP_LENGTH; g += RAMP_STEP) {
      parts.push({ kind: 'straight', length: RAMP_LENGTH, grade: Math.round(g * 100) / 100 });
      left -= RAMP_LENGTH;
    }
  }
  parts.push({ kind: 'straight', length: left, grade });
  return { shape: 'plunge', parts };
}
const RAMP_STEP = 0.06;  // the recipe's gentle step (GENTLE_STEEPEN)…
const RAMP_LENGTH = 10;  // …every 10 m

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
 * Bobsleigh Run and Table Mountain Run. `balance` overrides the settings
 * (tipOffset, left: { drag, scrub }, right: { drag, scrub }) once fairness
 * batches say so.
 */
function splitter({ side = 'left', radius = 90, degrees = 120, grade = 0.12, approach = 90, merge = 45, balance = {} } = {}) {
  const middle = degrees ? { kind: turn(side), radius, degrees, grade, ease: EASE } : { kind: 'straight', length: 80, grade };
  // Proven starting settings: Table Mountain Run's left-hand splitter, and its
  // right-hand one, with each channel's ice set on its own (`left`, `right`: drag
  // slows a marble along the channel, scrub costs it speed in the bend), so a
  // mirrored track simply swaps them. They race exactly as Table Mountain Run's.
  const proven = side === 'right'
    ? { radius: 2.5, apart: 6, tipOffset: 2.2, left: { drag: 1, scrub: 0.3 }, right: { drag: 1.4, scrub: 1 } }
    : { radius: 2.5, apart: 6, tipOffset: -0.8, left: { drag: 1, scrub: 1 }, right: { drag: 0.6, scrub: 1 } };
  return {
    shape: 'splitter',
    side: degrees ? side : null,
    parts: [{ kind: 'straight', length: approach, grade: 0.13 }, middle, { kind: 'straight', length: merge, grade }],
    fork: {
      ...proven, ...balance,
      left: { ...proven.left, ...balance.left },
      right: { ...proven.right, ...balance.right },
    },
  };
}

/**
 * A waterfall plunge: a steep straight down a waterfall chute, with water
 * falling alongside (and, with `curtain`, a see-through sheet of water the
 * marbles race through). Its lip eases in automatically, the slope steepening
 * by LIP_STEP every LIP_LENGTH metres, so marbles pour over the edge instead of
 * flying off it. It can open the track (straight after the gate).
 */
function waterfall(length, { grade = 0.6, curtain = false } = {}) {
  return { shape: 'waterfall', lip: true, curtain, parts: [{ kind: 'straight', length, grade }] };
}
// Measured: 0.12 steps every 8 m threw marbles 3.6 m up, 0.06 steps 1.3-2 m at 41 m/s.
// A marble stays on the ice while the slope steepens by less than about g / v² per metre:
// 0.03 every 8 m holds it there up to about 50 m/s.
const LIP_STEP = 0.03;
const LIP_LENGTH = 8;

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

/**
 * Parked along a wall, `length` metres down the track, on a gentle section:
 * marbles are knocked aside round its open side (Table Mountain Run's elephant
 * and zebras), one hit per marble however much of its flank they scrape.
 */
function parked({ costume, at = 0.5, side, length = 10, ...tune } = {}) {
  return obstacle('parked', { costume, at, side, length, tune });
}

/**
 * Slalom gates: thin poles the pack glances off (a quarter of the usual cost per
 * hit, never a stop), `count` of them from `from` to `to` along the section,
 * alternating left and right of the middle, as on a ski piste.
 */
function slalom({ costume = 'slalom-gate', from = 0.35, to = 0.9, count = 4, offset = 0.3, first = 'left', ...tune } = {}) {
  return obstacle('slalom', { costume, from, to, count, offset, first, at: from, tune });
}

/** A small round piece in the pack's line that marbles glance off (a slalom gate's physics, bigger): Go stones, Xiangqi pieces. */
function peg({ costume, at = 0.5, line = 'center', radius = 0.4, ...tune } = {}) {
  return obstacle('peg', { costume, at, line, radius, tune });
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

/** Moguls: a row of low bumps the field hops over one after another (the Swiss Wall, sastrugi, rapids). */
function moguls({ from = 0.2, to = 0.85, count = 5 } = {}) {
  return { feature: 'moguls', from, to, count, at: from };
}

/**
 * Steps: small regular bumps over a rough stretch that slows the field
 * (the Selarón Steps); follow them with a plunge to pick the speed back up.
 */
function steps({ from = 0.1, to = 0.8, count = 6, drag = 0.015, tiles } = {}) {
  return { feature: 'steps', from, to, count, drag, at: from, ...(tiles && { tiles }) }; // tiles: 'mosaic' (the Selarón Steps' colours)
}

/** A short, sharp braking zone (rough surface): the field bunches up, then fans out again (Table Mountain Run). */
function brake({ at = 0.7, length = 15, drag = 0.02 } = {}) {
  return { feature: 'brake', at, length, drag };
}

module.exports = {
  SHARP_RADIUS, EASE, START_RAMP, LIP_STEP, LIP_LENGTH,
  plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter, waterfall, runIn,
  block, pileUp, curtain, swipe, parked, slalom, peg,
  bump, boost, brake, moguls, steps,
  TUNNELS: ['mine', 'ice-cave', 'dragon', 'rock', 'roots'],
  BRIDGES: ['ice', 'stone', 'wood'],
  // Scenery names (looks only; the 3D view draws them, client/src/three/scenery/kit*.js).
  SURFACES: ['ice', 'snow', 'sand', 'stone', 'water'],
  BIOMES: ['alpine', 'arctic', 'meadow', 'desert', 'jungle', 'city'],
  LANDMARKS: ['church', 'mountain-hut', 'big-rock', 'lighthouse', 'horse-sleigh', 'border-post',
    'lift-station', 'mine-buildings', 'snow-park', 'base-camp',
    'sacre-coeur', 'moulin-rouge', 'fountains', 'louvre-pyramid', 'notre-dame', 'eiffel-tower', 'seine', 'bookstalls',
    'bedouin-camp', 'museum-of-the-future', 'dubai-frame', 'burj-al-arab', 'burj-khalifa', 'palm-boardwalk', 'dune-buggy',
    'toucan-tree', 'river-pool', 'teatro-amazonas', 'river-dock',
    'corcovado', 'sugarloaf', 'maracana', 'parrot-tree', 'copacabana'],
  OVERHEAD: ['gondola', 'cable-car', 'chairlift', 'vulture'],
  // What stands in the middle of a splitter, between its two channels (the arch: over one of
  // them), or in the middle of a spiral or a hairpin.
  AROUND: ['mountain-hut', 'big-rock', 'mountain-restaurant', 'mine-headframe', 'nunatak', 'bell-tower', 'arc-de-triomphe', 'obelisk', 'notre-dame', 'oasis', 'twisted-tower', 'river-island', 'anaconda'],
  // Scenery near a section (or the start or finish): what grows and stands beside the track there.
  SCENERY: ['bare', 'rocks', 'birches', 'pines', 'race-netting', 'funicular', 'wooden-houses', 'frozen-lake',
    'wood-clad', 'chalets', 'pasture', 'aspens', 'shopfronts',
    'stone-houses', 'colourful-houses', 'icefjord', 'haussmann', 'plane-trees', 'skyscrapers', 'stilt-houses'],
  // Billboard frames: plain, a jungle timber frame, a city LED screen, a Paris advertising column, expedition crates.
  FRAMES: ['plain', 'wood', 'led', 'column', 'crates'],
};
