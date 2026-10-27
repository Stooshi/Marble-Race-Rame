-- Credit packs (Leagues part 2, 27 Oct 2026; behind LEAGUES_PRO): a payment may now be a credit pack,
-- with credits (payments.credit_amount, added by database_schema.sql) and no coins. The rule "coins, or
-- a season pass" becomes "coins, a season pass, or credits". No rows change.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_coins_or_pass;
ALTER TABLE payments ADD CONSTRAINT payments_coins_or_pass CHECK (coins > 0 OR season_key IS NOT NULL OR credit_amount > 0);
