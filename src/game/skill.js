'use strict';

/**
 * Skill belongs to the player, not the marble. Every marble in a player's
 * Marble Bag races at the player's skill level, whichever one is their
 * Shooter: marbles are looks only.
 *
 * The race engines still take four stats per entry (top speed, acceleration,
 * handling, luck); a skill level sets all four to the same number. Each entry
 * keeps its own copy of those four (race_entries.snap_*), so races already run
 * replay exactly as they ran.
 */

/** Every player starts here: the middle of the house field. */
const STARTING_SKILL = 50;

/**
 * The house marbles' (bots') skill levels: a race draws as many as it needs,
 * at random from its seed. Spread so the better ones win more often without
 * dominating (checked on Bobsleigh Run and San Francisco).
 */
const HOUSE_SKILLS = Object.freeze([45, 46, 46, 47, 47, 48, 49, 49, 50, 50, 50, 50, 51, 51, 52, 53, 53, 54, 54, 55]);

/** The four engine stats for a skill level. */
function skillStats(skill) {
  const s = Math.min(100, Math.max(1, Math.round(Number(skill) || STARTING_SKILL)));
  return { topSpeed: s, acceleration: s, handling: s, luck: s };
}

module.exports = { STARTING_SKILL, HOUSE_SKILLS, skillStats };
