-- One-time data update: Idol of the Jungle's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 53 (extreme), from its full report's first 1,000 races
-- (overtakes 73.98, lead changes 2.524, obstacle hits 54.47, gap 12.78 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 53, wildness = 'extreme' WHERE slug = 'idol-of-the-jungle';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'idol-of-the-jungle';
