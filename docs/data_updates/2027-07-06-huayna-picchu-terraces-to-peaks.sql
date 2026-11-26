-- One-time data update: Huayna Picchu Terraces's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'peaks' pack, not free. Wildness 48 (extreme), from its full report's first 1,000 races
-- (overtakes 83.83, lead changes 2.148, obstacle hits 51.09, gap 11.17 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'peaks', is_free = false, wildness_score = 48, wildness = 'extreme' WHERE slug = 'huayna-picchu-terraces';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'huayna-picchu-terraces';
