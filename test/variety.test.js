'use strict';

// The variety libraries (openings and layouts) and the sameness check in the track report.
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../src/trackKit');
const { physicsTrack, PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('../scripts/race-fingerprints');
const { varietyCheck, similarity, profile } = require('../src/report/variety');

const { track, opening, layout, OPENING_KINDS, LAYOUT_KINDS } = kit;

const START = { gate: 'stalls', shots: { countdown: 'above', launch: 'overhead' } };
const spec = (o = {}) => ({ slug: 'variety-check', name: 'Variety Check', opening: opening('classic'), sections: layout('classic'), start: START, ...o });

test('every opening and every layout in the libraries builds within the recipe, and says which it is', () => {
  // (The varied starts, without the pile-up and slalom, need their luck later on: the mid lottery layout has it.)
  const NO_LUCK = ['clean-drop', 'peg-drop', 'pipe-drop'];
  for (const kind of OPENING_KINDS) {
    const lay = NO_LUCK.includes(kind) ? 'mid-lottery' : 'classic';
    const t = track(spec({ opening: opening(kind), sections: layout(lay) }));
    assert.equal(t.physics.kit.opening, kind);
    assert.equal(t.physics.kit.layout, lay);
  }
  for (const kind of LAYOUT_KINDS) {
    for (const mirror of [false, true]) assert.equal(track(spec({ sections: layout(kind, { mirror }) })).physics.kit.layout, kind);
  }
  assert.throws(() => opening('cannon'), /unknown opening "cannon"/);
  assert.throws(() => layout('maze'), /unknown layout "maze"/);
});

test('each library opening and layout has its proven test track', () => {
  for (const kind of OPENING_KINDS.filter((k) => k !== 'classic')) assert.equal(physicsTrack(`variety-opening-${kind}`)?.physics.kit.opening, kind);
  for (const kind of LAYOUT_KINDS) assert.equal(physicsTrack(`variety-layout-${kind}`)?.physics.kit.layout, kind);
});

test('the starting rule: a library opening, or the classic steep plunge written out by hand', () => {
  // Tracks built before the library keep their hand-written plunge, and say nothing new about it.
  const legacy = physicsTrack('dubai-marble-grand-prix');
  assert.equal(legacy.physics.kit.opening, undefined);
  assert.equal(legacy.variety.opening, 'classic');
  // A gentle first section without an opening is refused, naming the library.
  const gentle = spec({ opening: undefined, sections: [{ name: 'Gentle', shape: kit.straight(40) }, ...layout('classic')] });
  assert.throws(() => track(gentle), /must open with a proven opening from the library/);
  // An opening that does not come from the library is refused.
  assert.throws(() => track(spec({ opening: { kind: 'cannon', sections: [] } })), /the opening must come from the library/);
  // Twin chutes only as the split-and-merge opening's.
  const chutes = spec();
  chutes.sections = [{ name: 'Chutes', shape: require('../src/trackKit/openings').twinChutes(50) }, ...chutes.sections];
  assert.throws(() => track(chutes), /twin chutes are the split-and-merge opening's/);
  // An opening is dressed, never reshaped.
  assert.throws(() => opening('crest-start', { dress: { climb: { shape: kit.straight(10) } } }), /"shape" cannot be changed/);
  assert.equal(track(spec({ opening: opening('tunnel-launch', { names: { tunnel: 'Gatehouse' } }) })).physics.kit.sections[1].name, 'Gatehouse');
});

test('split-and-merge: two equal chutes off the gate funnel that merge again', () => {
  const t = physicsTrack('variety-opening-split-start');
  const [chutes] = t.physics.forks;
  const sec = t.physics.kit.sections.find((s) => s.shape === 'twinChutes');
  assert.equal(chutes.from, sec.from);
  assert.equal(chutes.to, sec.to);
  assert.deepEqual(chutes.left, chutes.right, 'the same ice in both chutes');
  assert.equal(chutes.tipOffset, 0);
  assert.ok(chutes.from * t.length_m > t.physics.channel.funnel.length, 'the wedge stands below the gate funnel');
});

test('staggered drop: the field goes in five waves of four, a new order each race', () => {
  const t = physicsTrack('variety-opening-staggered-drop');
  const orders = new Set();
  for (const seed of [11, 12, 13, 14, 15, 16]) {
    const entries = houseField(seed);
    const { releaseMs } = simulatePhysicsRace({ seed, track: t, entries, level: 3 }).start;
    const waves = [0, 1, 2, 3, 4].map((g) => entries.map((e, i) => (Math.floor(e.lane / 4) === g ? releaseMs[i] : null)).filter((x) => x !== null));
    for (const w of waves) assert.ok(Math.max(...w) - Math.min(...w) <= 80, 'a wave goes together');
    orders.add(waves.map((w) => Math.round(Math.min(...w) / 300)).join(''));
  }
  assert.ok(orders.size >= 4, 'the waves go in a different order from race to race');
});

test('funnel drop: a longer, wider bowl at the gate (only on that track)', () => {
  const t = physicsTrack('variety-opening-funnel-drop');
  assert.equal(t.physics.channel.funnel.length, 82);
  assert.equal(physicsTrack('dubai-marble-grand-prix').physics.channel.funnel.length, 70);
});

test('the sameness check: identical layouts fail, different ones pass, test tracks are not compared', () => {
  const tokens = (...xs) => xs.map(([t, side]) => ({ t, side }));
  assert.equal(similarity(tokens(['spiral', 'left']), tokens(['spiral', 'left'])), 1);
  assert.equal(similarity(tokens(['spiral', 'left']), tokens(['spiral', 'right'])), 0.75);
  assert.equal(similarity(tokens(['spiral', 'left']), tokens(['hairpin', 'left'])), 0);
  // Today's Grand Prix tracks share one layout: the check fails them.
  const dubai = varietyCheck(physicsTrack('dubai-marble-grand-prix'), PHYSICS_TRACKS);
  assert.ok(dubai.lines.some((l) => l.pass === false && /Layout/.test(l.what)));
  // A track on a layout no other track uses passes against every one of them (two-splitters:
  // only Pyramid Run uses it, so it is compared with every track but that one).
  const fresh = track(spec({ family: 'world-tour', opening: opening('crest-start'), sections: layout('two-splitters') }));
  const check = varietyCheck(fresh, [...PHYSICS_TRACKS.filter((t) => t.slug !== 'pyramid-run'), fresh]);
  assert.deepEqual(check.lines.filter((l) => l.pass === false), []);
  // The libraries' own test tracks are never compared.
  assert.equal(varietyCheck(physicsTrack('variety-layout-classic'), PHYSICS_TRACKS).lines[0].pass, null);
  assert.equal(profile(physicsTrack('kit-proving-ground')).family, 'test');
});

test('a mirrored track is not compared with the track it mirrors', () => {
  const a = track(spec({ family: 'world-tour', opening: opening('banked-turn'), sections: layout('long-sweeps') }));
  const b = kit.mirror(a, { slug: 'variety-check-mirrored', name: 'Variety Check Mirrored' });
  const { scores } = varietyCheck(b, [...PHYSICS_TRACKS, a, b]);
  assert.ok(!scores.some((s) => s.slug === a.slug));
});

test('coasters: up on supports, touching down somewhere, a station roof for billboards, their own rules', () => {
  const sog = physicsTrack('sognefjord');
  assert.equal(sog.variety.family, 'coaster');
  assert.equal(sog.physics.kit.coaster.height, 18);
  assert.ok(sog.physics.kit.sections.some((s) => s.height === 0 && s.shape !== 'runIn'), 'touches down along the way');
  assert.equal(sog.physics.kit.sections.at(-1).height, 0, 'its station stands on the ground');
  assert.equal(sog.physics.kit.sections.find((s) => s.name === 'Mountain tunnel').height, 0, 'its tunnel runs into the land');
  assert.ok(sog.physics.kit.billboards.some((b) => b.mount === 'roof'));
  assert.ok(sog.physics.kit.billboards.filter((b) => b.mount !== 'roof').every((b) => b.mount === 'tower'));
  // Looks only: the race is the ice channel's (no coaster settings reach the physics).
  assert.equal(sog.physics.surface, 'ice');
  const coaster = (o = {}) => spec({ family: 'coaster', start: { ...START, type: 'elevator' }, sections: layout('classic', { dress: { brakingStraight: { height: 0 } } }), ...o });
  assert.equal(track(coaster()).physics.kit.coaster.colours.support, '#c43a2f');
  assert.throws(() => track(coaster({ sections: layout('classic') })), /touches down somewhere along the way/);
  assert.throws(() => track(coaster({ coaster: { height: 80 } })), /coaster.height is how high the track flies/);
  assert.throws(() => track(coaster({ finish: { billboards: 3 } })), /0 to 2 billboards on the station roof/);
  assert.throws(() => track(spec({ sections: layout('classic', { dress: { sweep: { height: 10 } } }) })), /height, water and waterCurtain are for coasters/);
  assert.throws(() => track(coaster({ sections: layout('mid-drop', { waterfall: false, dress: { belowDrop: { tunnel: 'rock', height: 12, billboards: 0 } } }) })), /coaster's tunnel runs into the land/);
});

test('canyons: built as coasters on the canyon floor unless a section flies, their rock and river by name, their own rules', () => {
  const gc = physicsTrack('grand-canyon-burst');
  assert.equal(gc.variety.family, 'canyon');
  assert.deepEqual(gc.physics.kit.canyon, { depth: 42, river: 'left', palette: 'grand-canyon' });
  assert.equal(gc.physics.kit.coaster.height, 0, 'on the canyon floor where a section does not say');
  assert.ok(gc.physics.kit.sections.some((s) => s.height > 30), 'it climbs out over the rock somewhere');
  assert.ok(gc.physics.kit.billboards.every((b) => b.mount === 'tower' || b.mount === undefined));
  assert.equal(gc.physics.surface, 'ice');
  const canyon = (o = {}) => spec({ family: 'canyon', canyon: { palette: 'andes' }, start: { ...START, type: 'elevator' }, sections: layout('classic'), ...o });
  assert.deepEqual(track(canyon()).physics.kit.canyon, { depth: 40, river: 'left', palette: 'andes' });
  assert.throws(() => track(canyon({ canyon: undefined })), /a canyon says its rock and river/);
  assert.throws(() => track(canyon({ canyon: { palette: 'moon' } })), /unknown palette "moon"/);
  assert.throws(() => track(canyon({ canyon: { palette: 'andes', depth: 90 } })), /depth is metres from the canyon's floor to its rim/);
  assert.throws(() => track(canyon({ canyon: { palette: 'andes', river: 'middle' } })), /the river runs on the left or right/);
  assert.throws(() => track(canyon({ sections: layout('classic', { dress: { sweep: { walls: 2 } } }) })), /walls is the share of the canyon's walls/);
  assert.equal(track(canyon({ sections: layout('classic', { dress: { sweep: { walls: 0.5 } } }) })).physics.kit.sections.find((s) => s.name === 'Sweep').walls, 0.5);
  assert.throws(() => track(canyon({ coaster: { style: 'bamboo' } })), /coaster.style is how its supports are built/);
  assert.throws(() => track(spec({ canyon: { palette: 'andes' } })), /canyon settings are for canyons/);
  assert.throws(() => track(spec({ sections: layout('classic', { dress: { sweep: { walls: 0.5 } } }) })), /walls are for canyons/);
});

test('Block Series: built as coasters on the voxel land unless a section flies, their world by name, their own rules', () => {
  const blocky = (o = {}) => spec({ family: 'block', block: { world: 'meadow' }, start: { ...START, type: 'elevator' }, sections: layout('spawn-meadow'), ...o });
  const t = track(blocky());
  assert.equal(t.variety.family, 'block');
  assert.deepEqual(t.physics.kit.block, { world: 'meadow' });
  assert.equal(t.physics.kit.coaster.height, 0, 'on the land where a section does not say');
  assert.equal(track(blocky({ coaster: { style: 'blocks' } })).physics.kit.coaster.style, 'blocks');
  assert.throws(() => track(blocky({ block: undefined })), /a Block Series track says its world/);
  assert.throws(() => track(blocky({ block: { world: 'nether' } })), /unknown world "nether"/);
  assert.throws(() => track(blocky({ block: { world: 'meadow', mobs: true } })), /unknown setting mobs/);
  assert.throws(() => track(spec({ block: { world: 'meadow' } })), /block settings are for the Block Series/);
  // The block layouts are on the list, and the series name is neutral.
  const { BLOCK_WORLDS } = require('../src/trackKit/parts');
  assert.deepEqual(BLOCK_WORLDS, ['meadow', 'valley', 'snow', 'mine', 'magma', 'puzzle', 'fortress', 'portal', 'sky', 'harbour', 'temple', 'bonus']);
  for (const k of ['spawn-meadow', 'speedrun-straights', 'peak-beams', 'mine-shaft', 'magma-loops', 'clear-rows', 'combo-steps', 'stack-spiral', 'fortress-gate', 'final-level']) assert.ok(kit.LAYOUT_KINDS.includes(k), k);
});

test('Track and Field: built as coasters on the ground unless a section flies, a stadium by name round its stadium sections, on tartan', () => {
  const stadium = (o = {}) => spec({
    family: 'athletics', surface: 'tartan', athletics: { stadium: 'bislett' }, start: { ...START, type: 'elevator' },
    sections: layout('horseshoe-sprint', { dress: { homeStraight: { stadium: true }, hairpin: { stadium: true } } }), ...o,
  });
  const t = track(stadium());
  assert.equal(t.variety.family, 'athletics');
  assert.deepEqual(t.physics.kit.athletics, { lanes: 'red', stadium: 'bislett' });
  assert.equal(t.physics.kit.coaster.height, 0, 'on the ground where a section does not say');
  assert.equal(t.physics.look, 'tartan', 'the tartan is a look: it races like ice');
  assert.deepEqual(t.physics.kit.sections.filter((x) => x.stadium).map((x) => x.name), ['Home straight', 'Hairpin']);
  assert.equal(track(stadium({ coaster: { style: 'concrete' } })).physics.kit.coaster.style, 'concrete');
  assert.throws(() => track(stadium({ athletics: undefined })), /a Track and Field track says its stadium/);
  assert.throws(() => track(stadium({ athletics: { stadium: 'wembley' } })), /unknown stadium "wembley"/);
  assert.throws(() => track(stadium({ athletics: { stadium: 'bislett', lanes: 'green' } })), /lanes are red or blue/);
  assert.throws(() => track(stadium({ surface: 'ice' })), /runs on tartan/);
  assert.throws(() => track(stadium({ sections: layout('horseshoe-sprint') })), /runs inside its stadium/);
  assert.throws(() => track(stadium({ sections: layout('horseshoe-sprint', { dress: { homeStraight: { stadium: true, height: 12 } } }) })), /inside the stadium the track runs on its ground/);
  assert.throws(() => track(spec({ athletics: { stadium: 'bislett' } })), /athletics settings are for Track and Field/);
  assert.throws(() => track(spec({ sections: layout('horseshoe-sprint', { dress: { homeStraight: { stadium: true } } }) })), /stadium is for Track and Field/);
  // The layouts are on the list.
  for (const k of ['horseshoe-sprint', 'blue-lanes', 'bell-lap', 'hurdles-straight', 'nest-bend', 'photo-finish', 'relay-legs', 'steeple-water', 'anchor-arches', 'golden-lap']) assert.ok(kit.LAYOUT_KINDS.includes(k), k);
});

test('Track and Field never uses a protected name: no games, rings, torch, league, federation or sponsor in any of its tracks', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const BANNED = /olymp|five rings|diamond league|world athletics|\biaaf\b|\bioc\b|\bnike\b|\badidas\b|\bpuma\b|\bomega\b|\bseiko\b|wanda|\btorch\b/i;
  const mine = PHYSICS_TRACKS.filter((t) => t.variety?.family === 'athletics');
  for (const t of mine) {
    const text = JSON.stringify({ name: t.name, description: t.description, designChanges: t.designChanges, kit: t.physics.kit });
    assert.doesNotMatch(text, BANNED, t.slug);
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../src/tracks', `${t.slug}.js`), 'utf8'), BANNED, `${t.slug}.js`);
  }
  for (const f of ['client/src/three/scenery/athletics.js', 'client/src/three/scenery/kitLandmarksAthletics.js']) {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/no torch design of any games|no torch designs? of any games|no rings, no torch designs/gi, '');
    assert.doesNotMatch(code, /olymp|diamond league|world athletics/i, f);
  }
});

test('a track may retune a layout splitter (balance, added pegs), mirrored with the layout, and nothing else of its shape', () => {
  const plain = kit.layout('climb-drop').find((s) => s.layoutKey === 'splitter').shape.fork;
  const tuned = kit.layout('climb-drop', { dress: { splitter: { balance: { tipOffset: -1.1, left: { scrub: 3.8 } } } } }).find((s) => s.layoutKey === 'splitter').shape.fork;
  assert.equal(tuned.tipOffset, -1.1);
  assert.equal(tuned.left.scrub, 3.8);
  assert.equal(tuned.left.drag, plain.left.drag);
  assert.deepEqual(tuned.right, plain.right);
  const mirrored = kit.layout('climb-drop', { mirror: true, dress: { splitter: { balance: { tipOffset: -1.1, left: { scrub: 3.8 } } } } }).find((s) => s.layoutKey === 'splitter').shape.fork;
  assert.equal(mirrored.tipOffset, 1.1);
  assert.equal(mirrored.right.scrub, 3.8);
  assert.throws(() => kit.layout('climb-drop', { dress: { sweep: { balance: { left: { drag: 2 } } } } }), /balance can only be set on a splitter/);
  const { peg, block } = require('../src/trackKit/parts');
  const pegged = kit.layout('climb-drop', { mirror: true, dress: { splitter: { addObstacles: [peg({ at: 0.05, line: 'left' })] } } }).find((s) => s.layoutKey === 'splitter');
  assert.equal(pegged.obstacles.at(-1).line, 'right');
  assert.throws(() => kit.layout('climb-drop', { dress: { splitter: { addObstacles: [block({ at: 0.1 })] } } }), /only pegs can be added/);
  assert.throws(() => kit.layout('climb-drop', { dress: { spiral: { addObstacles: [peg({ at: 0.5 })] } } }), /no pegs added to a spiral/);
  assert.equal(kit.layout('twin-spirals', { dress: { sweep: { addObstacles: [peg({ at: 0.5 })] } } }).find((s) => s.layoutKey === 'sweep').obstacles.length, 1);
});

test('the varied starts: a new track says how its start looks, checked like any opening', () => {
  const { START_TYPES, GATES, COUNTDOWN_SHOTS, LAUNCH_SHOTS } = require('../src/trackKit/recipe');
  assert.deepEqual(START_TYPES, ['straight-lift', 'curving-lift', 'spiral-tower', 'elevator', 'cliff', 'rooftop', 'station-launch', 'stepped-platform', 'lighthouse', 'ski-jump', 'castle-tower']);
  assert.deepEqual(GATES, ['paddle', 'trapdoor', 'stalls', 'barrier']);
  assert.deepEqual(COUNTDOWN_SHOTS, ['front', 'side', 'above', 'chase']);
  assert.deepEqual(LAUNCH_SHOTS, ['high-behind', 'low-chase', 'side', 'overhead', 'look-back']);
  // A new track must say its gate and shots; a coaster its start type too.
  assert.throws(() => track(spec({ start: {} })), /a new track says how its start looks/);
  const coaster = (start, o = {}) => spec({ family: 'coaster', start, sections: layout('classic', { dress: { brakingStraight: { height: 0 } } }), ...o });
  assert.throws(() => track(coaster(START)), /a new coaster says its start type/);
  assert.throws(() => track(coaster({ ...START, type: 'catapult' })), /unknown start type/);
  assert.throws(() => track(spec({ start: { ...START, gate: 'curtain' } })), /unknown gate/);
  assert.throws(() => track(spec({ start: { ...START, shots: { countdown: 'drone', launch: 'side' } } })), /unknown countdown shot/);
  // The station launch: only on the boost-launch opening, and a coaster on that opening launches from its station.
  assert.throws(() => track(coaster({ ...START, type: 'station-launch' })), /a launch from the station races the boost-launch opening/);
  assert.equal(track(coaster({ ...START, type: 'station-launch' }, { opening: opening('boost-launch') })).variety.start.type, 'station-launch');
  assert.throws(() => track(coaster({ ...START, type: 'cliff' }, { opening: opening('boost-launch') })), /only as a launch from the station/);
  // What the variety value says (tracks built before: the start every track had).
  const sog = physicsTrack('sognefjord');
  assert.deepEqual(sog.variety.start, { type: 'cliff', gate: 'trapdoor', countdown: 'side', launch: 'low-chase' });
  // (A Grand Prix keeps its starting lights, with its own first camera shots since the originals' new starts.)
  assert.deepEqual(physicsTrack('dubai-marble-grand-prix').variety.start, { type: null, gate: 'lights', countdown: 'side', launch: 'high-behind' });
  // The sameness check: no two tracks of a family open on the same pair of shots, at most two coasters per start type.
  const twin = track(coaster({ type: 'cliff', gate: 'paddle', shots: { countdown: 'side', launch: 'low-chase' } }, { slug: 'variety-twin', name: 'Variety Twin', opening: opening('crest-start'), sections: layout('two-splitters', { dress: { brakingStraight: { height: 0 } } }) }));
  const check = varietyCheck(twin, [...PHYSICS_TRACKS, twin]);
  const shots = check.lines.find((l) => /camera shots/.test(l.what));
  const type = check.lines.find((l) => /start type/.test(l.what));
  assert.equal(shots.pass, false);
  assert.equal(type.pass, false); // (Sognefjord and Ha Long Bay Spins start from a cliff already)
});

test('the first 20 seconds: a reused start fails; every track from Bislett Mile on differs from every other track\'s start', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { batchSeeds } = require('../src/report/batch');
  const { reachOf, startSequence, firstSecondsCheck, readSequences, tokensOf } = require('../src/report/firstSeconds');
  const stored = readSequences();
  // The check itself: the same sequence as another track fails.
  const athens = physicsTrack('marble-stadium-sprint');
  const same = firstSecondsCheck(athens, tokensOf(stored['chain-reaction']), PHYSICS_TRACKS, stored);
  assert.equal(same.line.pass, false);
  assert.match(same.line.value, /the same start as Chain Reaction/);
  // Every track on file is a track (none left over from a renamed one), and every kit track is on file.
  const kitTracks = PHYSICS_TRACKS.filter((t) => t.variety && profile(t)?.family !== 'test' && !/^variety-|kit-proving/.test(t.slug));
  assert.deepEqual(Object.keys(stored).sort(), kitTracks.map((t) => t.slug).sort());
  // The rule, for every track added after Berlin Blue Lanes: its own first 20 seconds, worked out again here.
  // (Every track after Marble Stadium Sprint and Berlin Blue Lanes, the two built before the check.)
  const order = require('../src/tracks').map((t) => t.slug);
  const held = order.slice(order.indexOf('marble-stadium-sprint') + 1).filter((slug) => slug !== 'berlin-blue-lanes');
  for (const slug of held) {
    const t = physicsTrack(slug);
    const seed = batchSeeds(0, 1)[0];
    const seq = startSequence(t, reachOf(simulatePhysicsRace({ seed, track: t, entries: houseField(seed), level: 3 })));
    assert.deepEqual(seq.map((x) => (x.side ? `${x.t} ${x.side}` : x.t)), stored[slug].seq, `${slug}: startSequences.json is out of date (node scripts/start-sequences.js ${slug})`);
    const { line } = firstSecondsCheck(t, seq, PHYSICS_TRACKS, stored);
    assert.equal(line.pass, true, `${slug}: ${line.value}`);
  }
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'scripts', 'start-sequences.js')));
});

test('no start part straight after the gate on two tracks in a row (every track from Bislett Mile on)', () => {
  const order = require('../src/tracks').map((t) => t.slug);
  const held = order.slice(order.indexOf('marble-stadium-sprint'));
  const first = (slug) => physicsTrack(slug).physics.kit.opening;
  for (let k = 1; k < held.length; k += 1) {
    assert.notEqual(first(held[k]), first(held[k - 1]), `${held[k - 1]} and ${held[k]} both start with ${first(held[k])}`);
  }
});
