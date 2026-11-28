-- One-time data update: Skee Hall's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 53 (extreme), from its full report's first 1,000 races
-- (overtakes 67.86, lead changes 2.658, obstacle hits 60.8, gap 10.74 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 53, wildness = 'extreme' WHERE slug = 'skee-hall';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'skee-hall';
