-- One-time data update: Laser Tag's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 53 (extreme), from its full report's first 1,000 races
-- (overtakes 74.38, lead changes 2.776, obstacle hits 76.2, gap 14.75 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 53, wildness = 'extreme' WHERE slug = 'laser-tag';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'laser-tag';
