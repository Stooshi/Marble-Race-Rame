-- One-time data update: skill belongs to the player, not the marble.
--
-- Marbles no longer carry strength: every player races at their own skill
-- (users.skill, 50 for everyone to start), whichever marble from their Marble
-- Bag is their Shooter. So that nobody who bought a marble for its stats feels
-- cheated:
--   * every coin spent on marbles is refunded in full, once, at the shop price
--     (the free starters cost nothing, so they refund nothing);
--   * players keep every marble they bought, as a look;
--   * the refund is noted on the player (users.skill_refund_coins) so the
--     dashboard can explain it once.
-- The marble descriptions no longer promise strengths: each now describes the
-- marble's look (the new texts are staged in seed_marbles by
-- docs/database_schema.sql; rows matched by slug, or by name as in
-- 2026-10-04-restore-marbles-tracks.sql).
--
-- Races already run keep their own copy of the stats they ran with, so their
-- results and replays do not change. The last statement returns the summary
-- recorded in data_updates.

WITH paid AS (
    SELECT um.user_id, SUM(m.price_coins)::int AS coins
      FROM user_marbles um
      JOIN marbles m ON m.id = um.marble_id
     WHERE NOT m.is_starter AND m.price_coins > 0
     GROUP BY um.user_id
),
refunded AS (
    UPDATE users u
       SET coins = u.coins + p.coins,
           skill_refund_coins = p.coins
      FROM paid p
     WHERE u.id = p.user_id
    RETURNING p.coins
),
described AS (
    UPDATE marbles m
       SET description = s.description
      FROM seed_marbles s
     WHERE m.slug = s.slug
        OR (lower(m.name) = lower(s.name) AND m.slug NOT IN (SELECT slug FROM seed_marbles))
    RETURNING 1
)
SELECT (SELECT count(*) FROM refunded)                AS "players refunded",
       (SELECT COALESCE(SUM(coins), 0) FROM refunded) AS "coins refunded",
       (SELECT count(*) FROM described)               AS "marble descriptions updated";
