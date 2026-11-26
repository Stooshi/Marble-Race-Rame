-- One-time data update: Atlas Kasbah Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 38 (wild), from its full report's first 1,000 races
-- (overtakes 84.94, lead changes 2.272, obstacle hits 45.89, gap 11.74 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 38, wildness = 'wild' WHERE slug = 'atlas-kasbah-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'atlas-kasbah-run';
