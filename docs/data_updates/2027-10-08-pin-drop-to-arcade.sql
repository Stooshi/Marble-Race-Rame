-- One-time data update: Pin Drop's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 52 (extreme), from its full report's first 1,000 races
-- (overtakes 68.33, lead changes 2.597, obstacle hits 71.3, gap 14.45 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 52, wildness = 'extreme' WHERE slug = 'pin-drop';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'pin-drop';
