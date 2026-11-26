-- One-time data update: track pack payments (Moses, 12 Nov 2026; src/packs/sale.js).
--
-- A track pack's payment gives no coins (coins 0) and carries its pack (payments.pack_key, added by the
-- schema), like a season pass's payment: the check that a payment gives coins or a pass now also allows a
-- pack. Sells nothing by itself: packs are sold only while TRACK_PACKS is on for the player.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_coins_or_pass;
ALTER TABLE payments ADD CONSTRAINT payments_coins_or_pass CHECK (coins > 0 OR season_key IS NOT NULL OR pack_key IS NOT NULL);
