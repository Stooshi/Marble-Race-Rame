-- One-time data update: Viking Raid's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 49 (extreme), from its full report's first 1,000 races
-- (overtakes 75.45, lead changes 2.63, obstacle hits 65.56, gap 10.78 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 49, wildness = 'extreme' WHERE slug = 'viking-raid';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'viking-raid';
