-- Collection 1 · Grand Opening launches.
--  1. The old plain marbles become legacy "Originals": everyone keeps the ones
--     they have, but they are no longer sold (the free starters stay free).
--  2. Everyone who has played so far is an early player (a small badge on
--     their Originals).
--  3. For each Original a player has (the free starters included), they get
--     the matching Common shade of the new collection for free, once per
--     shade. Gifts are not numbered First Editions; their IDs end in G00001…
--     The match is client/src/shared/marbles/catalog.json → legacyGift.map
--     (test/collection.test.js checks this file against it).
UPDATE marbles SET on_sale = false WHERE NOT is_starter;
UPDATE users SET early_player = true;

CREATE TEMP TABLE legacy_match ON COMMIT DROP AS
SELECT * FROM (VALUES
    ('ruby', 'candy-pink', 'MS-CAN-PNK'),
    ('sapphire', 'candy-ocean', 'MS-CAN-OCN'),
    ('emerald', 'ripple-mint', 'MS-RIP-MNT'),
    ('topaz', 'candy-gold', 'MS-CAN-GLD'),
    ('onyx', 'pebble-slate', 'MS-PEB-SLT'),
    ('pearl', 'pebble-rose-quartz', 'MS-PEB-RSQ'),
    ('amethyst', 'ripple-lavender', 'MS-RIP-LAV'),
    ('citrine', 'candy-gold', 'MS-CAN-GLD'),
    ('cobalt-comet', 'candy-ocean', 'MS-CAN-OCN'),
    ('jade-dragon', 'catseye-forest', 'MS-CAT-FOR'),
    ('solar-flare', 'catseye-ember', 'MS-CAT-EMB'),
    ('nebula', 'catseye-violet', 'MS-CAT-VIO'),
    ('garnet', 'catseye-ember', 'MS-CAT-EMB'),
    ('aquamarine', 'ripple-lagoon', 'MS-RIP-LAG'),
    ('opal', 'catseye-sea-glass', 'MS-CAT-SEA'),
    ('quartz', 'catseye-classic', 'MS-CAT-CLS'),
    ('obsidian', 'pebble-slate', 'MS-PEB-SLT'),
    ('amber', 'candy-gold', 'MS-CAN-GLD'),
    ('coral', 'ripple-peach', 'MS-RIP-PCH'),
    ('turquoise', 'ripple-lagoon', 'MS-RIP-LAG'),
    ('peridot', 'ripple-mint', 'MS-RIP-MNT'),
    ('moonstone', 'ripple-rain', 'MS-RIP-RAN')
) AS v(marble_slug, item_slug, code_prefix);

CREATE TEMP TABLE legacy_gifts ON COMMIT DROP AS
SELECT owned.user_id, lm.item_slug, lm.code_prefix,
       row_number() OVER (PARTITION BY lm.item_slug ORDER BY u.created_at, u.id) AS gift_no
  FROM (SELECT um.user_id, m.slug FROM user_marbles um JOIN marbles m ON m.id = um.marble_id
        UNION
        SELECT u.id, m.slug FROM users u CROSS JOIN marbles m WHERE m.is_starter) AS owned
  JOIN legacy_match lm ON lm.marble_slug = owned.slug
  JOIN users u ON u.id = owned.user_id
 GROUP BY owned.user_id, lm.item_slug, lm.code_prefix, u.created_at, u.id;

INSERT INTO user_collection (user_id, item_slug, source, gift_no, marble_code, first_owner_id)
SELECT user_id, item_slug, 'legacy-gift', gift_no, code_prefix || '-G' || lpad(gift_no::text, 5, '0'), user_id
  FROM legacy_gifts
ON CONFLICT DO NOTHING;

INSERT INTO collection_counters (item_slug, gifted)
SELECT item_slug, max(gift_no) FROM legacy_gifts GROUP BY item_slug
ON CONFLICT (item_slug) DO UPDATE SET gifted = GREATEST(collection_counters.gifted, EXCLUDED.gifted);

SELECT (SELECT count(*) FROM marbles WHERE NOT on_sale) AS originals_retired,
       (SELECT count(*) FROM users WHERE early_player) AS early_players,
       (SELECT count(*) FROM user_collection WHERE source = 'legacy-gift') AS shades_gifted;
