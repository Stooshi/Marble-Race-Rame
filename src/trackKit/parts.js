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

/**
 * A half-pipe (skatepark): the channel widens into a big smooth U (`width`: its radius in metres,
 * the usual channel's is 3.6) and the line swings one way and the other (`swings` bends of
 * `degrees`), so the field rocks from wall to wall as it rolls down; it narrows again at its end.
 */
function halfPipe({ first = 'left', width = 8, swings = 3, radius = 60, degrees = 32, grade = 0.12 } = {}) {
  const other = turn(first) === 'left' ? 'right' : 'left';
  return {
    shape: 'halfPipe',
    wide: { radius: width },
    parts: Array.from({ length: swings }, (_, k) => ({ kind: k % 2 ? other : first, radius, degrees, grade, ease: EASE })),
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
function moguls({ from = 0.2, to = 0.85, count = 5, look } = {}) {
  return { feature: 'moguls', from, to, count, at: from, ...(look && { look }) }; // look 'reels': pinball score reels (looks only)
}

/**
 * Steps: small regular bumps over a rough stretch that slows the field
 * (the Selarón Steps); follow them with a plunge to pick the speed back up.
 */
function steps({ from = 0.1, to = 0.8, count = 6, drag = 0.015, tiles } = {}) {
  return { feature: 'steps', from, to, count, drag, at: from, ...(tiles && { tiles }) }; // tiles: 'mosaic' (the Selarón Steps' colours)
}

/**
 * Rumble strips (Grand Prix tracks): a row of low bumps painted red and white, the field
 * hopping over them one after another. Races exactly like moguls, under the same rules.
 */
function rumble({ from = 0.2, to = 0.85, count = 5 } = {}) {
  return { feature: 'moguls', from, to, count, at: from, look: 'rumble' };
}

/**
 * Jib parts (the skatepark kit), all a raised flat top in the channel (physics 'box'):
 * - box: a low box with a flat top in the middle of the channel (a snowboard jib box). Marbles that meet it
 *   square on roll up onto it, across and off the end; the rest are pushed round either side of it.
 * - rail: the same, very narrow and very low: a bar along the track that bumps the marbles about.
 * - tableTop: a long raised flat across the whole channel, a short ramp up and a gentle drop-off at the
 *   end: the pack spreads out on the flat (nothing pulls it back to the middle) and drops off in a stream.
 * - jibLine: a rail, a box and a table top one after another, as on a snowboard park run.
 * `at` / `from` are shares of the section; length, width and height in metres.
 */
function box({ at = 0.4, length = 10, width = 1.2, height = 0.25, line = 'center' } = {}) {
  return { feature: 'box', at, length, width, height, line, part: 'box' };
}
function rail({ at = 0.3, length = 12, line = 'center' } = {}) {
  return { feature: 'box', at, length, width: 0.3, height: 0.12, line, part: 'rail' };
}
function tableTop({ at = 0.3, length = 25, height = 0.3, down = 8 } = {}) {
  return { feature: 'box', at, length, width: 5, height, line: 'center', down, part: 'table-top' };
}
function jibLine({ from = 0.1 } = {}) {
  return [rail({ at: from, length: 10 }), box({ at: from + 0.25, length: 10 }), tableTop({ at: from + 0.5, length: 22 })];
}

/**
 * A boost-pad jump (`look`: 'ski-jump', 'river-jump'): a launch pad wall to wall (`pad` metres), then a
 * kicker ramp (`kicker` metres, rising `height`), a short gap (`gap` metres) and a landing deck
 * (`landing` metres, from `deck` metres above the ice at its lip easing down to the ice). The pad adds
 * its `kick` and brings every marble up to at least `min` m/s, the speed that carries even the slowest
 * over the gap with room to spare; a hidden catch channel under the gap (`depth` metres down) brings
 * back any marble that still falls short, past the deck. `at`: where the pad starts (share of the section).
 */
function boostJump({ at = 0.3, look = 'ski-jump', pad = 6, kick = 4, min = 22, kicker = 20, height = 0.9, gap = 4, landing = 40, deck = 0.5, depth = 1.6 } = {}) {
  return { feature: 'jump', at, look, pad, kick, min, kicker, height, gap, landing, deck, depth, part: 'jump' };
}

/**
 * Paint on the floor, looks only (the physics never sees it): relay exchange zones ('exchange-zone'), a Go board ('go-board') or a
 * Xiangqi board ('xiangqi') over the stretch from `from` to `to` (China Wall Twister's board-game run).
 */
function paint({ from = 0.1, to = 0.9, look = 'go-board' } = {}) {
  return { feature: 'paint', from, to, look, at: from };
}

/** A short, sharp braking zone (rough surface): the field bunches up, then fans out again (Table Mountain Run). */
function brake({ at = 0.7, length = 15, drag = 0.02 } = {}) {
  return { feature: 'brake', at, length, drag };
}

module.exports = {
  SHARP_RADIUS, EASE, START_RAMP, LIP_STEP, LIP_LENGTH,
  plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter, waterfall, runIn, halfPipe, box, rail, tableTop, jibLine, boostJump,
  block, pileUp, curtain, swipe, parked, slalom, peg,
  bump, boost, brake, moguls, steps, paint, rumble,
  TUNNELS: ['mine', 'ice-cave', 'dragon', 'rock', 'roots', 'bazaar', 'canyon', 'mosaic', 'pyramid', 'sea-cave', 'lit-tunnel', 'redwood-trunk', 'city-wall', 'subway', 'steamer'],
  BRIDGES: ['ice', 'stone', 'wood', 'steel'],
  // Scenery names (looks only; the 3D view draws them, client/src/three/scenery/kit*.js).
  SURFACES: ['ice', 'snow', 'sand', 'stone', 'water', 'asphalt', 'tartan', 'tartan-blue'],
  BIOMES: ['alpine', 'arctic', 'meadow', 'desert', 'jungle', 'city', 'playfield', 'circuit-board', 'blacklight-carpet'],
  LANDMARKS: ['church', 'mountain-hut', 'big-rock', 'lighthouse', 'horse-sleigh', 'border-post',
    'lift-station', 'mine-buildings', 'snow-park', 'base-camp',
    'sacre-coeur', 'moulin-rouge', 'fountains', 'louvre-pyramid', 'notre-dame', 'eiffel-tower', 'seine', 'bookstalls',
    'bedouin-camp', 'museum-of-the-future', 'dubai-frame', 'burj-al-arab', 'burj-khalifa', 'palm-boardwalk', 'dune-buggy',
    'toucan-tree', 'river-pool', 'teatro-amazonas', 'river-dock',
    'corcovado', 'sugarloaf', 'maracana', 'parrot-tree', 'copacabana',
    'wudian-hall', 'watchtower', 'pagoda', 'rice-terraces', 'lantern-row', 'temple-of-heaven',
    'dubai-fountain', 'marina', 'harbour', 'opera-house', 'galata-tower', 'hagia-sophia', 'blue-mosque', 'bosphorus-bridge', 'tulip-garden',
    'lagos-skyline', 'national-theatre', 'roundabout-monument', 'kicc-tower', 'acacia', 'safari-truck', 'park-fence',
    'royal-palace', 'city-hall', 'vasa-museum', 'steamboats', 'red-fort', 'red-fort-gate', 'jama-masjid', 'india-gate', 'mughal-fountain',
    'kasbah', 'mud-mosque', 'caravan',
    'giant-tree', 'tree-platform', 'glow-flowers', 'snow-castle', 'snow-island', 'ice-palace',
    'ruined-castle', 'sleeping-dragon', 'fallen-statue', 'amphitheatre', 'dragon-mountain',
    'stave-church', 'fjord-village', 'cruise-ship', 'waterfall-cliff', 'ledge-farm',
    'skull-rock', 'park-midway', 'distant-coasters', 'graveyard', 'volcano-rock',
    'tibidabo', 'barceloneta-beach', 'barcelona-city', 'park-guell-terrace', 'sagrada-familia',
    'inukshuk', 'whistler-village', 'frozen-waterfall', 'sphinx', 'giza-pyramids', 'nile-station', 'obelisk',
    'fighting-cocks', 'karst-bay', 'floating-village',
    'victoria-peak', 'sea-bridge', 'port-cranes', 'zhuhai-waterfront', 'drive-through-redwood', 'redwood-grove', 'sea-stacks-beach',
    'doi-suthep', 'chiang-mai-gate', 'lantern-chedi', 'baobab', 'stilt-lodge', 'mokoros', 'elephant-herd',
    'pancic-mausoleum', 'stone-monastery', 'watermill', 'sheep-flock', 'kolo-village',
    'sun-yat-sen-mausoleum', 'yangtze-bridge', 'zhonghua-gate', 'lake-pagodas', 'ginkgo-grove', 'haunted-manor', 'siege-castle', 'castle-keep', 'grand-theatre', 'magician-trunk', 'top-hat', 'flying-saucer', 'saucer-town',
    'retro-diner', 'soda-fountain', 'jukebox-tower', 'gumball-machine', 'clocktower', 'floating-doors', 'concert-stage', 'speaker-wall', 'lighting-rig',
    'arcade-hall', 'cabinet-row', 'prize-counter', 'claw-tower', 'neon-maze', 'glitch-tower', 'level-sign',
    'alien-formation', 'mothership', 'ringed-planet', 'laser-turret',
    'pixel-hills', 'floating-platforms', 'pixel-waterfall', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'ba-buttons',
    'rooftop-stage', 'pixel-crowd', 'water-tower', 'health-bars',
    'starting-grid', 'checkpoint-gate', 'fork-signpost', 'goal-banner',
    'subway-entrance', 'storefronts', 'go-arrow', 'neon-plaza', 'continue-clock',
    // The Holiday Season 2026 (client/src/three/scenery/kitLandmarksHoliday.js).
    'chateau-hotel', 'toboggan-slide', 'flat-top-mountain', 'promenade-lights', 'braai-fires', 'outback-homestead', 'kangaroo-mob', 'light-figures', 'light-arches', 'gothic-church-front', 'gingerbread-stands', 'papel-picado', 'posada-procession', 'pinata-line', 'badnjak-fires', 'fortress-walls', 'hanging-lanterns', 'old-church-courtyard', 'wooden-residence', 'troika', 'onion-dome-church', 'ice-rink-tree', 'drum-circle', 'snow-sculptures', 'tv-tower', 'snow-lanterns', 'ice-castles', 'pohutukawa-trees', 'harbour-arch-bridge', 'castle-rock', 'rock-hewn-church', 'pilgrims', 'parol-lanterns', 'parang-band', 'gallery-houses', 'white-crowd', 'flower-boats', 'star-lanterns', 'pixel-palms', 'pixel-white-church', 'stepping-stones', 'lantern-bridge', 'gingerbread-houses', 'candy-trees', 'ice-palace', 'ice-chandeliers', 'steam-train', 'top-station', 'owl-perches', 'reindeer-herd',
    // The Canyon Series.
    'rim-lookout', 'river-camp', 'mule-train', 'glass-skywalk', 'river-rafts',
    'gompa', 'chorten-row', 'snow-peak', 'yak-herd', 'tibetan-village',
    'andean-church', 'andean-terraces', 'condor-viewpoint', 'llama-herd', 'andean-village',
    'rafting-camp', 'adobe-mission', 'canyon-station', 'cliff-dwellings',
    'fire-lookout', 'basalt-columns', 'bighorn-sheep', 'jet-boat', 'river-ranch', 'giant-peak', 'trail-village',
    'jingle-truck', 'hill-fort', 'puya-plants', 'hot-springs', 'hikers-camp', 'quiver-grove', 'canyon-waterfall',
    'light-beams', 'slot-stairs', 'tour-trucks', 'lavender-field', 'perched-village', 'lake-pedalos',
    'tiger-rock', 'trail-guesthouse', 'gorge-viewpoint',
    'long-waterfall', 'ridge-lookout', 'coast-palms',
    'siq-ladders', 'wadi-gate', 'dead-sea-shore',
    // The Block Series (voxel worlds and falling-block ideas; our own shapes and colours).
    'spawn-beacon', 'cube-cottage', 'cube-windmill', 'split-board', 'cube-farm', 'voxel-peak', 'beam-tower', 'cube-cabin',
    'mine-entrance', 'gem-seam', 'cart-depot', 'shaft-headframe', 'magma-pool', 'basalt-spire', 'lava-falls',
    'clear-rows', 'block-well', 'combo-rows', 'settling-stack', 'block-hall', 'voxel-castle', 'drawbridge', 'block-gate',
    'block-portal', 'gg-arch', 'level-pillars',
    'floating-island', 'big-floating-island', 'island-house', 'island-garden', 'cube-crane', 'container-stack', 'block-boats', 'harbour-office', 'block-lighthouse',
    'sun-temple', 'temple-colonnade', 'sun-disc', 'temple-gate', 'chain-wall', 'score-wall', 'checkpoint-arch', 'final-stage',
    // Track and Field (generic stadium architecture; no protected names, rings, torch designs or sponsors).
    'athletes-village', 'herm-gateway', 'stone-colonnade', 'stadium-bell-tower', 'warm-up-track', 'timber-stand',
    'woven-lattice', 'wooden-eaves', 'brick-tower', 'relay-batons', 'steeple-pit', 'peristyle-arches', 'flame-cauldron',
    'golden-arch', 'floodlight-mast', 'field-events', 'medal-podium',
    // The Rivers (client/src/three/scenery/kitLandmarksRiver.js; boats float on the river: `river: true`).
    'river-cruiser', 'longtail-boat', 'market-boats', 'paddle-steamer', 'river-barge', 'river-ferry',
    'domed-hall', 'quay-lamps', 'wat-roofs', 'falls-lip', 'hippo-pool', 'ship-locks', 'green-peaks', 'levee-houses', 'pontoon-floats',
    'river-clipper', 'glass-towers', 'weeping-willow', 'quay-cranes', 'red-gums', 'pelicans', 'lock-weir', 'limestone-cliffs', 'brick-temples',
    // (The other ten: Amazon, Nile, Congo, Rhine, Ganges.)
    'lily-pads', 'floating-houses', 'feluccas', 'granite-islands', 'palm-grove', 'fishing-tripods', 'dugout-canoes',
    'island-castle', 'hilltop-castle', 'vineyard-terraces', 'ghat-steps', 'floating-lamps', 'rowing-boats'],
  OVERHEAD: ['gondola', 'cable-car', 'chairlift', 'vulture',
    // The Canyon Series: birds circling over the gorge, and what spans it from rim to rim, high over the track.
    'condor', 'prayer-flags', 'arch-bridge', 'railway-trestle', 'suspension-bridge',
    // The Rivers: the bridges the track runs under (a chain bridge's piers along the section, the field
    // weaving between them; a steel arch or a cable-stayed bridge crossing high over it).
    'chain-bridge', 'steel-arch-bridge', 'cable-stayed-bridge',
    // (A raised bascule bridge's towers either side of the track, a suspension bridge, five stone arch bridges in a row,
    // a port's loading gantry over the track, a long many-span bridge beside a section; hot-air balloons drifting high above.)
    'bascule-bridge', 'river-suspension-bridge', 'stone-arch-bridges', 'loading-gantry', 'multi-span-bridge', 'hot-air-balloons', 'truss-bridge'],
  // A Block Series world (family 'block': `block: { world }`): its voxel land's colours and what stands
  // on it, the client's BLOCK_WORLDS (client/src/three/scenery/blocks.js).
  BLOCK_WORLDS: ['meadow', 'valley', 'snow', 'mine', 'magma', 'puzzle', 'fortress', 'portal', 'sky', 'harbour', 'temple', 'bonus'],
  // A Track and Field stadium (family 'athletics': `athletics: { stadium }`): its generic architecture, the
  // client's STADIUMS (client/src/three/scenery/athletics.js).
  STADIUMS: ['panathenaic', 'berlin-1936', 'bislett', 'hayward', 'nest', 'tokyo', 'stockholm-1912', 'london', 'coliseum', 'letzigrund', 'accra'],
  // A canyon's rock and river (family 'canyon': `canyon: { palette }`), the client's CANYON_PALETTES.
  CANYONS: ['grand-canyon', 'himalaya', 'andes', 'limestone', 'copper', 'basalt', 'karakoram', 'namib', 'slot', 'verdon', 'jinsha', 'waimea', 'mujib'],
  // A river's water, banks and plants (family 'river': `river: { palette }`), the client's RIVER_PALETTES.
  RIVERS: ['danube', 'mekong', 'mississippi', 'zambezi', 'yangtze', 'thames', 'seine', 'volga', 'murray', 'irrawaddy', 'amazon', 'nile', 'congo', 'rhine', 'ganges'],
  // What stands in the middle of a splitter, between its two channels (the arch: over one of
  // them), or in the middle of a spiral or a hairpin.
  AROUND: ['mountain-hut', 'big-rock', 'mountain-restaurant', 'mine-headframe', 'nunatak', 'bell-tower', 'arc-de-triomphe', 'obelisk', 'notre-dame', 'oasis', 'twisted-tower', 'river-island', 'anaconda', 'watchtower', 'pagoda',
    'museum-of-the-future', 'dubai-frame', 'opera-house', 'tulip-garden', 'roundabout-monument', 'acacia', 'mughal-fountain', 'giant-tree', 'snow-island', 'fallen-statue', 'volcano-rock', 'sagrada-familia', 'frozen-waterfall', 'limestone-island', 'sea-islet', 'giant-redwood', 'lantern-chedi', 'watermill', 'confucius-temple', 'castle-keep', 'magician-trunk', 'top-hat', 'jukebox-tower', 'clocktower', 'lighting-rig', 'claw-tower', 'glitch-tower', 'ringed-planet', 'laser-turret', 'water-tower', 'fork-signpost', 'neon-plaza', 'snow-peak',
    'settling-stack', 'voxel-peak', 'basalt-spire', 'beam-tower', 'level-pillars', 'floodlight-mast', 'flame-cauldron', 'medal-podium',
    'island-castle'],
  // Scenery near a section (or the start or finish): what grows and stands beside the track there.
  SCENERY: ['bare', 'rocks', 'birches', 'pines', 'race-netting', 'funicular', 'wooden-houses', 'frozen-lake',
    'wood-clad', 'chalets', 'pasture', 'aspens', 'shopfronts',
    'stone-houses', 'colourful-houses', 'icefjord', 'haussmann', 'plane-trees', 'skyscrapers', 'stilt-houses', 'forbidden-city', 'battlements', 'grandstand', 'crowd', 'sandstone-terraces', 'market-stalls', 'palms', 'jacarandas', 'savannah', 'merchant-houses',
    // The Rivers.
    'balcony-houses', 'river-palms', 'cypress', 'reeds', 'city-quay'],
  // Billboard frames: plain, a jungle timber frame, a city LED screen, a Paris advertising column, expedition crates, a fantasy banner, an arcade cabinet's marquee.
  FRAMES: ['plain', 'wood', 'led', 'column', 'crates', 'banner', 'marquee'],
  // Grand Prix tracks (`grandPrix` in a track file): who fills the grandstands, and what lines the bends.
  CROWDS: ['fans', 'elves', 'kingdom-folk', 'villagers', 'desert-folk'],
  BARRIERS: ['tyres', 'logs', 'snow', 'stone', 'marigolds'],
};
