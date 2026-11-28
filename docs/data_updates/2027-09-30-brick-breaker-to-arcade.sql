-- One-time data update: Brick Breaker's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 54 (extreme), from its full report's first 1,000 races
-- (overtakes 74.48, lead changes 2.753, obstacle hits 58.96, gap 11.84 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 54, wildness = 'extreme' WHERE slug = 'brick-breaker';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'brick-breaker';
