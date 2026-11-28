-- One-time data update: Santa Monica Pier Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 52 (extreme), from its full report's first 1,000 races
-- (overtakes 74.95, lead changes 1.837, obstacle hits 54.61, gap 12.49 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 52, wildness = 'extreme' WHERE slug = 'santa-monica-pier-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'santa-monica-pier-run';
