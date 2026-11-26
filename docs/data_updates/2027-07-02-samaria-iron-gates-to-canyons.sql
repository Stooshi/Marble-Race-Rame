-- One-time data update: Samaria Iron Gates's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'canyons' pack, not free. Wildness 31 (easy), from its full report's first 1,000 races
-- (overtakes 67.68, lead changes 2.005, obstacle hits 32.44, gap 13.58 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'canyons', is_free = false, wildness_score = 31, wildness = 'easy' WHERE slug = 'samaria-iron-gates';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'samaria-iron-gates';
