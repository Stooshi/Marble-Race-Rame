-- One-time data update: Mont-Saint-Michel Tide Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 27 (easy), from its full report's first 1,000 races
-- (overtakes 64.6, lead changes 2.19, obstacle hits 45.78, gap 10.94 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 27, wildness = 'easy' WHERE slug = 'mont-saint-michel-tide-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'mont-saint-michel-tide-run';
