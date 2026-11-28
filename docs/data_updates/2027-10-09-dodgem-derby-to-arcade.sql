-- One-time data update: Dodgem Derby's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 34 (wild), from its full report's first 1,000 races
-- (overtakes 61.42, lead changes 2.355, obstacle hits 62.09, gap 15.31 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 34, wildness = 'wild' WHERE slug = 'dodgem-derby';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'dodgem-derby';
