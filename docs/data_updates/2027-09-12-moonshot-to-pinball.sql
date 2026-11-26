-- One-time data update: Moonshot's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 68 (extreme), from its full report's first 1,000 races
-- (overtakes 73.29, lead changes 2.52, obstacle hits 70.45, gap 11.03 s; loops 1,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 68, wildness = 'extreme' WHERE slug = 'moonshot';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'moonshot';
