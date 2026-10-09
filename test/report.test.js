'use strict';

// The track report's measuring: overtakes are counted as the recipe means them,
// and the verdicts catch what the recipe forbids (an unbalanced splitter first).
const test = require('node:test');
const assert = require('node:assert/strict');
const { countOvertakes } = require('../src/report/overtakes');
const { summarize } = require('../src/report/summarize');
const { renderReport } = require('../src/report/html');
const { physicsTrack } = require('../src/game/physicsTracks');

/** Frames for two marbles: `pa(t)`, `pb(t)` their places down the track, `va`, `vb` their speeds. */
const race = (pa, pb, va, vb, ms = 20000) => {
  const frames = [];
  for (let t = 0; t <= ms; t += 50) frames.push({ t, p: [pa(t), pb(t)], v: [va(t), vb(t)] });
  return { frames, tickMs: 50 };
};

test('a racing overtake: two marbles at similar speeds swapping places, after the first 5 s, and staying swapped', () => {
  // b passes a at 10 s, both near 30 m/s: one overtake.
  const one = race((t) => t / 40000, (t) => (t < 10000 ? t / 41000 : 10000 / 41000 + (t - 10000) / 38000), () => 30, () => 31);
  assert.equal(countOvertakes(one).overtakes, 1);
  // The same pass inside the first 5 s: not counted.
  const early = race((t) => t / 40000, (t) => (t < 3000 ? t / 41000 : 3000 / 41000 + (t - 3000) / 38000), () => 30, () => 31);
  assert.equal(countOvertakes(early).overtakes, 0);
  // Flying past a marble stopped dead (speeds far apart): not a racing overtake.
  const stopped = race((t) => (t < 9000 ? t / 40000 : 9000 / 40000), (t) => t / 41000, (t) => (t < 9000 ? 30 : 1), () => 30);
  assert.equal(countOvertakes(stopped).overtakes, 0);
});

const fakeRace = ({ seed, winnerGroup = seed % 5, winnerStrength = seed % 4, leftWins = false, leftGain = 0, rightGain = 0 }) => ({
  seed, winnerMs: 52000, lastMs: 64000, unfinished: 0, gapMs: 12000, overtakes: 70, leadChanges: 3,
  winnerGroup, winnerStrength, placesByGroup: [42, 42, 42, 42, 42],
  forks: [{ left: { marbles: 13, wins: leftWins ? 1 : 0, placeChange: leftGain * 13 }, right: { marbles: 7, wins: leftWins ? 0 : 1, placeChange: rightGain * 7 } }],
  hits: { obstacles: { lane: [5, 5, 5, 5, 5], strength: [5, 5, 5, 5] }, boosts: { lane: [1, 1, 1, 1, 1], strength: [1, 1, 1, 1] } },
  highestHop: 0.9,
});

test('the report catches an unbalanced splitter: a channel winning far more than its share, or gaining places', () => {
  const track = physicsTrack('kit-proving-ground');
  const split = (lines) => lines.filter((l) => l.part === 'Splitters');
  // 65% of the marbles go left and win 65% of the races, gaining nothing: passes.
  const fair = Array.from({ length: 100 }, (_, k) => fakeRace({ seed: k, leftWins: k % 20 < 13 }));
  assert.ok(split(summarize([fair], track)).every((l) => l.pass));
  // 65% go left and win 86% of the races, gaining places on the right's marbles: both lines fail.
  const unbalanced = Array.from({ length: 100 }, (_, k) => fakeRace({ seed: k, leftWins: k % 100 < 86, leftGain: 0.58, rightGain: -1.12 }));
  const lines = split(summarize([unbalanced], track));
  assert.deepEqual(lines.map((l) => l.pass), [false, false]);
  assert.match(lines[0].value, /left 65.0% of marbles, 86.0% of wins/);
  // And the page shows it at the top, under "To fix".
  const html = renderReport({ slug: track.slug, name: track.name, at: '2026-10-09T17:00:00Z', races: 100, batches: 1, minutes: 1, lines: summarize([unbalanced], track) }, track);
  assert.match(html, /To fix before it goes live[\s\S]*Rock splitter/);
});

test('the report holds every track to the recipe\'s fairness, pace and close-racing targets', () => {
  const track = physicsTrack('kit-proving-ground');
  const ok = Array.from({ length: 100 }, (_, k) => fakeRace({ seed: k, leftWins: k % 20 < 13 }));
  const lines = summarize([ok], track);
  assert.ok(lines.filter((l) => l.part !== 'Fairness').every((l) => l.pass !== false), JSON.stringify(lines.filter((l) => l.pass === false)));
  const slow = ok.map((r) => ({ ...r, winnerMs: 61000, gapMs: 22000, overtakes: 40 }));
  const failed = summarize([slow], track).filter((l) => l.pass === false).map((l) => l.what);
  for (const what of [/Winner's time/, /gap/, /overtakes/]) assert.ok(failed.some((w) => what.test(w)), String(what));
});
