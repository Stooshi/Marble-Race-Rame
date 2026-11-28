-- One-time data update: Volcano Island's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 45 (wild), from its full report's first 1,000 races
-- (overtakes 62.16, lead changes 2.157, obstacle hits 58.02, gap 15.45 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 45, wildness = 'wild' WHERE slug = 'volcano-island';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'volcano-island';
