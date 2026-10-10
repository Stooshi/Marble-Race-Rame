'use strict';

/**
 * The track recipe (build plan, "Track recipe: the standard every track must
 * meet"), checked automatically on every kit track. What can be told from the
 * file is checked here, before a single race is run; what only races can tell
 * (pace, fairness, overtakes, gaps, hop heights) is checked by the track report.
 * Each problem names the rule and the section, in plain words.
 */

const { SHARP_RADIUS, TUNNELS, BRIDGES, SURFACES, BIOMES, LANDMARKS, OVERHEAD, FRAMES, AROUND, SCENERY, CROWDS, BARRIERS } = require('./parts');

const MIN_SPIRAL_RADIUS = 40;  // Table Mountain Run's corkscrew
const MIN_SWEEP_RADIUS = 45;   // San Francisco's Embarcadero
const FLAT = 0.02;             // a slope gentler than this counts as flat…
const MAX_FLAT_M = 10;         // …and may last at most one crest step
const STEEPEST_CLIMB = -0.15;  // proven climbs: San Francisco's -0.12 (Russian Hill)
const LONGEST_CLIMB_M = 40;    // San Francisco's 35 m
const { LIGHTINGS } = require('./lighting');

const BILLBOARDS = [4, 6];
const GRAND_PRIX_BILLBOARDS = [4, 8]; // trackside advertising suits a Grand Prix: up to 8
const BILLBOARD_SHAPES = ['straight', 'plunge', 'climb', 'sBends', 'sweep'];
const OBSTACLE_FREE_FINISH_M = 25; // nothing in the marbles' way just before the line
const BRAKING_ZONE_M = 35;
const PARKED_MAX_GRADE = 0.2;
const MAX_STEEPEN = 0.13;      // Table Mountain Run's into its final plunge (hops about 1 m); Bobsleigh Run's 0.14 hops 1.6 m
const GENTLE_STEEPEN = 0.06;   // steps this small never throw a marble
const STEEPEN_GAP_M = 30;
const WATERFALL_RUN_IN_M = 30;
const BUMP_AFTER_BLOCK_M = 40; // 31 m still threw marbles 1.5 m (track report, Kit Proving Ground's final plunge)
const MOGULS_AFTER_BEND_M = 30;      // between bigger steps, so marbles have landed
const MAX_BUMPS_IN_ROW = 8;
const MIN_BUMP_SPACING_M = 5;     // the braking zone before the sharp bend needs a straight this long

function checkRecipe({ spec, sections, span, generated, owner, placed, total, where }) {
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
  if (!first || !['plunge', 'waterfall'].includes(first.shape) || firstPart.grade < 0.5 || firstPart.length < 60) {
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

  // No sudden steepening: a crest taken at speed throws marbles into the air
  // (measured: a single step of 0.12 throws them 0.7 m; two such steps 8 m apart, 3.6 m;
  // steps of 0.06 every 8 m, as a waterfall's lip eases in, not at all).
  let lastBig = -Infinity; // metres along the track of the last step steeper than GENTLE_STEEPEN
  let at = 0;
  for (let j = 1; j < generated.length; j += 1) {
    const prev = generated[j - 1];
    at += prev.length ?? (prev.radius * prev.degrees * Math.PI) / 180 + (prev.ease ?? 0);
    const rise = generated[j].grade - prev.grade;
    if (rise <= GENTLE_STEEPEN + 1e-9 || owner[j] === null) continue;
    if (rise > MAX_STEEPEN + 1e-9) {
      problems.push(`${where(name(owner[j]))}: steepens too suddenly (from a grade of ${prev.grade} to ${generated[j].grade}); at speed that throws marbles into the air. Ease it in (at most ${MAX_STEEPEN} at a time) or make it a waterfall, whose lip eases in by itself.`);
    } else if (at - lastBig < STEEPEN_GAP_M) {
      problems.push(`${where(name(owner[j]))}: steepens again only ${Math.round(at - lastBig)} m after the last time; marbles still in the air are thrown higher. Leave ${STEEPEN_GAP_M} m between, or ease it in by ${GENTLE_STEEPEN} at a time.`);
    }
    lastBig = at;
  }

  // A waterfall after a straight: marbles still riding high on the wall out of a
  // bend are flung off its lip (measured: 2.5 m, from a sweep straight into the lip).
  sections.forEach((s, i) => {
    if (s.shape.shape !== 'waterfall' || i === 0) return;
    const before = sections[i - 1].shape;
    const last = before.parts[before.parts.length - 1];
    if (last.kind !== 'straight' || last.length < WATERFALL_RUN_IN_M) {
      problems.push(`${where(s.name)}: a waterfall needs a straight of at least ${WATERFALL_RUN_IN_M} m before it, so the field comes down off the walls before the lip.`);
    }
  });

  // Tunnels and bridges: known kinds, on sections that can carry them.
  sections.forEach((s, i) => {
    if (s.tunnel !== undefined) {
      if (!TUNNELS.includes(s.tunnel)) problems.push(`${where(s.name)}: unknown tunnel ${JSON.stringify(s.tunnel)} (${TUNNELS.join(', ')}).`);
      if (s.shape.shape === 'splitter') problems.push(`${where(s.name)}: no tunnel over a splitter.`);
      if (i === 0 || s.shape.shape === 'runIn') problems.push(`${where(s.name)}: no tunnel at the start or the finish (the gate and finish cameras need open sky).`);
    }
    if (s.bridge !== undefined) {
      if (!BRIDGES.includes(s.bridge)) problems.push(`${where(s.name)}: unknown bridge ${JSON.stringify(s.bridge)} (${BRIDGES.join(', ')}).`);
      if (s.shape.shape === 'splitter') problems.push(`${where(s.name)}: no bridge under a splitter.`);
    }
    if (s.tunnel !== undefined && s.bridge !== undefined) problems.push(`${where(s.name)}: a section is a tunnel or a bridge, not both.`);
  });

  // Scenery names: a typo is caught here, not found missing on screen.
  const known = (what, list, value, at) => {
    if (value !== undefined && !list.includes(value)) problems.push(`${where(at)}: unknown ${what} ${JSON.stringify(value)} (${list.join(', ')}).`);
  };
  known('surface', SURFACES, spec.surface, 'track');
  known('biome', BIOMES, spec.biome, 'track');
  known('billboard frame', FRAMES, spec.billboardFrame, 'track');
  known('lighting', LIGHTINGS, spec.lighting, 'track');
  // A Grand Prix track: its crowd and barriers by name.
  if (spec.grandPrix !== undefined && spec.grandPrix !== true) {
    if (typeof spec.grandPrix !== 'object' || spec.grandPrix === null) problems.push(`${where('track')}: grandPrix is true, or { crowd, barrier }.`);
    else {
      known('Grand Prix crowd', CROWDS, spec.grandPrix.crowd, 'track');
      known('Grand Prix barrier', BARRIERS, spec.grandPrix.barrier, 'track');
      const every = spec.grandPrix.groupsEvery;
      if (every !== undefined && !(Number.isFinite(every) && every >= 230 && every <= 1000)) problems.push(`${where('track')}: grandPrix.groupsEvery is the metres between the small groups of spectators, 230 (the usual) to 1000.`);
    }
  }
  // The signature moment (the report's screenshot of it): a section of this track.
  if (spec.signature !== undefined && !sections.some((s) => s.name === spec.signature)) problems.push(`${where('track')}: the signature "${spec.signature}" is not one of this track's sections.`);
  if (spec.designChanges !== undefined && !(Array.isArray(spec.designChanges) && spec.designChanges.every((c) => typeof c === 'string'))) problems.push(`${where('track')}: designChanges is a list of sentences (where the build differs from the design, and why).`);
  if (spec.variants !== undefined && !Array.isArray(spec.variants)) problems.push(`${where('track')}: variants is a list of lighting presets (${LIGHTINGS.join(', ')}).`);
  for (const v of Array.isArray(spec.variants) ? spec.variants : []) known('lighting variant', LIGHTINGS, v, 'track');
  if (Array.isArray(spec.variants) && (new Set(spec.variants).size !== spec.variants.length || spec.variants.includes(spec.lighting || 'day'))) {
    problems.push(`${where('track')}: each lighting variant once, and not the track's own preset (${spec.lighting || 'day'}).`);
  }
  known('landmark', LANDMARKS, spec.start?.landmark, 'start');
  known('landmark', LANDMARKS, spec.finish?.landmark, 'finish');
  for (const where_ of ['start', 'finish']) for (const sc of spec[where_]?.scenery ?? []) known('scenery', SCENERY, sc, where_);
  sections.forEach((s) => {
    for (const sc of s.scenery ?? []) known('scenery', SCENERY, sc, s.name);
    known('splitter centrepiece', AROUND, s.around, s.name);
    if (s.around !== undefined && !['splitter', 'spiral', 'hairpin'].includes(s.shape.shape)) problems.push(`${where(s.name)}: only a splitter, a spiral or a hairpin has a middle to stand something in (around).`);
    known('surface', SURFACES, s.surface, s.name);
    known('billboard frame', FRAMES, s.billboardFrame, s.name);
    for (const lm of s.landmarks ?? []) known('landmark', LANDMARKS, lm.name, s.name);
    for (const o of s.overhead ?? []) known('lift', OVERHEAD, o, s.name);
    for (const f of (s.features ?? []).filter((x) => x.feature === 'paint')) known('paint', ['go-board', 'xiangqi'], f.look, s.name);
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
    // …and on straights: parked on a bend it traps a marble against it for seconds (measured:
    // a dune buggy on S-bends held the last marble 8 s, the last one home at 89 s).
    if (p.kind === 'parked' && sections[p.section].shape.parts.some((x) => x.kind !== 'straight')) {
      problems.push(`${where(name(p.section))}: a parked object needs a straight; on a bend it traps marbles against it.`);
    }
    if (solid && (p.at > finishShare || sections[p.section].shape.shape === 'runIn')) {
      problems.push(`${where(name(p.section))}: a ${p.kind} within ${OBSTACLE_FREE_FINISH_M} m of the finish line; nothing may stand in the way there.`);
    }
    if (solid && sections[p.section].shape.shape === 'plunge' && p.section === 0 && p.metresIn < 25) {
      problems.push(`${where(name(p.section))}: a ${p.kind} within 25 m of the gate; the field needs room to burst off the line.`);
    }
  }

  // No bumps just after a block: marbles flung off it land on the bumps and bounce high
  // (measured: 2.5 m with moguls 10 m behind a block; Table Mountain Run keeps 24 m).
  const blocks = placed.filter((x) => x.kind === 'block' || x.kind === 'pileUp');
  for (const p of placed.filter((x) => ['bump', 'moguls', 'steps'].includes(x.kind))) {
    const close = blocks.find((b) => p.at > b.at && (p.at - b.at) * total < BUMP_AFTER_BLOCK_M);
    if (close) problems.push(`${where(name(p.section))}: ${p.kind === 'bump' ? 'a bump' : p.kind} only ${Math.round((p.at - close.at) * total)} m after a block; marbles flung off the block land on them and bounce high. Leave ${BUMP_AFTER_BLOCK_M} m.`);
  }

  // Moguls and steps where the field rides low: marbles still high on the wall out of
  // a bend are thrown off it by a bump (measured: up to 10 m, moguls just after a spiral).
  // Positions (`at`) are shares of the distance along the slope, so bends are measured that way too.
  let run = 0;
  const bends = []; // [start, end] in metres along the slope of every bend
  generated.forEach((p) => {
    const len = (p.length ?? (p.radius * p.degrees * Math.PI) / 180 + (p.ease ?? 0)) * Math.sqrt(1 + p.grade * p.grade);
    if (p.kind !== 'straight') bends.push([run, run + len]);
    run += len;
  });
  for (const p of placed.filter((x) => x.kind === 'moguls' || x.kind === 'steps')) {
    const startM = p.at * run;
    const endM = startM + p.spacing * Math.max(0, p.count - 1);
    if (bends.some(([a, b]) => a < endM && b > startM)) {
      problems.push(`${where(name(p.section))}: ${p.kind} on a bend; marbles riding high on the wall are thrown off it. Put them on a straight.`);
      continue;
    }
    const bendEnd = Math.max(-Infinity, ...bends.map(([, b]) => b).filter((b) => b <= startM + 1e-6));
    if (startM - bendEnd < MOGULS_AFTER_BEND_M) problems.push(`${where(name(p.section))}: ${p.kind} only ${Math.round(startM - bendEnd)} m after a bend; marbles still high on the wall are thrown off it. Leave ${MOGULS_AFTER_BEND_M} m of straight.`);
  }

  // Moguls and steps: low bumps far enough apart to hop one at a time.
  for (const p of placed.filter((x) => x.kind === 'moguls' || x.kind === 'steps')) {
    if (p.count > MAX_BUMPS_IN_ROW) problems.push(`${where(name(p.section))}: ${p.count} ${p.kind} in a row; at most ${MAX_BUMPS_IN_ROW}.`);
    if (p.count > 1 && p.spacing < MIN_BUMP_SPACING_M) problems.push(`${where(name(p.section))}: ${p.kind} ${p.spacing.toFixed(1)} m apart; at least ${MIN_BUMP_SPACING_M} m.`);
  }

  // Billboards: 4 to 6 per track, beside straights and sweeps, never at the sharp bend or the finish.
  const boards = sections.reduce((n, s) => n + (s.billboards || 0), 0);
  const [fewest, most] = spec.grandPrix ? GRAND_PRIX_BILLBOARDS : BILLBOARDS;
  if (boards < fewest || boards > most) problems.push(`${where('billboards')}: ${boards} billboards; every ${spec.grandPrix ? 'Grand Prix ' : ''}track has ${fewest} to ${most}.`);
  sections.forEach((s) => {
    if (!s.billboards) return;
    if (!Number.isInteger(s.billboards) || s.billboards < 1) problems.push(`${where(s.name)}: billboards is a number of billboards (1, 2…).`);
    if (s.shape.sharp || s.shape.shape === 'runIn') problems.push(`${where(s.name)}: no billboards at the sharp bend or the finish; put them along a straight or a sweep.`);
    else if (!BILLBOARD_SHAPES.includes(s.shape.shape)) problems.push(`${where(s.name)}: billboards stand along a straight, a plunge, a climb, S-bends or a sweep, where the follow camera looks (not a ${s.shape.shape}).`);
    if (s.tunnel !== undefined || s.bridge !== undefined) problems.push(`${where(s.name)}: no billboards in a tunnel or on a bridge (nowhere to stand them).`);
  });

  return problems;
}

module.exports = { checkRecipe, MIN_SPIRAL_RADIUS, MIN_SWEEP_RADIUS, BILLBOARDS, GRAND_PRIX_BILLBOARDS };
