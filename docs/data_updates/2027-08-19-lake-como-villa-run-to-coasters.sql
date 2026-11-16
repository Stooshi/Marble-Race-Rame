-- One-time data update: Lake Como Villa Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 31 (easy), from its full report's first 1,000 races
-- (overtakes 63.14, lead changes 2.304, obstacle hits 53.59, gap 15.22 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 31, wildness = 'easy' WHERE slug = 'lake-como-villa-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'lake-como-villa-run';
