/**
 * The finish of a race, as a show on the race clock (so it plays the same live
 * and in replays, and a replay rewound past the finish takes it away again):
 *
 *   winner  the winner crosses: flash, confetti, the WINNER banner (4 s)
 *   field   the banner shrinks to the top while the rest come home, a ticker
 *           counting them in (until everyone is home)
 *   podium  the top three on a gold, silver and bronze podium (6 s): the
 *           steps rise one at a time, first place last
 *   board   the results board, rows sliding in, then the next race
 *
 * Everything here is plain data (times in ms of race time); FinishShow.jsx draws it.
 */
export const WINNER_MS = 4000;  // the big banner, before it shrinks to the top
export const SETTLE_MS = 1500;  // after the last marble is home, before the podium
export const PODIUM_MS = 6000;  // the podium, before the board
export const PODIUM_STEP_MS = [1600, 900, 200]; // when gold, silver and bronze start to rise (after the podium appears)
export const PODIUM_RISE_MS = 800; // how long a step takes to rise
export const GOLD_LAND_MS = PODIUM_STEP_MS[0] + PODIUM_RISE_MS; // first place lands: a fresh burst of confetti
export const ROW_MS = 60;       // between board rows sliding in
export const BOARD_HOLD_MS = 4000; // a replay runs on this long past the board's arrival, for the rows to land

/**
 * When each stage starts. finishes: { entry index: finish time ms } (whoever is
 * known to have finished); count: marbles in the race; complete: no more
 * finishers to come (the race is over, or every marble is home).
 * Returns null until someone has finished.
 */
export function finishPlan(finishes, count, complete = false) {
  const times = Object.values(finishes ?? {}).filter(Number.isFinite);
  if (!times.length) return null;
  const winnerMs = Math.min(...times);
  const home = complete || times.length >= count;
  const lastMs = home ? Math.max(...times) : null;
  const podiumAt = home ? Math.max(winnerMs + WINNER_MS + 1000, lastMs + SETTLE_MS) : null;
  return { winnerMs, lastMs, podiumAt, boardAt: podiumAt === null ? null : podiumAt + PODIUM_MS };
}

/** Which stage the show is in at race time t: racing (no show yet), winner, field, podium or board. */
export function phaseAt(t, plan, skipped = false) {
  if (!plan || t === null || t === undefined || t < plan.winnerMs) return 'racing';
  if (skipped) return 'board';
  if (t < plan.winnerMs + WINNER_MS) return 'winner';
  if (plan.podiumAt === null || t < plan.podiumAt) return 'field';
  if (t < plan.boardAt) return 'podium';
  return 'board';
}

/**
 * The marbles home by race time t, in finishing order:
 * [{ index, place, ms, gap }] (gap = behind the winner).
 */
export function arrivals(finishes, t) {
  const home = Object.entries(finishes ?? {})
    .map(([i, ms]) => ({ index: Number(i), ms }))
    .filter((a) => Number.isFinite(a.ms) && a.ms <= t)
    .sort((a, b) => a.ms - b.ms || a.index - b.index);
  return home.map((a, k) => ({ ...a, place: k + 1, gap: a.ms - home[0].ms }));
}

/**
 * The results board's rows, one per marble, finishers first in order, then
 * any still racing. entries: the race's entries ({ index, entryId, lane,
 * marble, user }); official: the results API's rows (with entry_id and
 * comparison flags), if known; mine: the viewer's entry indexes.
 */
export function boardRows({ entries, finishes, official = null, mine = [] }) {
  const flags = Object.fromEntries((official ?? []).map((r) => [r.entry_id, r.comparison ?? {}]));
  const home = arrivals(finishes, Infinity);
  const placed = new Set(home.map((a) => a.index));
  const rows = home.map((a) => ({ ...a, racing: false }));
  for (const e of entries ?? []) if (!placed.has(e.index)) rows.push({ index: e.index, place: null, ms: null, gap: null, racing: true });
  return rows.map((r) => {
    const e = entries?.[r.index];
    const f = flags[e?.entryId] ?? {};
    return {
      ...r,
      start: Number.isInteger(e?.lane) ? e.lane + 1 : null,
      marble: e?.marble ?? null,
      username: e?.user?.username ?? null,
      record: Boolean(f.is_track_record),
      pb: Boolean(f.is_personal_best) && !f.is_track_record,
      mine: mine.includes(r.index),
    };
  });
}

/**
 * The confetti for a show (see utils/confetti.js): a burst as the winner
 * crosses and a steady fall through the winner's moment, a lighter drift
 * while the field comes home, then a fresh burst as first place lands on the
 * podium and a full fall while it stands.
 */
export function showerFor(plan) {
  if (!plan) return null;
  const { winnerMs, podiumAt, boardAt } = plan;
  const bursts = [{ at: winnerMs, kind: 'winner' }];
  const streams = [
    { from: winnerMs, to: winnerMs + WINNER_MS, rate: 1 },
    { from: winnerMs + WINNER_MS, to: podiumAt ?? Infinity, rate: 0.35 },
  ];
  if (podiumAt !== null) {
    bursts.push({ at: podiumAt + GOLD_LAND_MS, kind: 'podium' });
    streams.push({ from: podiumAt, to: boardAt, rate: 1 });
  }
  return { bursts, streams };
}
