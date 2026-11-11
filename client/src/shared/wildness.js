/**
 * Wildness (Moses, 11 Nov 2026; docs/04-game-rules.md "Wildness"): how chaotic a track's races are, from
 * the track report's races and its big features (scripts/wildness.js). Luck, not skill. Shown as a badge
 * on track cards (teal / orange / magenta, always with the word: never colour alone, never red or green)
 * and as the All / Easy / Wild / Extreme filter in the track picker. Never changes a race.
 */
export const WILDNESS_LEVELS = ['easy', 'wild', 'extreme'];

export const WILDNESS = {
  easy: { word: 'Easy', waves: 1, about: 'Smooth, flowing races: fewer collisions, the order settles' },
  wild: { word: 'Wild', waves: 2, about: 'Plenty of bumping and overtaking' },
  extreme: { word: 'Extreme', waves: 3, about: 'Pile-ups, loops, splitters, drops: anything can happen' },
};

/** The one-line explanation, wherever wildness first appears. */
export const WILDNESS_NOTE = "Wildness: how chaotic the races are: collisions, overtakes, loops and drops. It's luck, not skill: every marble has the same chance.";

/** A track's level, or null (a track not worked out yet, or a Classic one). */
export const wildnessOf = (track) => (WILDNESS[track?.wildness] ? track.wildness : null);

/** The picker's filter: 'all' or a level. */
export const matchesWildness = (track, filter) => !filter || filter === 'all' || wildnessOf(track) === filter;
