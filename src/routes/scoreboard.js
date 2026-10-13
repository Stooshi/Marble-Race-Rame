'use strict';

const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { unauthorized } = require('../utils/httpError');
const { EARNED } = require('../economy');

const router = express.Router();

/**
 * The current season. [Placeholder] dates and number until seasons are planned;
 * the board counts coins earned in races finished inside these dates.
 */
const SEASON = { name: 'Season [3]', startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-31T23:59:59Z', badgeTop: 100 };
const TOP = 50;

/**
 * GET /api/scoreboard?board=season|all|friends — players ranked by coins earned
 * racing: places, personal bests, daily goals and streaks (money can't buy a place). Friends (v1): the players you raced with
 * in the last day. Always includes your own row when you're signed in.
 */
router.get('/', optionalAuth, async (req, res) => {
  const { board = 'season' } = validate(req.query, { board: { type: 'enum', values: ['season', 'all', 'friends'] } });
  const me = req.user?.id ?? null;
  if (board === 'friends' && !me) throw unauthorized('Log in to see your friends');
  const since = board === 'season' ? SEASON.startsAt : null;
  const { rows } = await db.query(
    `WITH friends AS (
       SELECT DISTINCT other.user_id
         FROM race_entries mine
         JOIN races r ON r.id = mine.race_id AND r.status = 'finished' AND r.finished_at > now() - interval '1 day'
         JOIN race_entries other ON other.race_id = mine.race_id AND other.user_id IS NOT NULL
        WHERE mine.user_id = $2
     ),
     played AS (
       SELECT e.user_id, COUNT(*) FILTER (WHERE e.finish_position = 1)::int AS wins, COUNT(*)::int AS races
         FROM race_entries e JOIN races r ON r.id = e.race_id AND r.status = 'finished'
        WHERE e.user_id IS NOT NULL
          AND ($1::timestamptz IS NULL OR r.finished_at >= $1)
          AND (NOT $3 OR e.user_id IN (SELECT user_id FROM friends) OR e.user_id = $2)
        GROUP BY e.user_id
     ),
     -- Coins earned racing (place, personal bests, daily goal, streak), from the coin ledger.
     earned AS (
       SELECT l.user_id, SUM(l.amount)::int AS coins
         FROM coin_ledger l
        WHERE l.currency = 'coins' AND l.kind = ANY($4::text[])
          AND ($1::timestamptz IS NULL OR l.created_at >= $1)
        GROUP BY l.user_id
     ),
     s AS (SELECT p.user_id, COALESCE(x.coins, 0) AS coins, p.wins, p.races FROM played p LEFT JOIN earned x ON x.user_id = p.user_id),
     ranked AS (SELECT s.*, rank() OVER (ORDER BY s.coins DESC, s.wins DESC)::int AS rank FROM s)
     SELECT ranked.rank, ranked.coins, ranked.wins, ranked.races, u.id AS user_id, u.username,
            sh.item_slug AS shooter_item, m.name AS shooter_original, m.color_primary, m.color_secondary, m.pattern
       FROM ranked
       JOIN users u ON u.id = ranked.user_id
       LEFT JOIN user_shooter sh ON sh.user_id = u.id
       LEFT JOIN marbles m ON m.id = sh.marble_id
      WHERE ranked.rank <= ${TOP} OR u.id = $2
      ORDER BY ranked.rank, u.username`,
    [since, me, board === 'friends', EARNED],
  );
  res.json({
    board,
    season: SEASON,
    rows: rows.map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      username: r.username,
      me: r.user_id === me,
      wins: r.wins,
      coins: r.coins,
      races: r.races,
      shooter: r.shooter_item
        ? { item: r.shooter_item }
        : r.shooter_original ? { original: { name: r.shooter_original, color_primary: r.color_primary, color_secondary: r.color_secondary, pattern: r.pattern } } : null,
    })),
  });
});

module.exports = router;
module.exports.SEASON = SEASON;
