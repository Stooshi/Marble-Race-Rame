-- One-time data update: the Holiday Season 2026 and its pass.
--
-- 1. A season pass is a payment with no coins (payments.season_key says which season), so a
--    payment's coins may now be 0 for a pass; a coin pack still has more than 0.
-- 2. The season: 1 Dec 2026 00:00 to 7 Jan 2027 23:59 Swedish time; its tracks are free for
--    everyone from the end. The pass is $9.99 (holiday-pass-2026), real money only, on sale from
--    the season's start to its end. The Track of the Day (Swedish calendar days) pays pass holders
--    +50% race coins on their full-pay races (docs/04-game-rules.md "Seasons").
--    The holiday tracks themselves come in their own data updates (switched off, season_key set).

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_coins_check;
ALTER TABLE payments ADD CONSTRAINT payments_coins_check CHECK (coins >= 0);
ALTER TABLE payments ADD CONSTRAINT payments_coins_or_pass CHECK (coins > 0 OR season_key IS NOT NULL);

INSERT INTO seasons (key, name, starts_at, ends_at, free_from, time_zone, pass_product_id, pass_name, price_cents, currency,
                     pass_sale_starts_at, pass_sale_ends_at, featured, featured_bonus)
VALUES ('holiday-2026', 'Holiday Season 2026',
        '2026-12-01T00:00:00+01:00', '2027-01-07T23:59:59+01:00', '2027-01-07T23:59:59+01:00', 'Europe/Stockholm',
        'holiday-pass-2026', 'Holiday Season Pass 2026', 999, 'usd',
        '2026-12-01T00:00:00+01:00', '2027-01-07T23:59:59+01:00',
        '{"2026-12-01":"tromso-aurora-grand-prix","2026-12-02":"cape-town-summer-christmas","2026-12-03":"gingerbread-village",
          "2026-12-04":"goa-star-lanterns","2026-12-05":"quebec-old-town-spins","2026-12-06":"outback-christmas-burst",
          "2026-12-07":"medellin-lights","2026-12-08":"zermatt-marble-grand-prix","2026-12-09":"accra-december-beats",
          "2026-12-10":"seoul-winter-lights","2026-12-11":"ice-palace","2026-12-12":"buenos-aires-summer-christmas",
          "2026-12-13":"reykjavik-yule-lights","2026-12-14":"queenstown-pohutukawa-run","2026-12-15":"coptic-cairo-lights",
          "2026-12-16":"san-fernando-lantern-spins","2026-12-17":"oaxaca-posadas-run","2026-12-18":"sapporo-snow-sculptures",
          "2026-12-19":"belgrade-badnjak-run","2026-12-20":"night-train-north","2026-12-21":"trinidad-parang-run",
          "2026-12-22":"lalibela-genna-spins","2026-12-23":"sleigh-bell-forest","2026-12-24":"gamla-stan-christmas-run",
          "2026-12-25":"harbin-ice-city","2026-12-26":"nuremberg-christmas-market-run","2026-12-27":"new-york-winter-run",
          "2026-12-28":"veliky-ustyug-frost-run","2026-12-29":"rio-new-year-burst","2026-12-30":"edinburgh-hogmanay-grand-prix",
          "2026-12-31":"sydney-harbour-new-year","2027-01-01":"rio-new-year-burst","2027-01-02":"veliky-ustyug-frost-run",
          "2027-01-03":"seoul-winter-lights","2027-01-04":"queenstown-pohutukawa-run","2027-01-05":"night-train-north",
          "2027-01-06":"belgrade-badnjak-run","2027-01-07":"lalibela-genna-spins"}'::jsonb,
        0.5)
ON CONFLICT (key) DO NOTHING;

SELECT count(*) AS seasons FROM seasons WHERE key = 'holiday-2026';
