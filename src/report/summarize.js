'use strict';

/**
 * The track report's verdicts: each batch's races (./analyze.js) turned into
 * lines of { part, what, value, target, pass } against the track recipe.
 * `pass` is true, false, or null (shown, not judged).
 */
const { GROUPS, STRENGTH_GROUPS } = require('./analyze');

const TARGETS = {
  groupWins: [17, 23],        // % of wins per group of 4 starting places
  groupPlace: [10.2, 10.8],   // average finishing place per group
  strongestWins: [35, 50],    // % of wins by the strongest five
  weakestWins: 8,             // % of wins by the weakest five, at least
  strongestOverWeakest: 2,    // the strongest five win at least twice as often
  winner: [48, 55],           // seconds, the median winner (new designs)
  last: 85,                   // seconds, the slowest marble home, at most
  ceiling: 90,                // seconds, never longer
  gap: 18,                    // seconds, median winner to last
  overtakes: 60,              // racing overtakes per race, median, at least
  splitPoints: 5,             // a channel's share of wins within this many points of its share of marbles
  splitPlaces: 0.5,           // places gained or lost going through one channel rather than the other, at most
  hitShare: 5,                // points a group's share of obstacle hits may be off fair
  hop: 1.2,                   // metres, the highest hop in any race
};

const SINGLE_BATCH_SLACK = 2; // points: a single batch's chance wobble (about 1.5 standard deviations of 1,000 races)

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const pct = (x, n) => (100 * x) / n;
const within = (v, [lo, hi]) => v >= lo && v <= hi;
const fmt = (v, d = 1) => Number(v).toFixed(d);

function fairness(batch, b, pooled = false) {
  const n = batch.length;
  const lines = [];
  const wins = new Array(GROUPS).fill(0);
  const places = new Array(GROUPS).fill(0);
  const strength = new Array(STRENGTH_GROUPS).fill(0);
  for (const r of batch) {
    wins[r.winnerGroup] += 1;
    strength[r.winnerStrength] += 1;
    r.placesByGroup.forEach((p, g) => { places[g] += p; });
  }
  const winPct = wins.map((w) => pct(w, n));
  const avgPlace = places.map((p) => p / (n * 4));
  const strong = pct(strength[0], n);
  const weak = pct(strength[STRENGTH_GROUPS - 1], n);
  const tag = pooled ? `All ${b} batches together (${n.toLocaleString('en')} races)` : `Batch ${b + 1}`;
  // One batch of 1,000 races wanders about 1.3 points either way by chance alone, so each batch
  // is held to a band wide enough for that (a real edge still shows); all of them together, to the recipe.
  const groupBand = pooled ? TARGETS.groupWins : [TARGETS.groupWins[0] - SINGLE_BATCH_SLACK, TARGETS.groupWins[1] + SINGLE_BATCH_SLACK];
  const placeBand = pooled ? TARGETS.groupPlace : [TARGETS.groupPlace[0] - 0.2, TARGETS.groupPlace[1] + 0.2];
  lines.push({ part: 'Fairness', what: `${tag}: wins per group of 4 starting places`, value: winPct.map((v) => `${fmt(v)}%`).join(' / '), target: `${groupBand[0]} to ${groupBand[1]}% each`, pass: winPct.every((v) => within(v, groupBand)) });
  lines.push({ part: 'Fairness', what: `${tag}: average finishing place per group`, value: avgPlace.map((v) => fmt(v)).join(' / '), target: `${placeBand[0].toFixed(1)} to ${placeBand[1].toFixed(1)}`, pass: avgPlace.every((v) => within(v, placeBand)) });
  const strongBand = pooled ? TARGETS.strongestWins : [TARGETS.strongestWins[0] - SINGLE_BATCH_SLACK, TARGETS.strongestWins[1] + SINGLE_BATCH_SLACK];
  const weakest = pooled ? TARGETS.weakestWins : TARGETS.weakestWins - 1.5;
  lines.push({
    part: 'Fairness',
    what: `${tag}: strongest five vs weakest five`,
    value: `${fmt(strong)}% vs ${fmt(weak)}% of wins`,
    target: `strongest ${strongBand[0]} to ${strongBand[1]}%, weakest at least ${weakest}%, at least twice`,
    pass: within(strong, strongBand) && weak >= weakest && strong >= TARGETS.strongestOverWeakest * weak,
  });
  return lines;
}

/** Every line of the races part of the report. `track`: the track raced (its kit sections, forks). */
function summarize(batches, track) {
  const all = batches.flat();
  const n = all.length;
  const lines = [];
  batches.forEach((batch, b) => lines.push(...fairness(batch, b)));
  if (batches.length > 1) lines.push(...fairness(all, batches.length, true));

  // Pace.
  const winners = all.map((r) => r.winnerMs / 1000);
  const lasts = all.map((r) => r.lastMs / 1000);
  const unfinished = all.filter((r) => r.unfinished > 0).length;
  lines.push({ part: 'Pace', what: 'Winner\'s time (median, fastest to slowest)', value: `${fmt(median(winners))} s (${fmt(Math.min(...winners))} to ${fmt(Math.max(...winners))})`, target: `${TARGETS.winner[0]} to ${TARGETS.winner[1]} s`, pass: within(median(winners), TARGETS.winner) });
  lines.push({ part: 'Pace', what: 'Last marble home (slowest race)', value: `${fmt(Math.max(...lasts))} s`, target: `under ${TARGETS.last} s, never over ${TARGETS.ceiling} s`, pass: Math.max(...lasts) < TARGETS.last });
  lines.push({ part: 'Pace', what: 'Every marble home', value: unfinished ? `${unfinished} of ${n} races left a marble out` : `all ${n} races`, target: 'every race', pass: unfinished === 0 });

  // Close racing.
  const gaps = all.map((r) => r.gapMs / 1000);
  const overtakes = all.map((r) => r.overtakes);
  lines.push({ part: 'Close racing', what: 'Winner-to-last gap (median race)', value: `${fmt(median(gaps))} s`, target: `${TARGETS.gap} s or less`, pass: median(gaps) <= TARGETS.gap });
  lines.push({ part: 'Close racing', what: 'Racing overtakes per race (median)', value: `${median(overtakes)}`, target: `at least ${TARGETS.overtakes}`, pass: median(overtakes) >= TARGETS.overtakes });
  lines.push({ part: 'Close racing', what: 'Lead changes per race (median)', value: `${median(all.map((r) => r.leadChanges))}`, target: 'shown', pass: null });

  // Splitters.
  const forks = track.physics.forks ?? (track.physics.fork ? [track.physics.fork] : []);
  const kitSections = track.physics.kit?.sections ?? [];
  forks.forEach((fork, k) => {
    const name = kitSections.find((s) => s.shape === 'splitter' && fork.from >= s.from - 0.02 && fork.from <= s.to)?.name ?? `Splitter ${k + 1}`;
    const sum = { left: { marbles: 0, wins: 0, placeChange: 0 }, right: { marbles: 0, wins: 0, placeChange: 0 } };
    for (const r of all) for (const side of ['left', 'right']) for (const key of ['marbles', 'wins', 'placeChange']) sum[side][key] += r.forks[k][side][key];
    const share = (side) => pct(sum[side].marbles, n * 20);
    const winShare = (side) => pct(sum[side].wins, n);
    const gain = (side) => (sum[side].marbles ? sum[side].placeChange / sum[side].marbles : 0);
    const off = Math.max(...['left', 'right'].map((s) => Math.abs(winShare(s) - share(s))));
    lines.push({
      part: 'Splitters',
      what: `${name}: each channel's share of marbles vs share of wins`,
      value: `left ${fmt(share('left'))}% of marbles, ${fmt(winShare('left'))}% of wins · right ${fmt(share('right'))}%, ${fmt(winShare('right'))}%`,
      target: `within ${TARGETS.splitPoints} points`,
      pass: off <= TARGETS.splitPoints,
      detail: { off },
    });
    const diff = gain('left') - gain('right');
    lines.push({
      part: 'Splitters',
      what: `${name}: same place in, same place out`,
      value: `left ${gain('left') >= 0 ? '+' : ''}${fmt(gain('left'), 2)} places, right ${gain('right') >= 0 ? '+' : ''}${fmt(gain('right'), 2)} per marble`,
      target: `within ${TARGETS.splitPlaces} places of each other`,
      pass: Math.abs(diff) <= TARGETS.splitPlaces,
    });
  });
  if (!forks.length) lines.push({ part: 'Splitters', what: 'Splitters', value: 'none on this track', target: '', pass: null });

  // Obstacles, boosts and bumps: no starting place or strength group hit more or less than its share.
  for (const kind of ['obstacles', 'boosts']) {
    const lane = new Array(GROUPS).fill(0);
    const strength = new Array(STRENGTH_GROUPS).fill(0);
    for (const r of all) {
      r.hits[kind].lane.forEach((h, g) => { lane[g] += h; });
      r.hits[kind].strength.forEach((h, g) => { strength[g] += h; });
    }
    const total = lane.reduce((a, b) => a + b, 0);
    if (!total) continue;
    const laneShare = lane.map((h) => pct(h, total));
    const strengthShare = strength.map((h) => pct(h, total));
    const label = kind === 'obstacles' ? 'Obstacle hits' : 'Boost pads taken';
    lines.push({ part: 'Obstacles, boosts, bumps', what: `${label} by starting group`, value: laneShare.map((v) => `${fmt(v)}%`).join(' / '), target: `each ${100 / GROUPS}% ± ${TARGETS.hitShare}`, pass: laneShare.every((v) => Math.abs(v - 100 / GROUPS) <= TARGETS.hitShare) });
    lines.push({ part: 'Obstacles, boosts, bumps', what: `${label} by strength group (strongest first)`, value: strengthShare.map((v) => `${fmt(v)}%`).join(' / '), target: `each ${100 / STRENGTH_GROUPS}% ± ${TARGETS.hitShare}`, pass: strengthShare.every((v) => Math.abs(v - 100 / STRENGTH_GROUPS) <= TARGETS.hitShare) });
  }
  const hops = all.map((r) => r.highestHop).sort((a, b) => a - b);
  const p99 = hops[Math.floor(hops.length * 0.99)];
  lines.push({ part: 'Obstacles, boosts, bumps', what: 'Highest hop per race (median, 1 race in 100, highest of all)', value: `${fmt(median(hops), 2)} m, ${fmt(p99, 2)} m, ${fmt(hops[hops.length - 1], 2)} m`, target: `about 1 m: 1 race in 100 at most ${TARGETS.hop} m`, pass: p99 <= TARGETS.hop });
  return lines;
}

module.exports = { summarize, TARGETS, median };
