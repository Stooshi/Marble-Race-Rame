-- One-time data update: Robot Factory's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 35 (wild), from its full report's first 1,000 races
-- (overtakes 63.97, lead changes 2.472, obstacle hits 47.98, gap 13.57 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 35, wildness = 'wild' WHERE slug = 'robot-factory';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'robot-factory';
