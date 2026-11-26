-- One-time data update: Big Top's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 58 (extreme), from its full report's first 1,000 races
-- (overtakes 71.31, lead changes 2.36, obstacle hits 56.72, gap 12.29 s; loops 1,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 58, wildness = 'extreme' WHERE slug = 'big-top';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'big-top';
