'use strict';

/**
 * Who a race is for: its session. A race with exactly one real player (every
 * other marble a house marble) is a solo session; with more real players it
 * is a group session (later, a room is a group session too).
 *
 * The rules that follow from it:
 *   - solo: once the winner is home the player may skip to the results (the
 *     board shows only the marbles home by then, the rest "still racing"),
 *     and may race again straight away, without waiting for the last marble;
 *   - group: everyone watches until the last marble is home, then sees the
 *     results together; racing again waits for the race to finish.
 *
 * entries: race_entries rows ({ user_id, is_bot }).
 */
function raceSession(entries) {
  const players = new Set((entries ?? []).filter((e) => !e.is_bot && e.user_id).map((e) => e.user_id));
  const solo = players.size === 1;
  return { players: players.size, solo, canSkip: solo, raceAgainEarly: solo };
}

/** Whether this user may set up (or join) the next race of `race` now. */
function mayRaceAgain(race, entries, userId) {
  if (race.status === 'finished') return true;
  const session = raceSession(entries);
  return race.status === 'running' && session.raceAgainEarly && entries.some((e) => e.user_id === userId && !e.is_bot);
}

module.exports = { raceSession, mayRaceAgain };
