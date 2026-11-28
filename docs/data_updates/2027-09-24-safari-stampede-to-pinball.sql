-- One-time data update: Safari Stampede's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 69 (extreme), from its full report's first 1,000 races
-- (overtakes 71.36, lead changes 2.497, obstacle hits 77.35, gap 11.52 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 69, wildness = 'extreme' WHERE slug = 'safari-stampede';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'safari-stampede';
