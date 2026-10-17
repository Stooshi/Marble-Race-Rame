'use strict';

/**
 * The track kit: a new track is one file (src/tracks/<slug>.js) that reads like
 * a design in "New Track Designs": theme, start, finish, then one entry per
 * section with its shape, obstacles, features and scenery. track() turns it
 * into the same kind of track as physicsTracks.js builds by hand (waypoints,
 * physics features, splitters), checks it against the track recipe
 * (./recipe.js), and refuses it, naming the rule and the section, if it breaks
 * one.
 *
 * Positions are written per section ("halfway along the Hairpin"); the kit
 * works out where that is on the whole track. Looks (costumes, surface,
 * scenery, billboards, lighting) ride along in `physics.kit` for the 3D view;
 * the race engine never reads them.
 */

const { generate } = require('../game/trackShape');
const parts = require('./parts');
const { checkRecipe, isCoaster, isPinball, isArcade, isCanyon, isBlock, isAthletics } = require('./recipe');

const round4 = (x) => Math.round(x * 10000) / 10000;

// The proven race settings every kit track shares: Bobsleigh Run's channel,
// gate, start and collisions (as on Table Mountain Run).
const BASE_PHYSICS = {
  surface: 'ice',
  pace: 'free',
  channel: { radius: 3.6, maxAngle: 80, funnel: { length: 70, radius: 22, spacing: 1.15, stagger: 0.2, release: 0.45 } },
  gate: { countdownMs: 3000 },
  collisions: true,
};
const RUNOUT = { length: 30, halfWidth: 3.5 };
// Coasters: how high the track flies above the land where a section doesn't say, and its colours.
const COASTER_HEIGHT = 16;
const COASTER_COLOURS = { rail: '#c9ced6', support: '#c43a2f', tie: '#5b616b' };
// Slalom gates and pegs glance marbles aside (the engine's sweep: they never
// hold a marble up), each fresh hit costing this share of its speed.
const SLALOM_LOSS = 0.1;

// Billboards stand at least this far (along the track) from any obstacle, and from the line.
const BOARD_CLEAR_M = 12;
const BOARD_FINISH_M = 25;
const SOLID_KINDS = ['block', 'pileUp', 'curtain', 'swipe', 'parked', 'slalom', 'peg'];

// What each kit obstacle races as: the footprint and settings of a proven obstacle.
const WALL = { left: 1, right: -1 }; // positive l is the left wall

/** Builds the finished track from a track file's description. */
function track(spec) {
  const problems = [];
  const where = (name) => `${spec.name || spec.slug}, "${name}"`;

  // 1. The sections, each made of one or more generated parts, after the starting ramp:
  // the opening's (from the library) first, if the track has one, then its own (or its layout's).
  const openingSections = spec.opening?.sections ?? [];
  const sections = [...openingSections, ...(spec.sections || [])];
  if (!sections.length || sections[sections.length - 1].shape?.shape !== 'runIn') sections.push({ name: 'Finish', shape: parts.runIn() });
  const generated = [{ name: 'Starting ramp', ...parts.START_RAMP }];
  const owner = [null]; // which section each generated part belongs to
  sections.forEach((sec, i) => {
    if (!sec.shape?.parts) {
      problems.push(`${where(sec.name)}: needs a shape (plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter, runIn).`);
      return;
    }
    // A waterfall's lip: the slope steepens a step at a time from the one before it.
    const lip = [];
    if (sec.shape.lip) {
      const fall = sec.shape.parts[0].grade;
      for (let g = generated[generated.length - 1].grade + parts.LIP_STEP; g < fall - 1e-9; g += parts.LIP_STEP) {
        lip.push({ kind: 'straight', length: parts.LIP_LENGTH, grade: Math.round(g * 100) / 100 });
      }
    }
    const all = [...lip, ...sec.shape.parts];
    all.forEach((p, k) => {
      generated.push({ ...p, name: all.length > 1 ? `${sec.name} · ${k + 1}` : sec.name });
      owner.push(i);
    });
  });
  const g = generate(generated);

  // Where each section runs, as shares of the whole track, and its parts.
  const span = sections.map(() => ({ from: Infinity, to: -Infinity, parts: [] }));
  g.sections.forEach((m, j) => {
    const i = owner[j];
    if (i === null || i === undefined) return;
    span[i].from = Math.min(span[i].from, m.from);
    span[i].to = Math.max(span[i].to, m.to);
    span[i].parts.push({ ...m, part: generated[j] });
  });
  const total = g.length_m;
  const along = (i, share) => round4(span[i].from + share * (span[i].to - span[i].from));
  const metres = (i) => (span[i].to - span[i].from) * total;

  // A wall side, from 'left', 'right' or 'high' (the outside of the section's bend).
  const wallOf = (i, side) => {
    if (side === 'left' || side === 'right') return WALL[side];
    const bend = sections[i].shape?.side;
    if (side === 'high' && bend) return bend === 'left' ? WALL.right : WALL.left;
    problems.push(`${where(sections[i].name)}: say which side (left or right): this section has no single bend to tell the high line from.`);
    return WALL.right;
  };
  const lineOf = (i, line) => {
    if (typeof line === 'number') return line;
    if (line === 'center') return 0;
    if (line === 'left') return 0.35;
    if (line === 'right') return -0.35;
    if (line === 'high') return wallOf(i, 'high') * 0.35;
    problems.push(`${where(sections[i].name)}: unknown line ${JSON.stringify(line)} (center, left, right, high).`);
    return 0;
  };

  // 2. Obstacles and features, placed per section.
  const features = [];
  const placed = []; // what the recipe checks look at: { section, kind, at, ... }
  sections.forEach((sec, i) => {
    if (!span[i].parts.length) return;
    for (const o of sec.obstacles || []) {
      if (!o?.obstacle) {
        problems.push(`${where(sec.name)}: obstacles must come from the kit (block, pileUp, curtain, swipe, parked, slalom, peg).`);
        continue;
      }
      const at = along(i, o.at);
      const look = o.costume ? { look: o.costume } : {};
      if (o.obstacle === 'block') {
        const big = o.size === 'large';
        features.push({ type: big ? 'snowman' : 'ice_block', ...look, at, l: lineOf(i, o.line), radius: big ? 0.9 : 0.75, height: big ? 2.4 : 1.2, ...o.tune });
      } else if (o.obstacle === 'pileUp') {
        // Two either side of the pack, one 10 m behind just off centre (no starting place gets an edge).
        features.push({ type: 'ice_block', ...look, at, l: -0.35, radius: 0.75, height: 1.2, ...o.tune });
        features.push({ type: 'ice_block', ...look, at, l: 0.35, radius: 0.75, height: 1.2, ...o.tune });
        features.push({ type: 'ice_block', ...look, at: round4(at + 10 / total), l: 0.12, radius: 0.8, height: 1.2, ...o.tune });
      } else if (o.obstacle === 'curtain') {
        const s = wallOf(i, o.side);
        features.push({ type: 'icicles', ...look, at, l: s, l2: s * 0.5, radius: 0.35, parked: true, loss: 0.2, ...o.tune });
      } else if (o.obstacle === 'swipe') {
        const s = wallOf(i, o.side);
        features.push({ type: 'polar_bear', ...look, at, l: s * 1.25, reach: s * 0.55, radius: 0.7, height: 1.5, parked: true, loss: 0.2, ...o.tune });
      } else if (o.obstacle === 'parked') {
        const s = wallOf(i, o.side ?? 'high');
        // Knocked aside round its open side (Table Mountain Run's elephant and zebras), one hit
        // per marble however much of its flank it scrapes: San Francisco's bus ricochets
        // marbles instead, and parked where the pack rides it left the field 22 s apart.
        features.push({ type: 'bus', ...look, at, l: s, l2: s * 0.68, length: o.length, radius: 0.4, height: 3, parked: true, onePiece: true, loss: 0.15, ...o.tune });
      } else if (o.obstacle === 'slalom') {
        // Poles alternating either side of the middle, evenly along the stretch.
        const sign = o.first === 'right' ? -1 : 1;
        for (let k = 0; k < o.count; k += 1) {
          const share = o.count > 1 ? o.from + ((o.to - o.from) * k) / (o.count - 1) : o.from;
          const pole = along(i, share);
          features.push({ type: 'slalom_gate', ...look, at: pole, l: sign * (k % 2 ? -1 : 1) * o.offset, radius: 0.15, height: 1.6, sweep: true, loss: SLALOM_LOSS, ...o.tune });
          placed.push({ section: i, kind: 'slalom', at: pole, metresIn: share * metres(i) });
        }
        continue;
      } else if (o.obstacle === 'peg') {
        features.push({ type: 'slalom_gate', ...look, at, l: lineOf(i, o.line), radius: o.radius, height: 0.6, sweep: true, loss: SLALOM_LOSS, ...o.tune });
      } else {
        problems.push(`${where(sec.name)}: unknown obstacle ${JSON.stringify(o.obstacle)}.`);
        continue;
      }
      placed.push({ section: i, kind: o.obstacle, at, metresIn: o.at * metres(i) });
    }
    for (const f of (sec.features || []).flat()) {
      const at = along(i, f.at);
      if (f.feature === 'moguls' || f.feature === 'steps') {
        // A row of low bumps, evenly along the stretch (steps: over a rough, slowing surface).
        for (let k = 0; k < f.count; k += 1) {
          const share = f.count > 1 ? f.from + ((f.to - f.from) * k) / (f.count - 1) : f.from;
          features.push({ type: 'bump', at: along(i, share), ...(f.look && { look: f.look }) }); // (look 'rumble': rumble strips)
        }
        if (f.feature === 'steps') features.push({ type: 'cobbles', at, length: Math.round((f.to - f.from) * metres(i) * 10) / 10, drag: f.drag, look: f.tiles === 'mosaic' ? 'mosaic' : 'steps' });
        placed.push({ section: i, kind: f.feature, at, count: f.count, spacing: ((f.to - f.from) * metres(i)) / Math.max(1, f.count - 1) });
        continue;
      }
      if (f.feature === 'box') {
        // A jib part: a raised flat top (box, rail, table top) from `at` for `length` metres.
        features.push({ type: 'box', at, length: f.length, l: lineOf(i, f.line), half: f.width / 2, height: f.height, ...(f.down && { down: f.down }), look: f.part });
        placed.push({ section: i, kind: f.part, at, length: f.length, width: f.width, height: f.height, down: f.down ?? 0 });
        continue;
      }
      if (f.feature === 'bump') features.push({ type: 'bump', at });
      else if (f.feature === 'boost') features.push({ type: 'boost', at, l: f.l, length: f.length, halfWidth: f.halfWidth, ...(f.kick !== undefined && { kick: f.kick }) });
      else if (f.feature === 'brake') features.push({ type: 'cobbles', at, length: f.length, drag: f.drag });
      else if (f.feature === 'paint') { features.push({ type: 'paint', at, length: Math.round((f.to - f.from) * metres(i) * 10) / 10, look: f.look }); continue; } // (looks only)
      else {
        problems.push(`${where(sec.name)}: features must come from the kit (bump, boost, brake, moguls, steps, paint, rumble, box, rail, tableTop).`);
        continue;
      }
      placed.push({ section: i, kind: f.feature, at });
    }
    // The braking zone before the one sharp bend, on the straight before it (Table Mountain Run's).
    if (sec.shape?.sharp && i > 0) {
      features.push({ type: 'cobbles', at: along(i - 1, 0.35), length: 35, drag: 0.004 });
      placed.push({ section: i - 1, kind: 'brakeBeforeSharp', at: along(i - 1, 0.35), length: 35 });
    }
  });
  features.sort((a, b) => a.at - b.at);

  // 2b. Billboards: `billboards: n` on a section stands n of them beside it, numbered (slots
  // 1, 2, 3…) down the track, so the server can hand each slot its image. Evenly along the
  // section, nudged clear of obstacles; on a bend on its outside (where the follow camera
  // looks), on a straight on alternate sides.
  const billboards = [];
  let nextSide = WALL.left;
  sections.forEach((sec, i) => {
    const n = sec.billboards;
    if (!n || !span[i].parts.length || !Number.isInteger(n) || n < 1) return;
    const solids = placed.filter((p) => SOLID_KINDS.includes(p.kind));
    const clear = (share) => {
      const at = along(i, share);
      return at <= 1 - BOARD_FINISH_M / total && solids.every((p) => Math.abs(p.at - at) * total >= BOARD_CLEAR_M);
    };
    for (let k = 0; k < n; k += 1) {
      const want = (k + 1) / (n + 1);
      // The nearest clear spot to its even share (never on top of the previous board).
      const tries = Array.from({ length: 37 }, (_, j) => 0.05 + j * 0.025)
        .filter((x) => !billboards.some((b) => b.section === sec.name && Math.abs(b.at - along(i, x)) * total < BOARD_CLEAR_M))
        .sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
      const share = tries.find(clear);
      if (share === undefined) {
        problems.push(`${where(sec.name)}: no room for billboard ${k + 1} of ${n} at least ${BOARD_CLEAR_M} m from every obstacle; use fewer here, or put them on another section.`);
        continue;
      }
      let side;
      if (sec.shape.shape === 'sweep') side = sec.shape.side === 'left' ? WALL.right : WALL.left;
      else {
        side = nextSide;
        nextSide = -nextSide;
      }
      // (A coaster's billboards stand on its support towers, up at the track: wherever it flies.)
      const tower = isCoaster(spec) && (sec.height ?? spec.coaster?.height ?? (isBlock(spec) || isAthletics(spec) ? 0 : COASTER_HEIGHT)) > 0; // (a Block Series world: on its land unless the section flies)
      billboards.push({ slot: billboards.length + 1, at: along(i, share), side, section: sec.name, frame: sec.billboardFrame || spec.billboardFrame || 'plain', ...(tower && { mount: 'tower' }) });
    }
  });
  // A coaster's station roof (the finish): `finish.billboards` of them up there, facing the track.
  if (isCoaster(spec)) {
    for (let k = 0; k < (spec.finish?.billboards ?? 0); k += 1) {
      billboards.push({ slot: billboards.length + 1, at: 1, side: k % 2 ? WALL.right : WALL.left, section: 'Finish', frame: spec.finish.billboardFrame || spec.billboardFrame || 'plain', mount: 'roof' });
    }
  }

  // 3. Splitters.
  const forks = [];
  sections.forEach((sec, i) => {
    // The split-and-merge opening's twin chutes: apart from the wedge at the section's start, together again at its end.
    if (sec.shape?.shape === 'twinChutes' && span[i].parts.length) {
      forks.push({ from: round4(span[i].from), to: round4(span[i].to), ...sec.shape.fork });
      return;
    }
    if (sec.shape?.shape !== 'splitter' || span[i].parts.length !== 3) return;
    const [inPart, , mergePart] = span[i].parts;
    forks.push({
      from: round4(inPart.from + 0.62 * (inPart.to - inPart.from)),
      to: round4(mergePart.from + 0.5 * (mergePart.to - mergePart.from)),
      ...sec.shape.fork,
    });
  });

  // 3b. Half-pipes: where the channel widens into a big U (the race engine's channel.wides).
  const wides = [];
  sections.forEach((sec, i) => {
    if (sec.shape?.wide && span[i].parts.length) wides.push({ from: round4(span[i].from), to: round4(span[i].to), radius: sec.shape.wide.radius });
  });

  // 4. Looks for the 3D view (the race engine never reads these).
  const layoutKind = spec.layout ?? spec.sections?.layout;
  const kit = {
    // Which opening and layout from the libraries the track uses (tracks built before the libraries have neither).
    ...(spec.opening && { opening: spec.opening.kind }),
    ...(layoutKind && { layout: layoutKind }),
    surface: spec.surface || 'ice',
    ...(spec.biome && { biome: spec.biome }),
    lighting: spec.lighting || 'day',
    ...(spec.variants?.length && { variants: [...spec.variants] }),
    ...(spec.signature && { signature: spec.signature }),
    // TV moments: fixed trackside cameras the big view cuts to as the followed marble comes by (drawing only).
    ...(spec.tvCameras?.length && {
      tv: spec.tvCameras.map((c) => {
        const i = sections.findIndex((s) => s.name === c.section);
        const p = i < 0 ? 0 : span[i].from + (c.at ?? 0.5) * (span[i].to - span[i].from);
        return { p: round4(p), section: c.section, side: c.side === 'right' ? -1 : 1, distance: c.distance ?? 10, height: c.height ?? 5 };
      }),
    }),
    // A Grand Prix track: start lights, grandstands and crowds, kerbs and barriers, the finish's gantry,
    // building and fireworks (looks only). Who fills the stands and what lines the bends, by name.
    ...(spec.grandPrix && { grandPrix: { crowd: 'fans', barrier: 'tyres', ...(typeof spec.grandPrix === 'object' ? spec.grandPrix : {}) } }),
    // A coaster (family 'coaster'): the track flies on steel supports `height` metres above the land
    // (a section's own `height`; 0 where it touches down), a lift hill behind the gate, a station at
    // the finish; `water`: sections that fly over water. Looks only, like everything here.
    ...(isCoaster(spec) && { coaster: { height: isCanyon(spec) || isBlock(spec) || isAthletics(spec) ? 0 : COASTER_HEIGHT, ...spec.coaster, colours: { ...COASTER_COLOURS, ...spec.coaster?.colours } } }),
    // A canyon (family 'canyon', built as a coaster): the track runs along the floor of a canyon `depth`
    // metres deep in the rock and river of its `palette`, the river on one side; where the track flies
    // on its supports it climbs out over the rock. Looks only.
    ...(isCanyon(spec) && { canyon: { depth: 40, river: 'left', ...spec.canyon } }),
    // A Block Series track (family 'block', built as a coaster): a voxel world (`world`: its land's
    // colours and cube scenery), the track on its land unless a section flies on block pillars. Looks only.
    ...(isBlock(spec) && { block: { ...spec.block } }),
    // A Track and Field track (family 'athletics', built as a coaster): its stadium's generic architecture
    // round the sections marked `stadium`, red (or blue) tartan lanes, the starter, the scoreboard clock and
    // the photo-finish camera. Looks only.
    ...(isAthletics(spec) && { athletics: { lanes: 'red', ...spec.athletics } }),
    // A pinball table (family 'pinball'): the playfield, the cabinet, the backglass's art and the
    // dot-matrix display's call-outs at the start and for the winner, the apron's flippers and the
    // drain past the finish. Looks only.
    ...(isPinball(spec) && { pinball: { art: 'manor', display: 'MULTIBALL!', finish: 'JACKPOT!', ...spec.pinball, title: spec.name.toUpperCase() } }),
    // An arcade world (family 'arcade'): the giant cabinet's art and marquee at the start (its screen
    // counting down PLAYER 1 READY, 3-2-1 GO), the high-score table's call-out for the winner. Looks only.
    ...(isArcade(spec) && { arcade: { art: 'coin-op', finish: 'NEW HIGH SCORE!', ...spec.arcade, title: spec.name.toUpperCase() } }),
    billboards,
    start: spec.start || {},
    finish: spec.finish || {},
    sections: sections.map((sec, i) => ({
      name: sec.name,
      shape: sec.shape?.shape,
      from: round4(span[i].from),
      to: round4(span[i].to),
      ...(sec.scenery && { scenery: sec.scenery }),
      ...(sec.overhead && { overhead: sec.overhead }),
      ...(sec.billboards && { billboards: sec.billboards }),
      ...(sec.around && { around: sec.around }),
      ...(sec.figures && { figures: sec.figures }),
      ...(sec.landmarks && { landmarks: sec.landmarks }),
      ...(sec.surface && { surface: sec.surface }),
      ...(sec.tunnel && { tunnel: sec.tunnel }),
      ...(sec.bridge && { bridge: sec.bridge }),
      ...(sec.shape?.shape === 'waterfall' && { waterfall: { curtain: Boolean(sec.shape.curtain) } }),
      ...(sec.height !== undefined && { height: sec.height }),
      // (A coaster's station stands on the ground, and it dives into a tunnel at ground level.)
      ...(isCoaster(spec) && (sec.shape?.shape === 'runIn' || sec.tunnel !== undefined) && sec.height === undefined && { height: 0 }),
      ...(sec.water && { water: true }),
      ...(sec.walls !== undefined && { walls: sec.walls }),
      ...(sec.stadium && { stadium: true }),
      ...(sec.waterCurtain && { waterCurtain: true }),
    })),
  };

  const built = {
    id: null,
    slug: spec.slug,
    name: spec.name,
    difficulty: spec.difficulty || 'extreme',
    description: spec.description || '',
    length_m: g.length_m,
    lane_count: 4,
    waypoints: g.waypoints,
    obstacles: [],
    sections: g.sections,
    // Where the recipe made the build differ from the design (shown in the track report; never raced).
    ...(spec.designChanges?.length && { designChanges: [...spec.designChanges] }),
    physics: {
      ...BASE_PHYSICS,
      // An opening that changes the gate: the field let go in waves, or a wider, longer funnel.
      ...((spec.opening?.waves || spec.opening?.funnel || wides.length) && {
        channel: {
          ...BASE_PHYSICS.channel,
          funnel: { ...BASE_PHYSICS.channel.funnel, ...spec.opening?.funnel, ...(spec.opening?.waves && { waves: { ...spec.opening.waves } }) },
          ...(wides.length && { wides }),
        },
      }),
      ...(kit.surface !== 'ice' && { look: kit.surface }),
      features,
      runout: RUNOUT,
      ...(forks.length && { forks }),
      kit,
    },
  };

  // What the sameness check in the track report compares (src/report/variety.js): never raced, and
  // never written to the database (not enumerable, so not in the track's JSON).
  Object.defineProperty(built, 'variety', {
    enumerable: false,
    value: {
      family: spec.family ?? (spec.grandPrix ? 'grand-prix' : 'world-tour'),
      opening: spec.opening?.kind ?? (sections[0]?.shape?.shape === 'waterfall' ? 'waterfall' : 'classic'),
      openingSections: openingSections.length || 1,
      layout: layoutKind ?? null,
      // How the start looks (a track that does not say: the start every track had before the
      // varied starts: the straight lift on a coaster, the paddle gate, the classic camera).
      start: {
        type: isCoaster(spec) ? (spec.start?.type ?? 'straight-lift') : null,
        gate: spec.start?.gate ?? (spec.grandPrix ? 'lights' : 'paddle'),
        countdown: spec.start?.shots?.countdown ?? 'classic',
        launch: spec.start?.shots?.launch ?? 'high-behind',
      },
      sections: sections.map((sec, i) => ({
        name: sec.name,
        shape: sec.shape?.shape,
        side: sec.shape?.side ?? (sec.shape?.shape === 'sBends' ? sec.shape.parts[0].kind : null),
        from: round4(span[i].from),
        to: round4(span[i].to),
        obstacles: (sec.obstacles || []).map((o) => o?.obstacle),
        features: (sec.features || []).flat().map((f) => f?.part ?? f?.feature),
      })),
    },
  });

  problems.push(...checkRecipe({ spec, sections, span, generated, owner, placed, features, total, where }));
  if (problems.length) {
    const err = new Error(`${spec.name || spec.slug} breaks the track recipe:\n- ${problems.join('\n- ')}`);
    err.problems = problems;
    throw err;
  }
  return built;
}

module.exports = {
  track, mirror: require('./mirror').mirror, ...parts,
  opening: require('./openings').opening, OPENING_KINDS: require('./openings').OPENING_KINDS,
  layout: require('./layouts').layout, LAYOUT_KINDS: require('./layouts').LAYOUT_KINDS,
};
