-- One-time data update: coins become the only currency, and the coin ledger starts.
--
-- The coin economy (client/src/shared/economy.json) has one currency, coins,
-- earned by racing or bought in coin packs, and records every change in
-- coin_ledger. Coins are now worth a tenth of what they were, so:
--   * every coin amount so far is multiplied by 10: balances, race coins,
--     entry fees, plain-marble prices, the skill-refund notice and what was
--     paid for collection marbles;
--   * credits become coins at 1 credit = 1,000 coins (counted as bought
--     coins), and the credits columns go;
--   * the ledger gets what came before: each race's coins as a 'race' line
--     (earned) on the day the race finished, a 'credit-conversion' line
--     (bought) for converted credits, and one 'opening-balance' line for the
--     rest (starting coins, purchases, refunds), so each player's ledger adds
--     up to their balance.
-- Works on a database with or without the credits columns.

-- 1. Coins so far, times 10.
UPDATE users SET coins = coins * 10 WHERE coins > 0;
UPDATE users SET skill_refund_coins = skill_refund_coins * 10 WHERE skill_refund_coins IS NOT NULL;
UPDATE race_entries SET coins_awarded = coins_awarded * 10 WHERE coins_awarded > 0;
UPDATE races SET entry_fee_coins = entry_fee_coins * 10 WHERE entry_fee_coins > 0;
UPDATE marbles SET price_coins = price_coins * 10 WHERE price_coins > 0;
UPDATE user_collection
   SET price_paid = price_paid * CASE WHEN currency = 'credits' THEN 1000 ELSE 10 END, currency = 'coins'
 WHERE currency IS NOT NULL;

-- 2. Race coins so far: earned.
INSERT INTO coin_ledger (user_id, amount, kind, race_id, note, created_at)
SELECT e.user_id, e.coins_awarded, 'race', e.race_id, 'before coins-only', COALESCE(r.finished_at, r.created_at)
  FROM race_entries e JOIN races r ON r.id = e.race_id
 WHERE e.user_id IS NOT NULL AND e.coins_awarded > 0
   AND NOT EXISTS (SELECT 1 FROM coin_ledger l WHERE l.user_id = e.user_id AND l.race_id = e.race_id);

UPDATE users u SET coins_earned = s.total
  FROM (SELECT user_id, SUM(amount)::int AS total FROM coin_ledger WHERE kind = 'race' GROUP BY user_id) s
 WHERE s.user_id = u.id;

-- 3. Credits become coins (1 credit = 1,000 coins), bought.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'credits') THEN
    EXECUTE $q$
      INSERT INTO coin_ledger (user_id, amount, kind, note)
      SELECT id, credits * 1000, 'credit-conversion', credits || ' credits at 1,000 coins each' FROM users WHERE credits > 0
    $q$;
    EXECUTE 'UPDATE users SET coins = coins + credits * 1000, coins_bought = coins_bought + credits * 1000 WHERE credits > 0';
    EXECUTE 'ALTER TABLE users DROP COLUMN credits';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'credits') THEN
    EXECUTE 'UPDATE payments SET coins = credits * 1000 WHERE coins IS NULL';
    EXECUTE 'ALTER TABLE payments DROP COLUMN credits';
  END IF;
END
$$;
ALTER TABLE payments ALTER COLUMN coins SET NOT NULL;

-- 4. The rest of each balance.
INSERT INTO coin_ledger (user_id, amount, kind, note, balance_after, created_at)
SELECT u.id, u.coins - COALESCE(s.total, 0), 'opening-balance', 'before coins-only', u.coins, u.created_at
  FROM users u
  LEFT JOIN LATERAL (SELECT SUM(l.amount)::int AS total FROM coin_ledger l WHERE l.user_id = u.id) s ON true
 WHERE u.coins - COALESCE(s.total, 0) <> 0;
