-- One-time data update: Dino Dig's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 36 (wild), from its full report's first 1,000 races
-- (overtakes 65.29, lead changes 2.322, obstacle hits 52.96, gap 14.4 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 36, wildness = 'wild' WHERE slug = 'dino-dig';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'dino-dig';
