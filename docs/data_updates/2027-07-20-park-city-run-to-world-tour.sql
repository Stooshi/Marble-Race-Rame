-- One-time data update: Park City Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 37 (wild), from its full report's first 1,000 races
-- (overtakes 63.25, lead changes 2.013, obstacle hits 37.65, gap 16.6 s; loops 0,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 37, wildness = 'wild' WHERE slug = 'park-city-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'park-city-run';
