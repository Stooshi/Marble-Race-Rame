-- One-time data update: Neon Snake's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 39 (wild), from its full report's first 1,000 races
-- (overtakes 64.94, lead changes 2.579, obstacle hits 49.94, gap 12.41 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 39, wildness = 'wild' WHERE slug = 'neon-snake';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'neon-snake';
