import { describe, expect, it } from 'vitest';
import { PODIUM_MS, SETTLE_MS, WINNER_MS, arrivals, boardRows, finishPlan, phaseAt } from '../src/utils/finishShow';

describe('finish show', () => {
  it('runs winner → field → podium → board on the race clock, the podium once everyone is home', () => {
    // Live, part-way: the winner and one more are home, 3 marbles in all.
    const partial = finishPlan({ 0: 52000, 2: 53500 }, 3);
    expect(phaseAt(51999, partial)).toBe('racing');
    expect(phaseAt(52000, partial)).toBe('winner');
    expect(phaseAt(52000 + WINNER_MS, partial)).toBe('field');
    expect(phaseAt(90000, partial)).toBe('field'); // still waiting for the last one: no podium yet
    expect(phaseAt(52100, partial, true)).toBe('board'); // skipped

    const all = finishPlan({ 0: 52000, 2: 53500, 1: 70000 }, 3);
    expect(all.podiumAt).toBe(70000 + SETTLE_MS);
    expect(phaseAt(all.podiumAt, all)).toBe('podium');
    expect(phaseAt(all.podiumAt + PODIUM_MS, all)).toBe('board');
    // A close finish still gets the winner's moment in full before the podium.
    const close = finishPlan({ 0: 50000, 1: 50400 }, 2);
    expect(close.podiumAt).toBeGreaterThanOrEqual(50000 + WINNER_MS);
    // The race is over with a marble that never finished: the podium comes anyway.
    expect(finishPlan({ 0: 52000 }, 3, true).podiumAt).toBe(52000 + WINNER_MS + 1000);
    expect(finishPlan({}, 3)).toBeNull();
  });

  it('counts marbles home in order and builds the board with starting places, gaps, flags and my row', () => {
    const finishes = { 0: 61000, 1: 60000, 2: 62500 };
    expect(arrivals(finishes, 61500).map((a) => [a.index, a.place, a.gap])).toEqual([[1, 1, 0], [0, 2, 1000]]);
    const entries = [
      { index: 0, entryId: 'a', lane: 4, marble: { name: 'Coral' }, user: { id: 'u1', username: 'moses' } },
      { index: 1, entryId: 'b', lane: 0, marble: { name: 'Onyx' }, user: null },
      { index: 2, entryId: 'c', lane: 2, marble: { name: 'Pearl' }, user: { id: 'u2', username: 'sam' } },
      { index: 3, entryId: 'd', lane: 1, marble: { name: 'Topaz' }, user: null },
    ];
    const official = [
      { entry_id: 'b', comparison: { is_track_record: true } },
      { entry_id: 'a', comparison: { is_personal_best: true } },
    ];
    const rows = boardRows({ entries, finishes, official, mine: [0] });
    expect(rows.map((r) => [r.marble.name, r.place, r.start, r.gap, r.username])).toEqual([
      ['Onyx', 1, 1, 0, null],
      ['Coral', 2, 5, 1000, 'moses'],
      ['Pearl', 3, 3, 2500, 'sam'],
      ['Topaz', null, 2, null, null], // still racing
    ]);
    expect(rows.map((r) => [r.record, r.pb, r.mine])).toEqual([[true, false, false], [false, true, true], [false, false, false], [false, false, false]]);
  });
});
