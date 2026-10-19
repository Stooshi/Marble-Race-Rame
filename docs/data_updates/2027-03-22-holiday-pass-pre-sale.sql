-- One-time data update: the Holiday Season Pass pre-sale (Moses, 19 Oct 2026).
--
-- The pass goes on sale on 28 Nov 2026 00:00 Swedish time (72 hours before the season), on the
-- website (Stripe) and in the apps (App Store, Google Play) alike: the sale start is a date, not a
-- platform setting. The season itself still starts on 1 Dec 2026 00:00 (starts_at, unchanged): the
-- holiday tracks, the Track of the Day bonus and holiday rooms open then for every pass holder, not
-- at purchase. Before 1 Dec the pass page and checkout say "Activates 1 December", with a countdown.
-- Replaces "no pre-sale" (docs/06-decisions.md).

UPDATE seasons
   SET pass_sale_starts_at = '2026-11-28T00:00:00+01:00'
 WHERE key = 'holiday-2026';

-- Both dates in Swedish time: sale_opens 2026-11-28 00:00, activates 2026-12-01 00:00.
SELECT key,
       to_char(pass_sale_starts_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') AS sale_opens,
       to_char(starts_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') AS activates
  FROM seasons WHERE key = 'holiday-2026';
