'use strict';

/**
 * One race, measured for the track report: pace, gap, overtakes, who won
 * (starting group, strength group), each splitter's channels, and who the
 * obstacles, boosts and bumps hit. Everything here is read from the race the
 * engine ran; nothing changes it.
 */
const { countOvertakes } = require('./overtakes');

const GROUPS = 5;          // groups of 4 starting places (lanes 0-3, 4-7, …)
const STRENGTH_GROUPS = 4; // groups of 5 marbles by strength (strongest first)
const OBSTACLES = new Set(['ice_block', 'snowman', 'icicles', 'polar_bear', 'bus', 'slalom_gate', 'cable_car', 'sea_lion', 'planter', 'hydrant', 'news_box', 'trash_can']);

const rankAt = (frame, i) => frame.p.reduce((r, p, j) => r + (p > frame.p[i] ? 1 : 0), 1);

function frameWhere(frames, i, p) {
  return frames.find((f) => f.p[i] >= p) ?? frames[frames.length - 1];
}

/**
 * @param sim     simulatePhysicsRace's result
 * @param entries the field ({ lane, topSpeed, … } per marble, in index order)
 * @param track   the track raced (physics.forks for its splitters)
 */
function analyzeRace(sim, entries, track) {
  const n = entries.length;
  const laneGroup = (i) => Math.min(GROUPS - 1, Math.floor(entries[i].lane / (n / GROUPS)));
  // Strength: strongest first (ties keep the field's order, the same every race of a seed).
  const byStrength = entries.map((e, i) => i).sort((a, b) => entries[b].topSpeed - entries[a].topSpeed || a - b);
  const strengthGroup = new Array(n);
  byStrength.forEach((i, rank) => { strengthGroup[i] = Math.min(STRENGTH_GROUPS - 1, Math.floor(rank / (n / STRENGTH_GROUPS))); });

  const finish = new Array(n).fill(null);
  for (const r of sim.results) finish[r.index] = r;
  const winner = sim.results.find((r) => r.position === 1).index;
  const placesByGroup = new Array(GROUPS).fill(0);
  for (let i = 0; i < n; i += 1) placesByGroup[laneGroup(i)] += finish[i].position;

  // Splitters: which channel each marble took (the frames' branch: + left, - right), its place
  // going in and coming out, and whether it won.
  const forks = (track.physics.forks ?? (track.physics.fork ? [track.physics.fork] : [])).map((fork) => {
    const mid = (fork.from + fork.to) / 2;
    const channels = { left: { marbles: 0, wins: 0, placeChange: 0 }, right: { marbles: 0, wins: 0, placeChange: 0 } };
    for (let i = 0; i < n; i += 1) {
      const b = frameWhere(sim.frames, i, mid).b?.[i] ?? 0;
      const c = channels[b > 0 ? 'left' : 'right'];
      c.marbles += 1;
      if (i === winner) c.wins += 1;
      c.placeChange += rankAt(frameWhere(sim.frames, i, fork.from), i) - rankAt(frameWhere(sim.frames, i, fork.to), i);
    }
    return channels;
  });

  // Who the obstacles and boosts hit, by starting group and strength group.
  const hits = { obstacles: { lane: new Array(GROUPS).fill(0), strength: new Array(STRENGTH_GROUPS).fill(0) }, boosts: { lane: new Array(GROUPS).fill(0), strength: new Array(STRENGTH_GROUPS).fill(0) } };
  for (const e of sim.events) {
    const kind = e.type === 'boost' ? 'boosts' : e.type === 'bounce' && OBSTACLES.has(e.obstacle) ? 'obstacles' : null;
    if (!kind) continue;
    hits[kind].lane[laneGroup(e.i)] += 1;
    hits[kind].strength[strengthGroup[e.i]] += 1;
  }

  const { overtakes, leadChanges } = countOvertakes(sim);
  return {
    seed: sim.seed,
    winnerMs: sim.stats.winnerMs,
    lastMs: sim.stats.lastMs,
    unfinished: sim.stats.unfinished,
    gapMs: sim.stats.lastMs - sim.stats.winnerMs,
    overtakes,
    leadChanges,
    winnerGroup: laneGroup(winner),
    winnerStrength: strengthGroup[winner],
    placesByGroup,
    forks,
    hits,
    highestHop: sim.stats.highestAirMetres,
    bumps: sim.stats.features?.bump ?? 0,
  };
}

module.exports = { analyzeRace, GROUPS, STRENGTH_GROUPS };
