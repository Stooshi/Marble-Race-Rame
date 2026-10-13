-- One-time data update: start the coin ledger.
--
-- The coin economy (client/src/shared/economy.json) records every change to a
-- player's coins and credits in coin_ledger from now on. This writes what came
-- before: each race's coins as a 'race' line on the day the race finished, and
-- one 'opening-balance' line per player and currency for the rest (starting
-- coins, purchases, refunds), so each player's ledger adds up to their balance.
-- Balances themselves are not touched.

INSERT INTO coin_ledger (user_id, currency, amount, kind, race_id, note, created_at)
SELECT e.user_id, 'coins', e.coins_awarded, 'race', e.race_id, 'before the coin ledger', COALESCE(r.finished_at, r.created_at)
  FROM race_entries e JOIN races r ON r.id = e.race_id
 WHERE e.user_id IS NOT NULL AND e.coins_awarded > 0
   AND NOT EXISTS (SELECT 1 FROM coin_ledger l WHERE l.user_id = e.user_id AND l.race_id = e.race_id);

INSERT INTO coin_ledger (user_id, currency, amount, kind, note, balance_after, created_at)
SELECT u.id, c.currency, c.balance - COALESCE(s.total, 0), 'opening-balance', 'before the coin ledger', c.balance, u.created_at
  FROM users u
 CROSS JOIN LATERAL (VALUES ('coins', u.coins), ('credits', u.credits)) AS c(currency, balance)
  LEFT JOIN LATERAL (SELECT SUM(l.amount)::int AS total FROM coin_ledger l WHERE l.user_id = u.id AND l.currency = c.currency) s ON true
 WHERE c.balance - COALESCE(s.total, 0) <> 0;
