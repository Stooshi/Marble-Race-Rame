-- One-time data update: Pharaoh's Tomb's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 55 (extreme), from its full report's first 1,000 races
-- (overtakes 74.11, lead changes 2.244, obstacle hits 56.07, gap 9.5 s; loops 0,
-- splitters 0, drops 5), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 55, wildness = 'extreme' WHERE slug = 'pharaohs-tomb';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'pharaohs-tomb';
