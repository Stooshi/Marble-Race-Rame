-- One-time data update: Kings Canyon Lost City's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'canyons' pack, not free. Wildness 55 (extreme), from its full report's first 1,000 races
-- (overtakes 70.39, lead changes 1.593, obstacle hits 59.55, gap 14.27 s; loops 1,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'canyons', is_free = false, wildness_score = 55, wildness = 'extreme' WHERE slug = 'kings-canyon-lost-city';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'kings-canyon-lost-city';
