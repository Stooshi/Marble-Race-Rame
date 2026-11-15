-- One-time data update: Crystal Grotto's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 44 (wild), from its full report's first 1,000 races
-- (overtakes 72.38, lead changes 2.182, obstacle hits 46.95, gap 9.37 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 44, wildness = 'wild' WHERE slug = 'crystal-grotto';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'crystal-grotto';
