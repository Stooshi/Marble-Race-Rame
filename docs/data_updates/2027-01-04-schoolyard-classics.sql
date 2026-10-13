-- One-time data update: Collection 1 is now Schoolyard Classics.
--
-- The Grand Opening marbles leave the catalogue (client/src/shared/marbles/
-- catalog.json). Any copy of one that a player bought is refunded in full, in
-- the coins or credits they paid (a 'refund' line in the coin ledger), and
-- taken out of their Marble Bag; a Shooter set to one goes back to the
-- player's plain starter. Its First Edition counter goes too. Race results and
-- replays are not touched. Payments were switched off, so this should find
-- only test purchases.

CREATE TEMP TABLE sc_items ON COMMIT DROP AS
SELECT unnest(ARRAY['clearie-classic', 'clearie-ocean', 'clearie-forest', 'clearie-berry', 'clearie-sunset', 'aggie-classic', 'aggie-ocean', 'aggie-forest', 'aggie-berry', 'aggie-sunset', 'patch-classic', 'patch-ocean', 'patch-forest', 'patch-berry', 'patch-sunset', 'cats-eye-classic', 'cats-eye-ocean', 'cats-eye-forest', 'cats-eye-berry', 'cats-eye-sunset', 'corkscrew-classic', 'corkscrew-ocean', 'corkscrew-forest', 'corkscrew-berry', 'corkscrew-sunset', 'bumblebee-classic', 'bumblebee-ocean', 'bumblebee-forest', 'bumblebee-berry', 'bumblebee-sunset', 'oxblood-classic', 'oxblood-ocean', 'oxblood-forest', 'oxblood-berry', 'oxblood-sunset', 'steelie-classic', 'steelie-ocean', 'steelie-forest', 'steelie-berry', 'steelie-sunset', 'flame-swirl-classic', 'flame-swirl-ocean', 'flame-swirl-forest', 'flame-swirl-berry', 'flame-swirl-sunset', 'champion-classic', 'champion-ocean', 'champion-forest', 'champion-berry', 'champion-sunset', 'aurora-aurora']::text[]) AS slug;

WITH gone AS (
    SELECT c.user_id, c.currency, SUM(c.price_paid)::int AS paid, string_agg(c.item_slug, ', ') AS slugs
      FROM user_collection c
     WHERE c.item_slug NOT IN (SELECT slug FROM sc_items) AND c.price_paid > 0 AND c.currency IS NOT NULL
     GROUP BY c.user_id, c.currency
), refunded AS (
    UPDATE users u SET coins = u.coins + CASE WHEN g.currency = 'coins' THEN g.paid ELSE 0 END,
                       credits = u.credits + CASE WHEN g.currency = 'credits' THEN g.paid ELSE 0 END
      FROM gone g WHERE g.user_id = u.id
    RETURNING u.id, g.currency, g.paid, g.slugs, CASE WHEN g.currency = 'coins' THEN u.coins ELSE u.credits END AS balance
)
INSERT INTO coin_ledger (user_id, currency, amount, kind, note, balance_after)
SELECT id, currency, paid, 'refund', 'Grand Opening retired: ' || slugs, balance FROM refunded;

DELETE FROM user_shooter WHERE item_slug IS NOT NULL AND item_slug NOT IN (SELECT slug FROM sc_items);
DELETE FROM user_collection WHERE item_slug NOT IN (SELECT slug FROM sc_items);
DELETE FROM collection_counters WHERE item_slug NOT IN (SELECT slug FROM sc_items);
